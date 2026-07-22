import { Hono } from 'hono'

export type Bindings = {
  DB: D1Database
  R2: R2Bucket
  JWT_SECRET: string
  RATE_LIMIT_KV?: KVNamespace        // KV 기반 rate limit (없으면 D1 폴백)
  OPENAI_API_KEY?: string             // GPT-4o-mini (v5.4.0 부터 사용)
  ALLOWED_ORIGINS?: string            // CORS 화이트리스트 (production)
  CRON_SECRET?: string                // 외부 크론 호출 인증
  // ─── v5.9 구독/결제 (토스페이먼츠) ───
  TOSS_SECRET_KEY?: string            // 토스 시크릿 키 (미설정 시 결제 API 503 '준비중')
  TOSS_CLIENT_KEY?: string            // 토스 클라이언트 키 (프론트 SDK 용, status API 로 노출)
  // ─── v5.10 이메일 발송 (Resend) ───
  RESEND_API_KEY?: string             // Resend API 키 (미설정 시 비밀번호 재설정 503 안내)
  EMAIL_FROM?: string                 // 발신 주소 (기본: noreply@patientfunnel.kr)
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
}

export type AppType = Hono<{ Bindings: Bindings; Variables: Variables }>
