// ============================================================
// TOTP (RFC 6238) 테스트 — Base32 / 코드생성 / 검증 / 백업코드
// RFC 6238 Appendix B 표준 테스트 벡터 포함 (SHA-1)
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  generateTotpSecret,
  base32Encode,
  base32Decode,
  generateTotpCode,
  verifyTotpCode,
  timingSafeEqual,
  buildOtpAuthUri,
  generateBackupCodes,
  hashBackupCode,
} from '../src/lib/totp'

describe('Base32 인코딩/디코딩 (RFC 4648)', () => {
  it('round-trip: encode → decode 가 원본 보존', () => {
    const original = new Uint8Array([0, 1, 2, 3, 255, 128, 64, 32, 16, 8])
    const encoded = base32Encode(original)
    const decoded = base32Decode(encoded)
    expect(Array.from(decoded)).toEqual(Array.from(original))
  })
  it('알려진 벡터: "Hello" → JBSWY3DP', () => {
    const bytes = new TextEncoder().encode('Hello')
    expect(base32Encode(bytes)).toBe('JBSWY3DP')
  })
  it('decode 는 소문자/공백/잘못된 문자를 관대하게 처리', () => {
    const a = base32Decode('JBSWY3DP')
    const b = base32Decode('jbswy3dp')
    const c = base32Decode('JBSW Y3DP!!')
    expect(Array.from(a)).toEqual(Array.from(b))
    expect(Array.from(a)).toEqual(Array.from(c))
  })
})

describe('generateTotpSecret', () => {
  it('기본 20바이트 → 32자 Base32', () => {
    const secret = generateTotpSecret()
    expect(secret).toHaveLength(32)
    expect(secret).toMatch(/^[A-Z2-7]+$/)
  })
  it('매번 다른 시크릿 생성', () => {
    expect(generateTotpSecret()).not.toBe(generateTotpSecret())
  })
})

describe('generateTotpCode — RFC 6238 표준 테스트 벡터 (SHA-1, 8자리)', () => {
  // RFC 6238 Appendix B: secret = "12345678901234567890" (ASCII)
  const RFC_SECRET = base32Encode(new TextEncoder().encode('12345678901234567890'))

  const vectors: Array<[number, string]> = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
  ]

  for (const [time, expected] of vectors) {
    it(`T=${time} → ${expected}`, async () => {
      const code = await generateTotpCode(RFC_SECRET, time, 30, 8)
      expect(code).toBe(expected)
    })
  }

  it('6자리 코드는 8자리 벡터의 마지막 6자리', async () => {
    const code = await generateTotpCode(RFC_SECRET, 59, 30, 6)
    expect(code).toBe('287082')
  })

  it('같은 30초 윈도우 내에서는 동일 코드', async () => {
    const c1 = await generateTotpCode(RFC_SECRET, 90, 30, 6)  // counter=3
    const c2 = await generateTotpCode(RFC_SECRET, 119, 30, 6) // counter=3
    expect(c1).toBe(c2)
  })
})

describe('verifyTotpCode', () => {
  const secret = 'JBSWY3DPEHPK3PXP' // 고정 테스트 시크릿

  it('현재 시각 코드 검증 성공', async () => {
    const now = Math.floor(Date.now() / 1000)
    const code = await generateTotpCode(secret, now)
    expect(await verifyTotpCode(secret, code)).toBe(true)
  })
  it('±1 윈도우(30초 드리프트) 허용', async () => {
    const now = Math.floor(Date.now() / 1000)
    const prevCode = await generateTotpCode(secret, now - 30)
    const nextCode = await generateTotpCode(secret, now + 30)
    expect(await verifyTotpCode(secret, prevCode)).toBe(true)
    expect(await verifyTotpCode(secret, nextCode)).toBe(true)
  })
  it('2윈도우 이상 벗어난 코드 거부', async () => {
    const now = Math.floor(Date.now() / 1000)
    const oldCode = await generateTotpCode(secret, now - 120)
    // 극히 낮은 확률로 우연히 일치할 수 있으나 실질적으로 거부되어야 함
    const currentCodes = await Promise.all([-1, 0, 1].map(d =>
      generateTotpCode(secret, now + d * 30)))
    if (!currentCodes.includes(oldCode)) {
      expect(await verifyTotpCode(secret, oldCode)).toBe(false)
    }
  })
  it('형식 불량 코드 즉시 거부', async () => {
    expect(await verifyTotpCode(secret, 'abcdef')).toBe(false)
    expect(await verifyTotpCode(secret, '12345')).toBe(false)   // 5자리
    expect(await verifyTotpCode(secret, '1234567')).toBe(false) // 7자리
    expect(await verifyTotpCode(secret, '')).toBe(false)
    expect(await verifyTotpCode(secret, '12 456')).toBe(false)
  })
})

describe('timingSafeEqual', () => {
  it('동일 문자열 → true', () => {
    expect(timingSafeEqual('123456', '123456')).toBe(true)
  })
  it('불일치 → false', () => {
    expect(timingSafeEqual('123456', '123457')).toBe(false)
    expect(timingSafeEqual('123456', '654321')).toBe(false)
  })
  it('길이 다르면 false', () => {
    expect(timingSafeEqual('12345', '123456')).toBe(false)
  })
})

describe('buildOtpAuthUri', () => {
  it('otpauth URI 형식 준수', () => {
    const uri = buildOtpAuthUri({
      label: 'moon@bidi.co.kr',
      issuer: 'Patient Funnel OS',
      secret: 'JBSWY3DPEHPK3PXP',
    })
    expect(uri).toMatch(/^otpauth:\/\/totp\//)
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP')
    expect(uri).toContain('issuer=Patient+Funnel+OS')
    expect(uri).toContain('algorithm=SHA1')
    expect(uri).toContain('digits=6')
    expect(uri).toContain('period=30')
    expect(uri).toContain(encodeURIComponent('Patient Funnel OS:moon@bidi.co.kr'))
  })
})

describe('백업 코드', () => {
  it('기본 10개, xxxxx-xxxxx 형식', () => {
    const codes = generateBackupCodes()
    expect(codes).toHaveLength(10)
    for (const c of codes) expect(c).toMatch(/^[0-9a-f]{5}-[0-9a-f]{5}$/)
  })
  it('중복 없음', () => {
    const codes = generateBackupCodes(20)
    expect(new Set(codes).size).toBe(20)
  })
  it('hashBackupCode: 대소문자/공백 정규화 후 동일 해시', async () => {
    const h1 = await hashBackupCode('abcde-12345')
    const h2 = await hashBackupCode('  ABCDE-12345  ')
    expect(h1).toBe(h2)
    expect(h1).toMatch(/^[0-9a-f]{64}$/) // SHA-256 hex
  })
  it('다른 코드는 다른 해시', async () => {
    const h1 = await hashBackupCode('abcde-12345')
    const h2 = await hashBackupCode('abcde-12346')
    expect(h1).not.toBe(h2)
  })
})
