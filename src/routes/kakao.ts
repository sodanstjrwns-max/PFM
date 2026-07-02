/**
 * Kakao Alimtalk (알림톡) Integration
 * v3.3 Scale Edition
 * 
 * Aligo Kakao Alimtalk API를 통한 카카오톡 비즈니스 메시지 발송
 * - Alimtalk = 사전 승인된 템플릿 기반 (환자 발송 시 비용 저렴, 열람률 5배)
 * - Friendtalk = 자유 메시지 (비지니스 채널 친구만)
 * 
 * 설정: hospitals.settings.kakao_config = { api_key, user_id, sender_key, plus_friend_id }
 * 템플릿: hospitals.settings.kakao_templates = [{ code, name, content, buttons }]
 */

import { Hono } from 'hono'
import type { Bindings } from '../lib/types'
import { requireRole } from '../lib/middleware'

const kakao = new Hono<{ Bindings: Bindings; Variables: { user: any } }>()

// ─────────────────────────────────────────────
// 설정 관리
// ─────────────────────────────────────────────

async function loadHospitalSettings(db: D1Database, hospitalId: string) {
  const row: any = await db.prepare('SELECT settings, name FROM hospitals WHERE id = ?').bind(hospitalId).first()
  let settings: any = {}
  try { settings = JSON.parse(row?.settings || '{}') } catch { /* ignore */ }
  return { settings, hospitalName: row?.name || '' }
}

async function saveHospitalSettings(db: D1Database, hospitalId: string, settings: any) {
  await db
    .prepare('UPDATE hospitals SET settings = ?, updated_at = ? WHERE id = ?')
    .bind(JSON.stringify(settings), new Date().toISOString(), hospitalId)
    .run()
}

/** GET /config - 카카오 설정 조회 (API 키는 masked) */
kakao.get('/config', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')
  const { settings } = await loadHospitalSettings(c.env.DB, user.hospitalId)
  const cfg = settings.kakao_config || {}
  return c.json({
    configured: !!(cfg.api_key && cfg.user_id && cfg.sender_key),
    user_id: cfg.user_id || '',
    sender_key_last4: cfg.sender_key ? cfg.sender_key.slice(-4) : '',
    plus_friend_id: cfg.plus_friend_id || '',
    has_api_key: !!cfg.api_key,
    templates_count: (settings.kakao_templates || []).length,
  })
})

/** POST /config - 카카오 설정 저장 (admin/manager only) */
kakao.post('/config', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')
  if (!['admin', 'manager'].includes(user.role)) {
    return c.json({ error: '권한이 없습니다' }, 403)
  }
  const raw = await c.req.json().catch(() => ({}))
  const cfg = {
    api_key: (raw.api_key || '').trim().slice(0, 100),
    user_id: (raw.user_id || '').trim().slice(0, 50),
    sender_key: (raw.sender_key || '').trim().slice(0, 100),
    plus_friend_id: (raw.plus_friend_id || '').trim().slice(0, 50),
  }
  if (!cfg.api_key || !cfg.user_id || !cfg.sender_key) {
    return c.json({ error: 'API Key, User ID, 발신 프로필(sender_key)을 모두 입력해주세요' }, 400)
  }
  const { settings } = await loadHospitalSettings(c.env.DB, user.hospitalId)
  settings.kakao_config = cfg
  await saveHospitalSettings(c.env.DB, user.hospitalId, settings)
  return c.json({ success: true })
})

// ─────────────────────────────────────────────
// 템플릿 관리
// ─────────────────────────────────────────────

/** GET /templates - 알림톡 템플릿 목록 */
kakao.get('/templates', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')
  const { settings } = await loadHospitalSettings(c.env.DB, user.hospitalId)
  const templates = settings.kakao_templates || [
    // 기본 템플릿 3종 (카카오 비즈니스에 사전 승인 필요)
    {
      code: 'RECALL_6M',
      name: '6개월 정기 검진 안내',
      content: '[{hospital_name}]\n안녕하세요, {patient_name}님.\n\n마지막 방문 후 6개월이 지나셨네요 😊\n정기 스케일링 및 검진 시기가 되었습니다.\n\n편하신 날짜에 예약 도와드릴게요.\n📞 {hospital_phone}',
      buttons: [{ name: '예약 문의', type: 'AL', url: 'tel:' }],
    },
    {
      code: 'APPOINT_CONFIRM',
      name: '예약 확정 안내',
      content: '[{hospital_name}]\n{patient_name}님의 예약이 확정되었습니다.\n\n📅 일시: {appointment_date}\n👨‍⚕️ 담당: {doctor_name}\n📍 장소: {hospital_address}\n\n변경/취소는 {hospital_phone}으로 연락주세요.',
      buttons: [],
    },
    {
      code: 'CONSULT_FOLLOWUP',
      name: '상담 후 팔로업',
      content: '[{hospital_name}]\n{patient_name}님 안녕하세요.\n\n지난 상담에서 고민되셨던 부분, 궁금한 점이 있으신가요?\n\n추가 설명이 필요하시면 언제든 연락주세요. 더 좋은 방향으로 함께 고민해드릴게요 😊',
      buttons: [{ name: '연락하기', type: 'AL', url: 'tel:' }],
    },
  ]
  return c.json({ templates })
})

/** POST /templates - 템플릿 저장 (전체 덮어쓰기) */
kakao.post('/templates', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')
  if (!['admin', 'manager'].includes(user.role)) {
    return c.json({ error: '권한이 없습니다' }, 403)
  }
  const body = await c.req.json().catch(() => ({}))
  const templates = Array.isArray(body.templates) ? body.templates.slice(0, 50) : []
  // 각 템플릿 sanitize
  const clean = templates.map((t: any) => ({
    code: String(t.code || '').slice(0, 50),
    name: String(t.name || '').slice(0, 100),
    content: String(t.content || '').slice(0, 1000),
    buttons: Array.isArray(t.buttons) ? t.buttons.slice(0, 5).map((b: any) => ({
      name: String(b.name || '').slice(0, 30),
      type: String(b.type || 'WL').slice(0, 5),
      url: String(b.url || '').slice(0, 500),
    })) : [],
  }))
  const { settings } = await loadHospitalSettings(c.env.DB, user.hospitalId)
  settings.kakao_templates = clean
  await saveHospitalSettings(c.env.DB, user.hospitalId, settings)
  return c.json({ success: true, count: clean.length })
})

// ─────────────────────────────────────────────
// 발송
// ─────────────────────────────────────────────

/** POST /send - 알림톡 발송 */
kakao.post('/send', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')
  const body = await c.req.json().catch(() => ({}))
  const { template_code, receiver, variables = {}, fallback_sms = true } = body || {}

  if (!template_code) return c.json({ error: 'template_code가 필요합니다' }, 400)
  if (!receiver) return c.json({ error: 'receiver(전화번호)가 필요합니다' }, 400)

  const { settings, hospitalName } = await loadHospitalSettings(c.env.DB, user.hospitalId)
  const cfg = settings.kakao_config || {}
  if (!cfg.api_key || !cfg.user_id || !cfg.sender_key) {
    return c.json({ error: '카카오 알림톡 설정이 완료되지 않았습니다. 설정 페이지에서 API 키를 등록해주세요.' }, 400)
  }

  const templates = settings.kakao_templates || []
  const tpl = templates.find((t: any) => t.code === template_code)
  if (!tpl) return c.json({ error: `템플릿 "${template_code}"을 찾을 수 없습니다` }, 404)

  // 변수 치환 (서버 사이드)
  const defaultVars = {
    hospital_name: hospitalName,
    hospital_phone: settings.hospital_phone || '',
    hospital_address: settings.hospital_address || '',
    ...variables,
  }
  let msg = tpl.content
  for (const [k, v] of Object.entries(defaultVars)) {
    msg = msg.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v || ''))
  }

  // Aligo 알림톡 API 호출
  try {
    const aligoBody = new URLSearchParams({
      apikey: cfg.api_key,
      userid: cfg.user_id,
      senderkey: cfg.sender_key,
      tpl_code: template_code,
      sender: settings.sms_config?.sender || '',
      receiver_1: receiver.replace(/[^0-9]/g, ''),
      recvname_1: variables.patient_name || '',
      subject_1: tpl.name || '알림톡',
      message_1: msg,
      // Fallback SMS
      failover: fallback_sms ? 'Y' : 'N',
      fsubject_1: fallback_sms ? `[${hospitalName}] 알림` : '',
      fmessage_1: fallback_sms ? msg : '',
      testMode: 'N',
    })

    const resp = await fetch('https://kakaoapi.aligo.in/akv10/alimtalk/send/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: aligoBody.toString(),
    })
    const result = await resp.json() as any

    // 발송 로그 기록 (kakao_send_log JSON 배열로)
    const logEntry = {
      id: crypto.randomUUID(),
      template_code,
      receiver,
      status: result.code === 0 ? 'sent' : 'failed',
      msg_type: result.code === 0 ? (result.info?.type || 'AT') : 'error',
      error: result.code !== 0 ? (result.message || '') : '',
      sent_at: new Date().toISOString(),
      sent_by: user.id,
    }
    const log = Array.isArray(settings.kakao_send_log) ? settings.kakao_send_log : []
    log.unshift(logEntry)
    settings.kakao_send_log = log.slice(0, 500) // 최근 500건만 유지
    await saveHospitalSettings(c.env.DB, user.hospitalId, settings)

    if (result.code !== 0 && result.code !== '0') {
      return c.json({ error: result.message || '발송 실패', detail: result }, 400)
    }
    return c.json({ success: true, result, logged_message: msg })
  } catch (e: any) {
    return c.json({ error: '발송 실패: ' + (e.message || '네트워크 오류') }, 500)
  }
})

/** GET /logs - 발송 이력 */
kakao.get('/logs', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')
  const { settings } = await loadHospitalSettings(c.env.DB, user.hospitalId)
  const logs = (settings.kakao_send_log || []).slice(0, 100)
  const totalSent = logs.filter((l: any) => l.status === 'sent').length
  const totalFailed = logs.filter((l: any) => l.status === 'failed').length
  return c.json({ logs, stats: { total: logs.length, sent: totalSent, failed: totalFailed } })
})

/** POST /test - 테스트 발송 (실제 API 호출 안하고 메시지만 생성) */
kakao.post('/test', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')
  const body = await c.req.json().catch(() => ({}))
  const { template_code, variables = {} } = body || {}
  const { settings, hospitalName } = await loadHospitalSettings(c.env.DB, user.hospitalId)
  const tpl = (settings.kakao_templates || []).find((t: any) => t.code === template_code)
  if (!tpl) return c.json({ error: '템플릿 없음' }, 404)
  const defaultVars = {
    hospital_name: hospitalName,
    hospital_phone: settings.hospital_phone || '',
    hospital_address: settings.hospital_address || '',
    ...variables,
  }
  let preview = tpl.content
  for (const [k, v] of Object.entries(defaultVars)) {
    preview = preview.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v || ''))
  }
  return c.json({ preview, template_name: tpl.name })
})

export default kakao
