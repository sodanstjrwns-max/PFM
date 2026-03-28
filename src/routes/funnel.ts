import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
const funnel = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ═══ 환자 퍼널 (Patient Funnel) ═══ */

const FUNNEL_STAGES = ['awareness','interest','appointment','visit','waiting','diagnosis','consultation','treatment','management','referral']

// 퍼널 목록
funnel.get('/api/protected/funnel', async (c) => {
  const user = c.get('user')!
  const stage = c.req.query('stage')
  const limit = parseInt(c.req.query('limit')||'50')
  let sql = 'SELECT pf.*, u.name as doctor_name FROM patient_funnel pf LEFT JOIN users u ON pf.assigned_doctor=u.id WHERE pf.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (stage) { sql += ' AND pf.current_stage=?'; params.push(stage) }
  sql += ' ORDER BY pf.updated_at DESC LIMIT ?'; params.push(limit)
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

// 퍼널 통계
funnel.get('/stats', async (c) => {
  const user = c.get('user')!
  const period = c.req.query('period') || 'month'
  let dateFilter = ''
  const now = new Date()
  if (period === 'month') dateFilter = now.toISOString().slice(0,7)
  else if (period === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - 7)
    dateFilter = d.toISOString().slice(0,10)
  }
  const countSql = "SELECT current_stage, COUNT(*) as count FROM patient_funnel WHERE hospital_id=?" + (dateFilter ? " AND created_at >= ?" : "") + " GROUP BY current_stage"
  const params: any[] = [user.hospitalId]; if (dateFilter) params.push(dateFilter)
  const counts = await c.env.DB.prepare(countSql).bind(...params).all()
  const amountSql = "SELECT COALESCE(SUM(estimated_amount),0) as est, COALESCE(SUM(agreed_amount),0) as agreed, COALESCE(SUM(paid_amount),0) as paid FROM patient_funnel WHERE hospital_id=?" + (dateFilter ? " AND created_at >= ?" : "")
  const amounts: any = await c.env.DB.prepare(amountSql).bind(...params).first()
  const stageMap: any = {}
  ;(counts?.results||[]).forEach((r: any) => { stageMap[r.current_stage] = r.count })
  return c.json({ stages: stageMap, estimated: amounts?.est||0, agreed: amounts?.agreed||0, paid: amounts?.paid||0 })
})

// 퍼널 환자 등록
funnel.post('/api/protected/funnel', async (c) => {
  const user = c.get('user')!
  const { patient_name, phone, source, current_stage, treatment_type, assigned_doctor, estimated_amount, notes } = await c.req.json()
  if (!patient_name) return c.json({ error: '환자명을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  const stage = current_stage || 'awareness'
  const history = JSON.stringify([{ stage, at: new Date().toISOString(), by: user.id }])
  await c.env.DB.prepare(
    'INSERT INTO patient_funnel (id, hospital_id, patient_name, phone, source, current_stage, treatment_type, assigned_doctor, estimated_amount, notes, stage_history) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(id, user.hospitalId, patient_name, phone||'', source||'', stage, treatment_type||'', assigned_doctor||'', estimated_amount||0, notes||'', history).run()
  return c.json({ id, patient_name, current_stage: stage })
})

// 퍼널 단계 변경
funnel.put('/:id', async (c) => {
  const user = c.get('user')!
  const body = await c.req.json()
  const row: any = await c.env.DB.prepare('SELECT * FROM patient_funnel WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).first()
  if (!row) return c.json({ error: '환자를 찾을 수 없습니다' }, 404)
  const sets: string[] = []; const vals: any[] = []
  for (const key of ['patient_name','phone','source','current_stage','treatment_type','assigned_doctor','estimated_amount','agreed_amount','paid_amount','notes']) {
    if (body[key] !== undefined) { sets.push(`${key}=?`); vals.push(body[key]) }
  }
  // 단계 변경 시 히스토리 추가
  if (body.current_stage && body.current_stage !== row.current_stage) {
    let history: any[] = []; try { history = JSON.parse(row.stage_history||'[]') } catch(e) {}
    history.push({ stage: body.current_stage, from: row.current_stage, at: new Date().toISOString(), by: user.id })
    sets.push('stage_history=?'); vals.push(JSON.stringify(history))
  }
  if (!sets.length) return c.json({ error: '변경 사항 없음' }, 400)
  sets.push('updated_at=?'); vals.push(new Date().toISOString())
  vals.push(c.req.param('id'), user.hospitalId)
  await c.env.DB.prepare(`UPDATE patient_funnel SET ${sets.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  return c.json({ success: true })
})

// 퍼널 삭제
funnel.delete('/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM patient_funnel WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})


export default funnel
