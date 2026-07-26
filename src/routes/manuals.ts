import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { sanitizeString, sanitizeNumber, sanitizeBody, requireRole } from '../lib/middleware'
import { auditFromCtx } from '../lib/audit'
import {
  extractDocx, extractPlain, chunkParagraphs, rankChunks,
  type ManualFileType,
} from '../lib/manual-parse'

/* ═══════════════════════════════════════════════════════════════════
 * 병원 매뉴얼 (구 PF 지식베이스 대체)
 *
 * 기존 지식베이스는 "카드를 손으로 쓰는" 도구였다. 이건 반대다.
 * 병원이 이미 갖고 있는 매뉴얼 파일을 올리면 → 텍스트를 뽑고 → 청크로 쪼개고
 * → AI가 답변할 때 근거로 인용한다. (RAG)
 *
 * 파일 처리 분담
 *   docx / md / txt  → 서버에서 파싱 (fflate, Workers 6ms 검증됨)
 *   pdf              → 브라우저에서 pdf.js 로 텍스트 추출 후 텍스트만 전송
 *                      (원본 PDF는 R2에 그대로 보관)
 *   ⚠️ PDF를 서버로 옮기려 하지 말 것 — 빌드가 안 된다. manual-parse.ts 주석 참고.
 * ═══════════════════════════════════════════════════════════════════ */

const manuals = new Hono<{ Bindings: Bindings; Variables: Variables }>()

export const MANUAL_CATEGORIES = [
  'consultation', 'clinical', 'reception', 'sterilization',
  'insurance', 'marketing', 'hr', 'emergency', 'policy', 'other',
] as const

export const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  consultation:  { label: '상담',       icon: '💬' },
  clinical:      { label: '진료',       icon: '🦷' },
  reception:     { label: '데스크/응대', icon: '🛎️' },
  sterilization: { label: '소독/감염관리', icon: '🧴' },
  insurance:     { label: '보험/청구',  icon: '📋' },
  marketing:     { label: '마케팅',     icon: '📈' },
  hr:            { label: '인사/교육',  icon: '👥' },
  emergency:     { label: '응급대응',   icon: '🚨' },
  policy:        { label: '원내 규정',  icon: '🏥' },
  other:         { label: '기타',       icon: '📁' },
}

const MAX_CONTENT_CHARS = 400_000   // 약 A4 200페이지. D1 row 한계와 CPU 예산 고려
const MAX_FILE_MB = 15

/* ───────────────────────────────────────────────
 * GET / — 매뉴얼 목록
 * ─────────────────────────────────────────────── */
manuals.get('/', async (c) => {
  const user = c.get('user')!
  const q = sanitizeString(c.req.query('q') || '', 100)
  const category = sanitizeString(c.req.query('category') || '', 30)

  let sql = `SELECT m.id, m.title, m.category, m.description, m.file_name, m.file_type,
    m.file_size, m.char_count, m.chunk_count, m.ai_enabled, m.version,
    m.created_at, m.updated_at, u.name AS uploaded_by_name
    FROM hospital_manuals m LEFT JOIN users u ON m.uploaded_by = u.id
    WHERE m.hospital_id = ? AND m.is_active = 1`
  const params: any[] = [user.hospitalId]
  if (category && (MANUAL_CATEGORIES as readonly string[]).includes(category)) {
    sql += ' AND m.category = ?'; params.push(category)
  }
  if (q) {
    sql += ' AND (m.title LIKE ? OR m.description LIKE ?)'
    params.push(`%${q}%`, `%${q}%`)
  }
  sql += ' ORDER BY m.updated_at DESC LIMIT 200'

  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  const totals = await c.env.DB.prepare(
    `SELECT COUNT(*) AS manuals, COALESCE(SUM(chunk_count),0) AS chunks,
            COALESCE(SUM(char_count),0) AS chars,
            SUM(CASE WHEN ai_enabled=1 THEN 1 ELSE 0 END) AS ai_on
     FROM hospital_manuals WHERE hospital_id=? AND is_active=1`
  ).bind(user.hospitalId).first<any>()

  return c.json({
    data: rows.results || [],
    stats: totals || { manuals: 0, chunks: 0, chars: 0, ai_on: 0 },
    categories: CATEGORY_META,
  })
})

/* ───────────────────────────────────────────────
 * GET /:id — 매뉴얼 상세 (본문 포함)
 * ─────────────────────────────────────────────── */
manuals.get('/:id', async (c) => {
  const user = c.get('user')!
  const row = await c.env.DB.prepare(
    `SELECT m.*, u.name AS uploaded_by_name FROM hospital_manuals m
     LEFT JOIN users u ON m.uploaded_by=u.id
     WHERE m.id=? AND m.hospital_id=?`
  ).bind(c.req.param('id'), user.hospitalId).first<any>()
  if (!row) return c.json({ error: '매뉴얼을 찾을 수 없습니다' }, 404)

  const chunks = await c.env.DB.prepare(
    'SELECT id, chunk_index, heading, char_count FROM manual_chunks WHERE manual_id=? ORDER BY chunk_index'
  ).bind(row.id).all()

  return c.json({ ...row, chunks: chunks.results || [] })
})

/* ───────────────────────────────────────────────
 * POST /upload — 파일 업로드 (multipart)
 *   fields: file, title, category, description,
 *           extracted_text (PDF일 때 브라우저가 미리 뽑아 보냄)
 * ─────────────────────────────────────────────── */
manuals.post('/upload', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  let form: FormData
  try { form = await c.req.formData() }
  catch { return c.json({ error: '업로드 형식이 올바르지 않습니다' }, 400) }

  const file = form.get('file') as unknown as File | null
  if (!file || typeof file.name !== 'string') return c.json({ error: '파일이 없습니다' }, 400)
  if (file.size === 0) return c.json({ error: '빈 파일입니다' }, 400)
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return c.json({ error: `파일은 ${MAX_FILE_MB}MB 이하만 가능합니다` }, 400)
  }

  const ext = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const typeMap: Record<string, ManualFileType> = {
    docx: 'docx', pdf: 'pdf', md: 'md', markdown: 'md', txt: 'txt', text: 'txt',
  }
  const fileType = typeMap[ext]
  if (!fileType) {
    return c.json({ error: `지원하지 않는 형식입니다 (.${ext}) — docx, pdf, md, txt 만 가능합니다` }, 400)
  }
  // .doc(구버전)은 zip이 아니라 OLE 복합문서라 파싱 불가 — 명확히 안내
  if (ext === 'doc') {
    return c.json({ error: '구버전 .doc 은 지원하지 않습니다. Word에서 .docx 로 저장 후 올려주세요' }, 400)
  }

  const title = sanitizeString(String(form.get('title') || '').trim() || file.name.replace(/\.[^.]+$/, ''), 200)
  let category = sanitizeString(String(form.get('category') || 'other'), 30)
  if (!(MANUAL_CATEGORIES as readonly string[]).includes(category)) category = 'other'
  const description = sanitizeString(String(form.get('description') || ''), 500)

  /* ── 텍스트 추출 ── */
  let text = ''
  let paragraphs: string[] = []
  const buf = await file.arrayBuffer()

  try {
    if (fileType === 'docx') {
      const r = extractDocx(buf)
      text = r.text; paragraphs = r.paragraphs
    } else if (fileType === 'md' || fileType === 'txt') {
      const r = extractPlain(new TextDecoder('utf-8').decode(buf))
      text = r.text; paragraphs = r.paragraphs
    } else {
      // PDF: 브라우저가 pdf.js 로 뽑아 보낸 텍스트를 사용한다
      const pre = String(form.get('extracted_text') || '')
      if (!pre.trim()) {
        return c.json({
          error: 'PDF 텍스트 추출에 실패했습니다. 브라우저에서 다시 시도하거나 docx/txt 로 변환해 올려주세요',
          code: 'PDF_TEXT_MISSING',
        }, 400)
      }
      const r = extractPlain(pre)
      text = r.text; paragraphs = r.paragraphs
    }
  } catch (e: any) {
    return c.json({ error: `파일을 읽지 못했습니다: ${e.message}` }, 400)
  }

  if (!text.trim()) {
    return c.json({ error: '파일에서 텍스트를 찾지 못했습니다 (스캔 이미지 PDF일 수 있습니다)' }, 400)
  }
  if (text.length > MAX_CONTENT_CHARS) {
    text = text.slice(0, MAX_CONTENT_CHARS)
    paragraphs = paragraphs.slice(0, 20000)
  }

  const chunks = chunkParagraphs(paragraphs)
  const id = 'man-' + crypto.randomUUID().slice(0, 12)

  /* ── 원본 파일을 R2에 보관 (실패해도 업로드 자체는 진행) ── */
  let r2Key = ''
  try {
    if (c.env.R2) {
      r2Key = `manuals/${user.hospitalId}/${id}.${ext}`
      await c.env.R2.put(r2Key, buf, {
        httpMetadata: { contentType: file.type || 'application/octet-stream' },
      })
    }
  } catch { r2Key = '' }

  /* ── 저장 ── */
  await c.env.DB.prepare(
    `INSERT INTO hospital_manuals
      (id, hospital_id, title, category, description, file_name, file_type, file_size,
       r2_key, content, char_count, chunk_count, ai_enabled, uploaded_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?)`
  ).bind(
    id, user.hospitalId, title, category, description,
    sanitizeString(file.name, 200), fileType, file.size,
    r2Key, text, text.length, chunks.length, user.id
  ).run()

  if (chunks.length) {
    const stmts = chunks.map((ch) =>
      c.env.DB.prepare(
        'INSERT INTO manual_chunks (id, manual_id, hospital_id, chunk_index, heading, content, char_count) VALUES (?,?,?,?,?,?,?)'
      ).bind(
        'ch-' + crypto.randomUUID().slice(0, 12), id, user.hospitalId,
        ch.index, ch.heading, ch.content, ch.content.length
      )
    )
    // D1 batch 는 한 번에 너무 많으면 실패 — 100개씩 나눠 넣는다
    for (let i = 0; i < stmts.length; i += 100) {
      await c.env.DB.batch(stmts.slice(i, i + 100))
    }
  }

  await auditFromCtx(c, 'create', 'manual', id, { title, fileType, chunks: chunks.length })

  return c.json({
    id, title, category, file_type: fileType,
    char_count: text.length, chunk_count: chunks.length,
    preview: text.slice(0, 500),
    headings: chunks.map((ch) => ch.heading).filter(Boolean).slice(0, 30),
  })
})

/* ───────────────────────────────────────────────
 * PUT /:id — 메타 수정 (제목/카테고리/설명/AI사용여부)
 * ─────────────────────────────────────────────── */
manuals.put('/:id', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const exists = await c.env.DB.prepare('SELECT id FROM hospital_manuals WHERE id=? AND hospital_id=?')
    .bind(id, user.hospitalId).first()
  if (!exists) return c.json({ error: '매뉴얼을 찾을 수 없습니다' }, 404)

  const b = sanitizeBody(await c.req.json(), {
    title: { type: 'string', max: 200 },
    category: { type: 'string', max: 30 },
    description: { type: 'string', max: 500 },
    ai_enabled: { type: 'boolean' },
  })

  const sets: string[] = []
  const params: any[] = []
  if (b.title) { sets.push('title=?'); params.push(b.title) }
  if (b.category && (MANUAL_CATEGORIES as readonly string[]).includes(b.category)) {
    sets.push('category=?'); params.push(b.category)
  }
  if (b.description !== undefined) { sets.push('description=?'); params.push(b.description || '') }
  if (b.ai_enabled !== undefined) { sets.push('ai_enabled=?'); params.push(b.ai_enabled ? 1 : 0) }
  if (!sets.length) return c.json({ error: '변경할 항목이 없습니다' }, 400)

  sets.push('updated_at=CURRENT_TIMESTAMP')
  params.push(id, user.hospitalId)
  await c.env.DB.prepare(`UPDATE hospital_manuals SET ${sets.join(',')} WHERE id=? AND hospital_id=?`)
    .bind(...params).run()
  return c.json({ success: true })
})

/* ───────────────────────────────────────────────
 * DELETE /:id
 * ─────────────────────────────────────────────── */
manuals.delete('/:id', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const row = await c.env.DB.prepare('SELECT id, r2_key, title FROM hospital_manuals WHERE id=? AND hospital_id=?')
    .bind(id, user.hospitalId).first<any>()
  if (!row) return c.json({ error: '매뉴얼을 찾을 수 없습니다' }, 404)

  await c.env.DB.prepare('DELETE FROM manual_chunks WHERE manual_id=?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM hospital_manuals WHERE id=? AND hospital_id=?').bind(id, user.hospitalId).run()
  if (row.r2_key && c.env.R2) { try { await c.env.R2.delete(row.r2_key) } catch {} }

  await auditFromCtx(c, 'delete', 'manual', id, { title: row.title })
  return c.json({ success: true })
})

/* ───────────────────────────────────────────────
 * GET /:id/download — 원본 파일 다운로드 (R2 프록시)
 * ─────────────────────────────────────────────── */
manuals.get('/:id/download', async (c) => {
  const user = c.get('user')!
  const row = await c.env.DB.prepare('SELECT r2_key, file_name FROM hospital_manuals WHERE id=? AND hospital_id=?')
    .bind(c.req.param('id'), user.hospitalId).first<any>()
  if (!row || !row.r2_key) return c.json({ error: '원본 파일이 없습니다' }, 404)
  if (!c.env.R2) return c.json({ error: '파일 저장소를 사용할 수 없습니다' }, 503)

  const obj = await c.env.R2.get(row.r2_key)
  if (!obj) return c.json({ error: '원본 파일을 찾을 수 없습니다' }, 404)

  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(row.file_name || 'manual')}`,
      'Cache-Control': 'private, max-age=0',
    },
  })
})

/* ───────────────────────────────────────────────
 * GET /search — 청크 검색 (사람이 쓰는 검색 + AI가 쓰는 검색 공용)
 * ─────────────────────────────────────────────── */
manuals.get('/_search/chunks', async (c) => {
  const user = c.get('user')!
  const q = sanitizeString(c.req.query('q') || '', 200)
  const topK = sanitizeNumber(c.req.query('k'), 5, 1, 20)
  if (!q.trim()) return c.json({ query: q, results: [] })

  const rows = await c.env.DB.prepare(
    `SELECT ch.id, ch.manual_id, ch.heading, ch.content, m.title AS manual_title, m.category
     FROM manual_chunks ch JOIN hospital_manuals m ON ch.manual_id = m.id
     WHERE ch.hospital_id=? AND m.is_active=1
     LIMIT 3000`
  ).bind(user.hospitalId).all()

  const ranked = rankChunks(q, (rows.results || []) as any[], topK)
  return c.json({
    query: q,
    results: ranked.map((r) => ({
      id: r.id, manual_id: r.manual_id, manual_title: r.manual_title,
      heading: r.heading, score: Math.round(r.score * 100) / 100,
      snippet: r.content.slice(0, 400),
    })),
  })
})

/* ───────────────────────────────────────────────
 * GET /_meta/info — 프론트 초기화용
 * ─────────────────────────────────────────────── */
manuals.get('/_meta/info', async (c) => {
  return c.json({
    categories: CATEGORY_META,
    accepted: ['docx', 'pdf', 'md', 'txt'],
    maxFileMB: MAX_FILE_MB,
    // 브라우저가 PDF를 직접 파싱해야 함을 프론트에 명시
    pdfClientSide: true,
  })
})

export default manuals
