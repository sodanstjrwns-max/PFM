import { Hono } from 'hono'

export type Bindings = {
  DB: D1Database
  R2: R2Bucket
  JWT_SECRET: string
  // ─── Patient Chat 통합 Phase A ───
  RATE_LIMIT_KV?: KVNamespace        // KV 기반 rate limit (없으면 D1 폴백)
  OPENAI_API_KEY?: string             // GPT-4o-mini (v5.4.0 부터 사용)
  ALLOWED_ORIGINS?: string            // CORS 화이트리스트 (production)
  CRON_SECRET?: string                // 외부 크론 호출 인증 (v5.5.1 — 예약발송/에스컬레이션)
}

export type Variables = {
  user?: UserPayload
}

export type UserPayload = {
  id: string
  hospitalId: string
  email: string
  name: string
  role: string                        // PFM 호환: 'admin' | 'manager' | 'staff'
  userId?: string
  // ─── Patient Chat 통합 ───
  messengerRole?: MessengerRole       // 'owner' | 'admin' | 'manager' | 'team_lead' | 'member' | 'guest'
  department?: string
}

/** 페이션트 챗 호환 메신저 role */
export type MessengerRole = 'owner' | 'admin' | 'manager' | 'team_lead' | 'member' | 'guest'

/** 환자 온도 (Phase C 에서 본격 활용 — PFM 10단계 퍼널과 매핑) */
export type PatientTemperature = 'cold' | 'warm' | 'hot' | 'patient' | 'advocate'

/** 사용자 presence */
export type PresenceStatus = 'online' | 'away' | 'dnd' | 'offline'

export const PATIENT_TEMPERATURES: Record<PatientTemperature, {
  emoji: string
  label: string
  funnelStages: string                 // PFM 10단계 funnel 매핑 힌트
  color: string
}> = {
  cold:     { emoji: '❄️', label: '관심',     funnelStages: '1-2', color: '#60a5fa' },
  warm:     { emoji: '🌤', label: '상담',     funnelStages: '3-5', color: '#fbbf24' },
  hot:      { emoji: '🔥', label: '치료중',   funnelStages: '6-7', color: '#f87171' },
  patient:  { emoji: '🦷', label: '치료완료', funnelStages: '8',   color: '#34d399' },
  advocate: { emoji: '🌟', label: '추천팬',   funnelStages: '9-10', color: '#a78bfa' },
}

/** PFM role → 메신저 role 자동 매핑 (마이그레이션 0036 과 동일 로직) */
export function pfmRoleToMessengerRole(role: string): MessengerRole {
  if (role === 'admin') return 'owner'
  if (role === 'manager') return 'manager'
  return 'member'
}

export type AppType = Hono<{ Bindings: Bindings; Variables: Variables }>
