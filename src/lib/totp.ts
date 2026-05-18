// ============================================================
// TOTP (RFC 6238) — 2단계 인증
// Patient Chat 통합 Phase A
// ─────────────────────────────────────────────────────────────
// Web Crypto API 만 사용 — 외부 의존성 없음.
// Google Authenticator / 1Password / Authy 모두 호환:
//   HMAC-SHA1, 30초 윈도우, 6자리 코드, Base32 시크릿 (RFC 4648)
// ============================================================

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** Base32 시크릿 생성 (기본 20바이트 = 32자) */
export function generateTotpSecret(byteLength = 20): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return base32Encode(bytes)
}

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const b of bytes) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(s: string): Uint8Array {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, '')
  const bytes: number[] = []
  let bits = 0
  let value = 0
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch)
    if (idx < 0) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Uint8Array.from(bytes)
}

async function hmacSha1(key: Uint8Array, msg: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', k, msg)
  return new Uint8Array(sig)
}

export async function generateTotpCode(
  secretBase32: string,
  timestamp: number = Math.floor(Date.now() / 1000),
  period = 30,
  digits = 6,
): Promise<string> {
  const counter = Math.floor(timestamp / period)
  const buf = new ArrayBuffer(8)
  const dv = new DataView(buf)
  dv.setUint32(0, Math.floor(counter / 0x100000000))
  dv.setUint32(4, counter >>> 0)
  const key = base32Decode(secretBase32)
  const mac = await hmacSha1(key, new Uint8Array(buf))
  const offset = mac[mac.length - 1] & 0x0f
  const bin =
    ((mac[offset] & 0x7f) << 24) |
    ((mac[offset + 1] & 0xff) << 16) |
    ((mac[offset + 2] & 0xff) << 8) |
    (mac[offset + 3] & 0xff)
  const otp = bin % Math.pow(10, digits)
  return otp.toString().padStart(digits, '0')
}

/**
 * ±1 윈도우(±30초) 허용 검증.
 * Constant-time 비교로 타이밍 누설 방지.
 */
export async function verifyTotpCode(
  secretBase32: string,
  code: string,
  period = 30,
  digits = 6,
): Promise<boolean> {
  if (!/^\d+$/.test(code) || code.length !== digits) return false
  const now = Math.floor(Date.now() / 1000)
  for (const drift of [-1, 0, 1]) {
    const candidate = await generateTotpCode(secretBase32, now + drift * period, period, digits)
    if (timingSafeEqual(candidate, code)) return true
  }
  return false
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * otpauth URI — Authenticator 앱에 QR 코드로 등록.
 *   otpauth://totp/Patient%20Funnel%20OS:moon@bidi.co.kr?secret=...&issuer=...
 */
export function buildOtpAuthUri(opts: {
  label: string        // 'moon@bidi.co.kr'
  issuer: string       // 'Patient Funnel OS'
  secret: string
}): string {
  const label = encodeURIComponent(`${opts.issuer}:${opts.label}`)
  const params = new URLSearchParams({
    secret: opts.secret,
    issuer: opts.issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  })
  return `otpauth://totp/${label}?${params.toString()}`
}

// ─── 1회용 백업 코드 ───
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(5)
    crypto.getRandomValues(bytes)
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
    codes.push(`${hex.slice(0, 5)}-${hex.slice(5)}`)
  }
  return codes
}

export async function hashBackupCode(code: string): Promise<string> {
  const enc = new TextEncoder()
  const h = await crypto.subtle.digest('SHA-256', enc.encode(code.toLowerCase().trim()))
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('')
}
