// ============================================================
// 권한 매트릭스 테스트 — requireRole / filterSensitiveData / JWT
// ============================================================
import { describe, it, expect } from 'vitest'
import { requireRole, filterSensitiveData, getJwtSecret } from '../src/lib/middleware'
import { signJWT, verifyJWT } from '../src/lib/crypto'

/* ─── Hono 컨텍스트 목(mock) ─── */
function mockContext(user: any) {
  let jsonBody: any = null
  let jsonStatus: number | null = null
  return {
    ctx: {
      get: (key: string) => (key === 'user' ? user : undefined),
      json: (body: any, status?: number) => {
        jsonBody = body
        jsonStatus = status ?? 200
        return { body, status: jsonStatus }
      },
    },
    result: () => ({ body: jsonBody, status: jsonStatus }),
  }
}

describe('requireRole (역할 기반 접근 제어)', () => {
  it('허용된 역할은 next() 호출', async () => {
    const { ctx } = mockContext({ id: 'u1', role: 'admin' })
    let nextCalled = false
    await requireRole('admin', 'manager')(ctx, async () => { nextCalled = true })
    expect(nextCalled).toBe(true)
  })

  it('허용 안 된 역할은 403', async () => {
    const { ctx, result } = mockContext({ id: 'u1', role: 'staff' })
    let nextCalled = false
    await requireRole('admin', 'manager')(ctx, async () => { nextCalled = true })
    expect(nextCalled).toBe(false)
    expect(result().status).toBe(403)
    expect(result().body.error).toContain('접근 권한이 없습니다')
  })

  it('user 없으면 403', async () => {
    const { ctx, result } = mockContext(null)
    let nextCalled = false
    await requireRole('admin')(ctx, async () => { nextCalled = true })
    expect(nextCalled).toBe(false)
    expect(result().status).toBe(403)
  })

  it('복수 역할 매트릭스: staff 는 staff 전용 통과, admin 전용 차단', async () => {
    const staff = { id: 'u2', role: 'staff' }
    // staff 허용 라우트
    {
      const { ctx } = mockContext(staff)
      let ok = false
      await requireRole('admin', 'manager', 'staff')(ctx, async () => { ok = true })
      expect(ok).toBe(true)
    }
    // admin 전용 라우트
    {
      const { ctx, result } = mockContext(staff)
      let ok = false
      await requireRole('admin')(ctx, async () => { ok = true })
      expect(ok).toBe(false)
      expect(result().status).toBe(403)
    }
  })
})

describe('filterSensitiveData (민감 재무정보 마스킹)', () => {
  const record = {
    id: 'c1', patient_name: '홍길동',
    estimated_amount: 5000000, agreed_amount: 4500000,
    paid_amount: 2000000, remaining_amount: 2500000,
    evaluation_score: 4.5, evaluation_notes: '우수', salary: 3500000,
  }

  it('admin/manager 는 원본 그대로', () => {
    expect(filterSensitiveData(record, 'admin')).toEqual(record)
    expect(filterSensitiveData(record, 'manager')).toEqual(record)
  })

  it('staff 는 금액/평가/급여 필드 null 마스킹', () => {
    const filtered = filterSensitiveData(record, 'staff')
    expect(filtered.estimated_amount).toBeNull()
    expect(filtered.agreed_amount).toBeNull()
    expect(filtered.paid_amount).toBeNull()
    expect(filtered.remaining_amount).toBeNull()
    expect(filtered.evaluation_score).toBeNull()
    expect(filtered.evaluation_notes).toBeNull()
    expect(filtered.salary).toBeNull()
    // 비민감 필드는 유지
    expect(filtered.patient_name).toBe('홍길동')
    expect(filtered.id).toBe('c1')
  })

  it('배열도 요소별 마스킹', () => {
    const arr = filterSensitiveData([record, record], 'staff')
    expect(arr).toHaveLength(2)
    expect(arr[0].salary).toBeNull()
    expect(arr[1].paid_amount).toBeNull()
  })
})

describe('JWT 서명/검증 (HS256, ms 기반 exp)', () => {
  const SECRET = 'test-secret-key-for-unit-tests'

  it('sign → verify round-trip 으로 payload 복원', async () => {
    const token = await signJWT({ id: 'u1', hospitalId: 'h1', role: 'admin' }, SECRET)
    const payload: any = await verifyJWT(token, SECRET)
    expect(payload).not.toBeNull()
    expect(payload.id).toBe('u1')
    expect(payload.hospitalId).toBe('h1')
    expect(payload.role).toBe('admin')
    expect(payload.exp).toBeGreaterThan(Date.now()) // ms 기반 만료
  })

  it('잘못된 시크릿으로 검증 실패', async () => {
    const token = await signJWT({ id: 'u1' }, SECRET)
    expect(await verifyJWT(token, 'wrong-secret')).toBeNull()
  })

  it('변조된 토큰 거부', async () => {
    const token = await signJWT({ id: 'u1', role: 'staff' }, SECRET)
    const [h, p, s] = token.split('.')
    // payload 의 role 을 admin 으로 바꿔치기 시도
    const tampered = JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString())
    tampered.role = 'admin'
    const forgedPayload = Buffer.from(JSON.stringify(tampered)).toString('base64url')
    expect(await verifyJWT(`${h}.${forgedPayload}.${s}`, SECRET)).toBeNull()
  })

  it('형식 불량 토큰 거부', async () => {
    expect(await verifyJWT('not-a-jwt', SECRET)).toBeNull()
    expect(await verifyJWT('', SECRET)).toBeNull()
    expect(await verifyJWT('a.b', SECRET)).toBeNull()
  })

  it('만료된 토큰 거부', async () => {
    // exp 를 과거로 강제한 토큰을 직접 제작
    const enc = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url')
    const header = enc({ alg: 'HS256', typ: 'JWT' })
    const payload = enc({ id: 'u1', exp: Date.now() - 1000 })
    const data = `${header}.${payload}`
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
    const sigB64 = Buffer.from(new Uint8Array(sig)).toString('base64url')
    expect(await verifyJWT(`${data}.${sigB64}`, SECRET)).toBeNull()
  })
})

describe('getJwtSecret', () => {
  it('환경변수 있으면 그대로 반환', () => {
    expect(getJwtSecret('my-secret')).toBe('my-secret')
  })
  it('환경변수 없으면 회전 폴백 (dev 전용, 매번 다름)', () => {
    const s1 = getJwtSecret(undefined)
    expect(s1).toMatch(/^pfm-dev-only-/)
  })
})
