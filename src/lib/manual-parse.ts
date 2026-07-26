/* ═══════════════════════════════════════════════════════════════════
 * 매뉴얼 텍스트 추출 & 청킹
 *
 * ⚠️ 왜 PDF가 여기 없는가 (중요 — 나중에 "PDF도 서버에서 하자" 하기 전에 읽을 것)
 *   PDF 파서(unpdf/pdfjs-dist)를 Workers 번들에 넣으려 두 번 시도했고,
 *   두 번 다 vite 빌드가 240초 타임아웃으로 산출물 없이 죽었다.
 *   게다가 한글 PDF는 CMap 데이터(한국어만 192KB)가 별도로 필요해
 *   Workers 10MB 제한과 CPU 예산 양쪽에서 불리하다.
 *   → PDF는 브라우저에서 pdf.js(CDN)로 텍스트를 뽑아 서버로 보낸다.
 *      서버는 추출된 텍스트를 받고, 원본 PDF는 R2에 그대로 보관한다.
 *
 * DOCX는 반대로 아주 싸다. 실제 Workers 런타임에서 6ms 측정.
 *   docx = zip + word/document.xml → fflate.unzipSync 로 풀고 태그만 벗기면 끝.
 * ═══════════════════════════════════════════════════════════════════ */

import { unzipSync, strFromU8 } from 'fflate'

export type ManualFileType = 'docx' | 'pdf' | 'md' | 'txt'

export interface ExtractResult {
  text: string
  paragraphs: string[]
}

/** DOCX(ArrayBuffer) → 문단 배열. Workers 안에서 동작 검증 완료. */
export function extractDocx(buf: ArrayBuffer): ExtractResult {
  const files = unzipSync(new Uint8Array(buf))
  const doc = files['word/document.xml']
  if (!doc) throw new Error('DOCX 구조가 올바르지 않습니다 (word/document.xml 없음)')
  const xml = strFromU8(doc)

  const paragraphs: string[] = []
  // <w:p> 단위로 자르고, 그 안의 <w:t> 텍스트 노드만 이어붙인다.
  // <w:tab/> <w:br/> 은 공백/줄바꿈으로 치환해야 표(table) 셀이 붙어버리지 않는다.
  const pMatches = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []
  for (const p of pMatches) {
    const withBreaks = p
      .replace(/<w:tab\s*\/>/g, '\t')
      .replace(/<w:br\s*\/>/g, '\n')
    const tMatches = withBreaks.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || []
    const line = tMatches
      .map((t) => t.replace(/<[^>]+>/g, ''))
      .join('')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
    if (line) paragraphs.push(line)
  }
  return { text: paragraphs.join('\n'), paragraphs }
}

/** 마크다운/일반 텍스트 → 문단 배열 */
export function extractPlain(raw: string): ExtractResult {
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const paragraphs = text.split('\n').map((l) => l.trim()).filter(Boolean)
  return { text, paragraphs }
}

/* ─────────────────────────────────────────────────────────────
 * 청킹
 *   목표: AI 프롬프트에 넣을 때 "어느 매뉴얼 어느 항목"인지 인용 가능해야 한다.
 *   전략: 제목처럼 보이는 줄을 만나면 새 청크를 시작하고,
 *         제목이 없어도 CHUNK_CHARS 를 넘으면 강제 분할한다.
 * ───────────────────────────────────────────────────────────── */

const CHUNK_CHARS = 900       // 한 청크 목표 길이 (한국어 기준 약 450~600 토큰)
const CHUNK_MAX = 1400        // 넘으면 무조건 자름

export interface Chunk {
  index: number
  heading: string
  content: string
}

/** 제목처럼 보이는 줄인가? */
function looksLikeHeading(line: string): boolean {
  if (line.length > 60) return false
  if (/^#{1,6}\s/.test(line)) return true                    // 마크다운 #
  if (/^\d+(\.\d+)*[.)]\s*\S/.test(line)) return true         // 1. / 1.2. / 3)
  if (/^[■□●○▶▪◆※]\s*\S/.test(line)) return true            // 한국 문서 흔한 불릿 제목
  if (/^[【\[(（].{1,30}[】\])）]$/.test(line)) return true    // 【초진 응대】
  if (/^제\s*\d+\s*[장절조]/.test(line)) return true          // 제3장
  if (/^(第|Chapter|CHAPTER)\s*\d+/.test(line)) return true
  // "초진 상담 프로세스" 처럼 짧고 마침표 없는 줄
  if (line.length <= 30 && !/[.?!,]$/.test(line) && !/[다요음임]$/.test(line)) return true
  return false
}

function cleanHeading(line: string): string {
  return line.replace(/^#{1,6}\s*/, '').replace(/^[■□●○▶▪◆※]\s*/, '').trim().slice(0, 120)
}

/** 문단 배열 → 청크 배열 */
export function chunkParagraphs(paragraphs: string[]): Chunk[] {
  const chunks: Chunk[] = []
  let curHeading = ''
  let buf: string[] = []
  let bufLen = 0

  const flush = () => {
    const content = buf.join('\n').trim()
    if (content) chunks.push({ index: chunks.length, heading: curHeading, content })
    buf = []
    bufLen = 0
  }

  for (const p of paragraphs) {
    const isHeading = looksLikeHeading(p)
    // 제목을 만났고 이미 쌓인 내용이 어느 정도 있으면 끊는다.
    // (제목이 연달아 나오는 목차 구간에서 청크가 잘게 쪼개지는 걸 막기 위해 최소 길이 조건)
    if (isHeading && bufLen >= 200) {
      flush()
      curHeading = cleanHeading(p)
      buf.push(p)
      bufLen += p.length
      continue
    }
    if (isHeading && !curHeading) curHeading = cleanHeading(p)

    buf.push(p)
    bufLen += p.length + 1

    if (bufLen >= CHUNK_MAX || (bufLen >= CHUNK_CHARS && isHeading)) flush()
  }
  flush()

  // 내용이 전혀 없으면 빈 배열 대신 통짜 1개라도 남긴다
  if (chunks.length === 0 && paragraphs.length) {
    chunks.push({ index: 0, heading: '', content: paragraphs.join('\n').slice(0, CHUNK_MAX) })
  }
  return chunks
}

/* ─────────────────────────────────────────────────────────────
 * 검색 (키워드 기반 BM25 유사 스코어링)
 *   벡터 임베딩을 쓰지 않는 이유: 매 업로드마다 임베딩 API 비용/지연이 붙고,
 *   D1에는 벡터 인덱스가 없어 전건 스캔이라 규모 이점도 없다.
 *   병원 매뉴얼은 보통 수십~수백 청크 수준이라 키워드 스코어링으로 충분하다.
 * ───────────────────────────────────────────────────────────── */

/** 한국어 조사/불용어 — 검색어에서 걷어낸다 */
const STOPWORDS = new Set([
  '그리고','그러나','하지만','또는','그래서','때문','경우','대해','대한','위해','통해',
  '이것','저것','그것','여기','거기','우리','저희','너무','정말','아주','매우',
  '있다','없다','한다','된다','합니다','입니다','있습니다','없습니다','해야','해서',
  '어떻게','무엇','언제','어디','누가','왜','좀','것','수','등','및','더','잘',
])

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\uAC00-\uD7A3a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/(을|를|이|가|은|는|에|의|와|과|로|으로|에서|부터|까지|만|도)$/, ''))
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w))
}

export interface ScoredChunk {
  id: string
  manual_id: string
  manual_title?: string
  heading: string
  content: string
  score: number
}

/**
 * 청크 목록을 쿼리로 스코어링해 상위 N개 반환.
 * - 제목(heading) 매칭에 3배 가중치 (제목이 곧 주제이므로)
 * - 같은 단어 반복은 로그로 감쇠 (긴 청크가 무조건 이기는 것 방지)
 */
export function rankChunks(
  query: string,
  rows: Array<{ id: string; manual_id: string; manual_title?: string; heading: string; content: string }>,
  topK = 5
): ScoredChunk[] {
  const terms = tokenize(query)
  if (!terms.length) return []

  const scored = rows.map((r) => {
    const hay = (r.content || '').toLowerCase()
    const head = (r.heading || '').toLowerCase()
    let score = 0
    for (const t of terms) {
      let n = 0
      let i = hay.indexOf(t)
      while (i !== -1 && n < 20) { n++; i = hay.indexOf(t, i + t.length) }
      if (n) score += 1 + Math.log(n)
      if (head.includes(t)) score += 3
    }
    // 길이 정규화 (너무 긴 청크 페널티, 너무 짧은 청크는 그대로)
    const norm = Math.max(1, Math.log10(Math.max(100, (r.content || '').length) / 100) + 1)
    return { ...r, score: score / norm }
  })

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

/* ─────────────────────────────────────────────────────────────
 * RAG 컨텍스트 빌더
 *   ai.ts 등에서 호출해 "우리 병원 매뉴얼" 근거를 프롬프트에 끼워 넣는다.
 *   AI가 매뉴얼에 없는 내용을 매뉴얼인 척 말하지 않도록 규칙을 함께 박아둔다.
 * ───────────────────────────────────────────────────────────── */

export interface ManualContext {
  block: string                 // systemPrompt 뒤에 붙일 텍스트 ('' 이면 매뉴얼 없음)
  sources: Array<{ manual_id: string; chunk_id: string; title: string; heading: string }>
}

const MAX_CONTEXT_CHARS = 4000  // 토큰 비용 폭주 방지

/**
 * 병원 매뉴얼에서 query 와 관련된 청크를 뽑아 프롬프트 블록으로 만든다.
 * @param db      D1
 * @param hospitalId
 * @param query   검색어 (기능 설명 + 핵심 키워드를 넣는다)
 * @param topK    상위 몇 개
 */
export async function buildManualContext(
  db: D1Database,
  hospitalId: string,
  query: string,
  topK = 4
): Promise<ManualContext> {
  let rows: any[] = []
  try {
    const r = await db.prepare(
      `SELECT ch.id, ch.manual_id, ch.heading, ch.content, m.title AS manual_title
       FROM manual_chunks ch JOIN hospital_manuals m ON ch.manual_id = m.id
       WHERE ch.hospital_id = ? AND m.is_active = 1 AND m.ai_enabled = 1
       LIMIT 3000`
    ).bind(hospitalId).all()
    rows = (r.results || []) as any[]
  } catch {
    // 매뉴얼 테이블이 아직 없거나 조회 실패해도 AI 기능 자체는 죽으면 안 된다
    return { block: '', sources: [] }
  }
  if (!rows.length) return { block: '', sources: [] }

  const ranked = rankChunks(query, rows, topK)
  if (!ranked.length) return { block: '', sources: [] }

  const parts: string[] = []
  const sources: ManualContext['sources'] = []
  let used = 0
  for (const r of ranked) {
    const label = r.heading ? `${r.manual_title} › ${r.heading}` : (r.manual_title || '매뉴얼')
    const body = r.content.slice(0, 1200)
    if (used + body.length > MAX_CONTEXT_CHARS) break
    used += body.length
    parts.push(`【${label}】\n${body}`)
    sources.push({
      manual_id: r.manual_id,
      chunk_id: r.id,
      title: r.manual_title || '',
      heading: r.heading || '',
    })
  }
  if (!parts.length) return { block: '', sources: [] }

  const block = `

[우리 병원 매뉴얼 발췌]
아래는 이 병원이 실제로 등록한 내부 매뉴얼 내용이다.
답변할 때 아래 내용과 충돌하는 일반론을 말하지 말고, 이 병원의 방식을 우선하라.
매뉴얼 내용을 근거로 쓴 문장은 문장 끝에 (출처: 매뉴얼명 › 항목) 형식으로 표기하라.
아래에 없는 내용을 매뉴얼에 있는 것처럼 지어내지 마라.

${parts.join('\n\n')}
`
  return { block, sources }
}
