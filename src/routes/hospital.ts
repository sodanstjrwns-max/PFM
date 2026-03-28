import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { requireRole, sanitizeString, sanitizeBody } from '../lib/middleware'
const hospital = new Hono<{ Bindings: Bindings; Variables: Variables }>()

hospital.get('/settings', async (c) => {
  const user = c.get('user')!
  const row: any = await c.env.DB.prepare('SELECT settings FROM hospitals WHERE id=?').bind(user.hospitalId).first()
  let settings: any = {}
  try { settings = JSON.parse(row?.settings || '{}') } catch(e) {}
  // 기본값 병합
  const defaults: any = {
    location_terms: {
      chair: '체어', room: '진료실', floor: '층',
      surgery_room: '수술실', waiting_room: '대기실', consult_room: '상담실',
      xray_room: '촬영실', sterilization: '소독실'
    },
    location_presets: [],
    operating_hours: {
      weekday: { start: '09:00', end: '18:00', enabled: true },
      saturday: { start: '09:00', end: '14:00', enabled: true },
      sunday: { start: '', end: '', enabled: false },
      lunch: { start: '13:00', end: '14:00', enabled: true },
      evening: { start: '', end: '', enabled: false, label: '야간진료' },
      regular_holidays: [],
      holiday_notice: '',
    },
    floor_map: [],
    core_treatments: [
      { key: 'core1', label: '핵심진료 1', name: '' },
      { key: 'core2', label: '핵심진료 2', name: '' },
      { key: 'core3', label: '핵심진료 3', name: '' },
    ],
    core_regions: [
      { key: 'region_core', label: '핵심 지역', name: '' },
      { key: 'region_expand', label: '확장 지역', name: '' },
      { key: 'region_adjacent', label: '인접 지역', name: '' },
      { key: 'region_other', label: '그 외 지역', name: '그외' },
    ],
  }
  const merged: any = {
    location_terms: { ...defaults.location_terms, ...(settings.location_terms || {}) },
    location_presets: settings.location_presets || defaults.location_presets,
    operating_hours: { ...defaults.operating_hours, ...(settings.operating_hours || {}) },
    floor_map: settings.floor_map || defaults.floor_map,
    core_treatments: settings.core_treatments || defaults.core_treatments,
    core_regions: settings.core_regions || defaults.core_regions,
  }
  return c.json(merged)
})

// 병원 설정 업데이트 (admin/manager만)
hospital.put('/settings', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  const body = await c.req.json()
  // 기존 설정 로드 후 깊은 머지 (location_terms 등 중첩 객체 보존)
  const row: any = await c.env.DB.prepare('SELECT settings FROM hospitals WHERE id=?').bind(user.hospitalId).first()
  let existing: any = {}
  try { existing = JSON.parse(row?.settings || '{}') } catch(e) {}
  const updated = { ...existing }
  for (const key of Object.keys(body)) {
    if (typeof body[key] === 'object' && !Array.isArray(body[key]) && body[key] !== null && typeof existing[key] === 'object' && !Array.isArray(existing[key])) {
      updated[key] = { ...existing[key], ...body[key] }
    } else {
      updated[key] = body[key]
    }
  }
  await c.env.DB.prepare('UPDATE hospitals SET settings=?, updated_at=? WHERE id=?').bind(JSON.stringify(updated), new Date().toISOString(), user.hospitalId).run()
  return c.json({ success: true, settings: updated })
})

// 병원 기본 정보 조회
hospital.get('/info', async (c) => {
  const user = c.get('user')!
  const row: any = await c.env.DB.prepare('SELECT id, name, phone, address, logo_url, settings, created_at FROM hospitals WHERE id=?').bind(user.hospitalId).first()
  if (!row) return c.json({ error: '병원 정보를 찾을 수 없습니다' }, 404)
  let settings: any = {}
  try { settings = JSON.parse(row.settings || '{}') } catch(e) {}
  return c.json({ ...row, settings })
})

// 병원 기본 정보 수정 (admin만)
hospital.put('/info', requireRole('admin'), async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    name: { type: 'string', max: 200 },
    phone: { type: 'string', max: 20 },
    address: { type: 'string', max: 500 },
  })
  const sets: string[] = []
  const vals: any[] = []
  if (b.name) { sets.push('name=?'); vals.push(b.name) }
  if (b.phone !== undefined) { sets.push('phone=?'); vals.push(b.phone || '') }
  if (b.address !== undefined) { sets.push('address=?'); vals.push(b.address || '') }
  if (!sets.length) return c.json({ error: '변경 사항이 없습니다' }, 400)
  sets.push('updated_at=?'); vals.push(new Date().toISOString())
  vals.push(user.hospitalId)
  await c.env.DB.prepare(`UPDATE hospitals SET ${sets.join(',')} WHERE id=?`).bind(...vals).run()
  return c.json({ success: true })
})


export default hospital
