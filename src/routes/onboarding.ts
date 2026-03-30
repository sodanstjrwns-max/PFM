import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { sanitizeString } from '../lib/middleware'

const onboarding = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ─── Get onboarding status ─── */
onboarding.get('/status', async (c) => {
  const user = c.get('user')
  const row: any = await c.env.DB.prepare(
    'SELECT onboarding_completed, onboarding_step, onboarding_data, settings FROM hospitals WHERE id=?'
  ).bind(user.hospitalId).first()
  if (!row) return c.json({ error: '병원 정보를 찾을 수 없습니다' }, 404)
  
  let data = {}
  try { data = JSON.parse(row.onboarding_data || '{}') } catch {}
  let settings = {}
  try { settings = JSON.parse(row.settings || '{}') } catch {}
  
  // Count staff for step info
  const staffCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM users WHERE hospital_id=?'
  ).bind(user.hospitalId).first() as any
  
  // Count chairs
  const chairCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM chairs WHERE hospital_id=? AND is_active=1'
  ).bind(user.hospitalId).first() as any

  return c.json({
    completed: !!row.onboarding_completed,
    currentStep: row.onboarding_step || 0,
    data,
    settings,
    stats: {
      staffCount: staffCount?.cnt || 0,
      chairCount: chairCount?.cnt || 0,
    }
  })
})

/* ─── Save step data ─── */
onboarding.post('/step/:step', async (c) => {
  const user = c.get('user')
  if (user.role !== 'admin') return c.json({ error: '관리자만 온보딩을 진행할 수 있습니다' }, 403)
  
  const step = parseInt(c.req.param('step'))
  if (isNaN(step) || step < 1 || step > 6) return c.json({ error: '유효하지 않은 스텝입니다' }, 400)
  
  const body = await c.req.json()
  
  // Get current onboarding data
  const hospital: any = await c.env.DB.prepare(
    'SELECT onboarding_data, settings FROM hospitals WHERE id=?'
  ).bind(user.hospitalId).first()
  if (!hospital) return c.json({ error: '병원 정보를 찾을 수 없습니다' }, 404)
  
  let existingData = {}
  try { existingData = JSON.parse(hospital.onboarding_data || '{}') } catch {}
  let settings = {}
  try { settings = JSON.parse(hospital.settings || '{}') } catch {}
  
  // Process step-specific data
  switch (step) {
    case 1: // 핵심 진료과목
      existingData = { ...existingData, specialties: body.specialties || [] }
      break
      
    case 2: // 핵심 지역 / 타겟
      existingData = { ...existingData, 
        region: sanitizeString(body.region || '', 200),
        subRegions: body.subRegions || [],
        targetPatients: body.targetPatients || [],
      }
      break
      
    case 3: // 병원 운영시간
      settings = { ...settings, operating_hours: body.operating_hours }
      await c.env.DB.prepare('UPDATE hospitals SET settings=? WHERE id=?')
        .bind(JSON.stringify(settings), user.hospitalId).run()
      existingData = { ...existingData, operatingHoursSet: true }
      break
      
    case 4: // 층/공간 구성
      settings = { ...settings, floor_map: body.floor_map }
      await c.env.DB.prepare('UPDATE hospitals SET settings=? WHERE id=?')
        .bind(JSON.stringify(settings), user.hospitalId).run()
      existingData = { ...existingData, floorMapSet: true }
      // Auto-create chairs from floor_map
      if (body.floor_map && Array.isArray(body.floor_map)) {
        let sortOrder = 1
        for (const floor of body.floor_map) {
          if (floor.spaces && Array.isArray(floor.spaces)) {
            for (const space of floor.spaces) {
              if (space.chairs && space.chairs > 0) {
                for (let i = 0; i < space.chairs; i++) {
                  const chairId = crypto.randomUUID()
                  await c.env.DB.prepare(
                    'INSERT OR IGNORE INTO chairs (id, hospital_id, chair_number, floor, room_name, sort_order) VALUES (?,?,?,?,?,?)'
                  ).bind(chairId, user.hospitalId, sortOrder, floor.name || '', space.name || '', sortOrder).run()
                  sortOrder++
                }
              }
            }
          }
        }
      }
      break
      
    case 5: // 직원 구성
      existingData = { ...existingData, 
        staffStructure: body.staffStructure || {},
        totalStaff: body.totalStaff || 0,
      }
      break
      
    case 6: // 완료
      existingData = { ...existingData, completedAt: new Date().toISOString() }
      break
  }
  
  // Update onboarding progress
  const newStep = Math.max(step, parseInt(hospital.onboarding_step || '0') || 0)
  await c.env.DB.prepare(
    'UPDATE hospitals SET onboarding_step=?, onboarding_data=? WHERE id=?'
  ).bind(newStep, JSON.stringify(existingData), user.hospitalId).run()
  
  return c.json({ success: true, step, data: existingData })
})

/* ─── Complete onboarding ─── */
onboarding.post('/complete', async (c) => {
  const user = c.get('user')
  if (user.role !== 'admin') return c.json({ error: '관리자만 온보딩을 완료할 수 있습니다' }, 403)
  
  await c.env.DB.prepare(
    'UPDATE hospitals SET onboarding_completed=1, onboarding_step=6 WHERE id=?'
  ).bind(user.hospitalId).run()
  
  return c.json({ success: true })
})

/* ─── Skip onboarding ─── */
onboarding.post('/skip', async (c) => {
  const user = c.get('user')
  if (user.role !== 'admin') return c.json({ error: '관리자만 온보딩을 스킵할 수 있습니다' }, 403)
  
  await c.env.DB.prepare(
    'UPDATE hospitals SET onboarding_completed=1 WHERE id=?'
  ).bind(user.hospitalId).run()
  
  return c.json({ success: true })
})

/* ─── Reset onboarding (re-run) ─── */
onboarding.post('/reset', async (c) => {
  const user = c.get('user')
  if (user.role !== 'admin') return c.json({ error: '관리자만 온보딩을 초기화할 수 있습니다' }, 403)
  
  await c.env.DB.prepare(
    'UPDATE hospitals SET onboarding_completed=0, onboarding_step=0 WHERE id=?'
  ).bind(user.hospitalId).run()
  
  return c.json({ success: true })
})

export default onboarding
