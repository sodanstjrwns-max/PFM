// ============================================================
// Messenger Attachments — Phase E.3
// ─────────────────────────────────────────────────────────────
// 파일 업로드/다운로드/삭제 + 메시지/스레드 attach.
//   - 실제 파일: R2 'pfm-assets' 버킷
//   - 메타: messenger_attachments 테이블
//   - 다운로드: Workers proxy 패턴 (presigned URL 안 씀 — 권한 검증 매번 강제)
//   - 멀티테넌트: r2_key 자체가 hospital_id 로 시작 → cross-tenant 접근 불가
// ============================================================

import { Hono } from 'hono'
import type { Bindings, Variables } from '../../lib/types'
import { generateMessengerId } from '../../lib/messenger-helpers'
import {
  uploadToR2,
  downloadFromR2,
  deleteFromR2,
  isAllowedMime,
  isImageMime,
  MAX_FILE_SIZE_BYTES,
} from '../../lib/r2-helpers'
import {
  writeMessengerAudit,
  getClientIP,
  getUserAgent,
} from '../../lib/messenger-audit'

const attachments = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ═══ POST /attachments/upload ═══
 *  multipart/form-data:
 *    - file (required): 업로드 파일
 *    - channel_id (optional)
 *    - patient_thread_id (optional)
 *    - message_id (optional, 보통은 upload 후 message 만들 때 attach)
 *
 *  응답: { attachment: { id, file_name, content_type, file_size, download_url, is_image } }
 */
attachments.post('/attachments/upload', async (c) => {
  const user = c.get('user')!
  const hospitalId = user.hospitalId

  let form: FormData
  try {
    form = await c.req.formData()
  } catch {
    return c.json({ error: 'multipart/form-data 형식이어야 합니다' }, 400)
  }

  const file = form.get('file')
  if (!file || typeof file === 'string') {
    return c.json({ error: 'file 필드가 필요합니다' }, 400)
  }

  const fileName = (file.name || 'unnamed').toString()
  const contentType = (file.type || 'application/octet-stream').toString()
  const size = file.size

  if (size <= 0) return c.json({ error: '빈 파일은 업로드할 수 없습니다' }, 400)
  if (size > MAX_FILE_SIZE_BYTES) {
    return c.json({ error: `파일이 너무 큽니다 (최대 ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB)` }, 413)
  }
  if (!isAllowedMime(contentType)) {
    return c.json({ error: `허용되지 않는 파일 형식: ${contentType}` }, 415)
  }

  // 선택적 컨텍스트
  const channelId = form.get('channel_id')?.toString() || null
  const patientThreadId = form.get('patient_thread_id')?.toString() || null
  const messageId = form.get('message_id')?.toString() || null

  // 컨텍스트 멀티테넌트 검증
  if (channelId) {
    const ch = await c.env.DB.prepare(
      `SELECT 1 FROM channels WHERE id=? AND hospital_id=? LIMIT 1`
    ).bind(channelId, hospitalId).first()
    if (!ch) return c.json({ error: '채널을 찾을 수 없거나 접근 권한이 없습니다' }, 403)
  }
  if (patientThreadId) {
    const t = await c.env.DB.prepare(
      `SELECT 1 FROM patient_threads WHERE id=? AND hospital_id=? LIMIT 1`
    ).bind(patientThreadId, hospitalId).first()
    if (!t) return c.json({ error: '환자 스레드를 찾을 수 없거나 접근 권한이 없습니다' }, 403)
  }
  if (messageId) {
    const m = await c.env.DB.prepare(
      `SELECT m.id FROM messages m
       JOIN channels ch ON ch.id = m.channel_id
       WHERE m.id=? AND ch.hospital_id=? LIMIT 1`
    ).bind(messageId, hospitalId).first()
    if (!m) return c.json({ error: '메시지를 찾을 수 없거나 접근 권한이 없습니다' }, 403)
  }

  const attId = generateMessengerId('att')

  // R2 업로드 (FormData File은 .arrayBuffer() 로 변환)
  const ab = await (file as File).arrayBuffer()
  let r2Result
  try {
    r2Result = await uploadToR2(c.env.R2, {
      hospitalId,
      attId,
      fileName,
      contentType,
      body: ab,
      size,
    })
  } catch (e: any) {
    return c.json({ error: `업로드 실패: ${e.message}` }, 500)
  }

  // 메타 저장
  await c.env.DB.prepare(`
    INSERT INTO messenger_attachments
      (id, hospital_id, uploader_id, r2_key, file_name, content_type, file_size,
       channel_id, message_id, patient_thread_id, is_image, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
  `).bind(
    attId, hospitalId, user.id, r2Result.r2Key, fileName, contentType, size,
    channelId, messageId, patientThreadId,
    isImageMime(contentType) ? 1 : 0
  ).run()

  // 메시지에 직접 attach 된 경우 attachment_count 증가
  if (messageId) {
    await c.env.DB.prepare(
      `UPDATE messages SET attachment_count = COALESCE(attachment_count, 0) + 1 WHERE id = ?`
    ).bind(messageId).run().catch(() => {})
  }

  // 감사 로그
  writeMessengerAudit(c.env.DB, {
    hospitalId,
    actorId: user.id,
    action: 'file.upload',
    targetType: 'file',
    targetId: attId,
    metadata: {
      file_name: fileName,
      content_type: contentType,
      file_size: size,
      channel_id: channelId,
      message_id: messageId,
      patient_thread_id: patientThreadId,
    },
    ip: getClientIP(c),
    userAgent: getUserAgent(c),
  })

  return c.json({
    attachment: {
      id: attId,
      file_name: fileName,
      content_type: contentType,
      file_size: size,
      is_image: isImageMime(contentType),
      download_url: `/api/protected/messenger/attachments/${attId}/download`,
      created_at: new Date().toISOString(),
    }
  }, 201)
})


/* ═══ GET /attachments/:id ═══
 *  메타 조회
 */
attachments.get('/attachments/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')

  const row = await c.env.DB.prepare(`
    SELECT a.*, u.name AS uploader_name
    FROM messenger_attachments a
    LEFT JOIN users u ON u.id = a.uploader_id
    WHERE a.id = ? AND a.hospital_id = ? AND a.status = 'active'
    LIMIT 1
  `).bind(id, user.hospitalId).first<any>()

  if (!row) return c.json({ error: '첨부파일을 찾을 수 없습니다' }, 404)

  return c.json({
    attachment: {
      id: row.id,
      file_name: row.file_name,
      content_type: row.content_type,
      file_size: row.file_size,
      is_image: row.is_image === 1,
      channel_id: row.channel_id,
      message_id: row.message_id,
      patient_thread_id: row.patient_thread_id,
      uploader_id: row.uploader_id,
      uploader_name: row.uploader_name,
      created_at: row.created_at,
      download_url: `/api/protected/messenger/attachments/${row.id}/download`,
    }
  })
})


/* ═══ GET /attachments/:id/download ═══
 *  실제 파일 스트림 (Workers proxy)
 *  권한 검증: hospital_id 일치 + status='active'
 */
attachments.get('/attachments/:id/download', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')

  const row = await c.env.DB.prepare(`
    SELECT r2_key, file_name, content_type, file_size
    FROM messenger_attachments
    WHERE id = ? AND hospital_id = ? AND status = 'active'
    LIMIT 1
  `).bind(id, user.hospitalId).first<any>()

  if (!row) return c.json({ error: '첨부파일을 찾을 수 없습니다' }, 404)

  const obj = await downloadFromR2(c.env.R2, row.r2_key)
  if (!obj) return c.json({ error: '파일 객체가 R2 에 없습니다' }, 404)

  // 감사 로그 (fire-and-forget)
  writeMessengerAudit(c.env.DB, {
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: 'file.download',
    targetType: 'file',
    targetId: id,
    metadata: { file_name: row.file_name, file_size: row.file_size },
    ip: getClientIP(c),
    userAgent: getUserAgent(c),
  })

  const headers = new Headers()
  headers.set('Content-Type', row.content_type || 'application/octet-stream')
  headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(row.file_name)}"`)
  if (row.file_size) headers.set('Content-Length', String(row.file_size))
  headers.set('Cache-Control', 'private, max-age=3600')

  return new Response(obj.body, { status: 200, headers })
})


/* ═══ DELETE /attachments/:id ═══
 *  soft-delete + R2 실제 객체 삭제.
 *  업로더 본인 또는 messengerRole >= manager 만 가능.
 */
attachments.delete('/attachments/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')

  const row = await c.env.DB.prepare(`
    SELECT id, uploader_id, r2_key, message_id, status
    FROM messenger_attachments
    WHERE id = ? AND hospital_id = ? LIMIT 1
  `).bind(id, user.hospitalId).first<any>()

  if (!row) return c.json({ error: '첨부파일을 찾을 수 없습니다' }, 404)
  if (row.status !== 'active') return c.json({ error: '이미 삭제된 파일입니다' }, 410)

  const isOwner = row.uploader_id === user.id
  const elevated = ['owner','admin','manager','team_lead'].includes(user.messengerRole || '')
  if (!isOwner && !elevated) {
    return c.json({ error: '삭제 권한이 없습니다 (업로더 본인 또는 관리자만 가능)' }, 403)
  }

  // soft-delete
  await c.env.DB.prepare(`
    UPDATE messenger_attachments
    SET status='deleted', deleted_at=CURRENT_TIMESTAMP, deleted_by=?
    WHERE id=?
  `).bind(user.id, id).run()

  // 메시지 카운터 감소
  if (row.message_id) {
    await c.env.DB.prepare(
      `UPDATE messages SET attachment_count = MAX(COALESCE(attachment_count, 0) - 1, 0) WHERE id = ?`
    ).bind(row.message_id).run().catch(() => {})
  }

  // R2 실제 삭제
  await deleteFromR2(c.env.R2, row.r2_key)

  writeMessengerAudit(c.env.DB, {
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: 'file.delete',
    targetType: 'file',
    targetId: id,
    ip: getClientIP(c),
    userAgent: getUserAgent(c),
  })

  return c.json({ success: true, id })
})


/* ═══ POST /messages/:id/attach ═══
 *  이미 업로드된 파일을 메시지에 사후 attach.
 *  body: { attachment_ids: string[] }
 */
attachments.post('/messages/:id/attach', async (c) => {
  const user = c.get('user')!
  const messageId = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const ids: string[] = Array.isArray(body.attachment_ids) ? body.attachment_ids : []

  if (ids.length === 0) return c.json({ error: 'attachment_ids 배열이 필요합니다' }, 400)
  if (ids.length > 20) return c.json({ error: '한 번에 최대 20개까지만 attach 가능합니다' }, 400)

  // 메시지 멀티테넌트 검증
  const msg = await c.env.DB.prepare(`
    SELECT m.id, m.channel_id, m.user_id FROM messages m
    JOIN channels ch ON ch.id = m.channel_id
    WHERE m.id = ? AND ch.hospital_id = ? LIMIT 1
  `).bind(messageId, user.hospitalId).first<any>()

  if (!msg) return c.json({ error: '메시지를 찾을 수 없습니다' }, 404)
  if (msg.user_id !== user.id) {
    const elevated = ['owner','admin','manager'].includes(user.messengerRole || '')
    if (!elevated) return c.json({ error: '본인 메시지에만 attach 가능합니다' }, 403)
  }

  // 첨부 일괄 검증 + UPDATE
  const placeholders = ids.map(() => '?').join(',')
  const rows = await c.env.DB.prepare(`
    SELECT id FROM messenger_attachments
    WHERE id IN (${placeholders}) AND hospital_id = ? AND status='active'
      AND uploader_id = ? AND message_id IS NULL
  `).bind(...ids, user.hospitalId, user.id).all<{ id: string }>()

  const validIds = (rows.results || []).map(r => r.id)
  if (validIds.length === 0) {
    return c.json({ error: 'attach 가능한 첨부가 없습니다 (소유자/상태/병원 확인)' }, 400)
  }

  // batch UPDATE
  const stmts = validIds.map(attId =>
    c.env.DB.prepare(
      `UPDATE messenger_attachments SET message_id=?, channel_id=COALESCE(channel_id, ?) WHERE id=?`
    ).bind(messageId, msg.channel_id, attId)
  )
  stmts.push(
    c.env.DB.prepare(
      `UPDATE messages SET attachment_count = COALESCE(attachment_count, 0) + ? WHERE id = ?`
    ).bind(validIds.length, messageId)
  )
  await c.env.DB.batch(stmts)

  return c.json({ success: true, attached_count: validIds.length, attached_ids: validIds })
})


/* ═══ GET /messages/:id/attachments ═══
 *  특정 메시지의 첨부 목록
 */
attachments.get('/messages/:id/attachments', async (c) => {
  const user = c.get('user')!
  const messageId = c.req.param('id')

  // 메시지 멀티테넌트 검증
  const ok = await c.env.DB.prepare(`
    SELECT 1 FROM messages m JOIN channels ch ON ch.id = m.channel_id
    WHERE m.id = ? AND ch.hospital_id = ? LIMIT 1
  `).bind(messageId, user.hospitalId).first()
  if (!ok) return c.json({ error: '메시지를 찾을 수 없습니다' }, 404)

  const rows = await c.env.DB.prepare(`
    SELECT id, file_name, content_type, file_size, is_image, uploader_id, created_at
    FROM messenger_attachments
    WHERE message_id = ? AND status = 'active'
    ORDER BY created_at ASC
  `).bind(messageId).all<any>()

  const items = (rows.results || []).map((r: any) => ({
    ...r,
    is_image: r.is_image === 1,
    download_url: `/api/protected/messenger/attachments/${r.id}/download`,
  }))

  return c.json({ attachments: items, total: items.length })
})


/* ═══ GET /patient-threads/:id/attachments ═══
 *  환자 스레드의 모든 첨부 (메시지 + 직접 thread attach 둘 다)
 */
attachments.get('/patient-threads/:id/attachments', async (c) => {
  const user = c.get('user')!
  const threadId = c.req.param('id')

  const ok = await c.env.DB.prepare(`
    SELECT 1 FROM patient_threads WHERE id=? AND hospital_id=? LIMIT 1
  `).bind(threadId, user.hospitalId).first()
  if (!ok) return c.json({ error: '스레드를 찾을 수 없습니다' }, 404)

  const rows = await c.env.DB.prepare(`
    SELECT a.id, a.file_name, a.content_type, a.file_size, a.is_image,
           a.uploader_id, a.message_id, a.created_at,
           u.name AS uploader_name
    FROM messenger_attachments a
    LEFT JOIN users u ON u.id = a.uploader_id
    WHERE a.hospital_id = ? AND a.status = 'active'
      AND (a.patient_thread_id = ?
           OR a.message_id IN (
             SELECT id FROM messages WHERE patient_thread_id = ? AND is_deleted = 0
           ))
    ORDER BY a.created_at DESC
    LIMIT 100
  `).bind(user.hospitalId, threadId, threadId).all<any>()

  const items = (rows.results || []).map((r: any) => ({
    ...r,
    is_image: r.is_image === 1,
    download_url: `/api/protected/messenger/attachments/${r.id}/download`,
  }))

  return c.json({ attachments: items, total: items.length })
})

export default attachments
