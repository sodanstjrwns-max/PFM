// ============================================================
// 에스컬레이션 엔진 테스트 — throttle 게이트 / 스캔 규칙
// D1 목(mock)으로 SQL 흐름을 시뮬레이션
// ============================================================
import { describe, it, expect } from 'vitest'
import { acquireThrottleGate, scanAndEscalate } from '../src/lib/escalation-engine'

/* ─── 가벼운 D1 목 ───
 * prepare(sql).bind(...).run/first/all 체인을 핸들러로 라우팅 */
type Handler = (sql: string, args: any[]) => any
function mockD1(handler: Handler) {
  return {
    prepare(sql: string) {
      const make = (args: any[]) => ({
        run: async () => handler(sql, args) ?? { meta: { changes: 0 } },
        first: async () => handler(sql, args) ?? null,
        all: async () => handler(sql, args) ?? { results: [] },
        bind: (...more: any[]) => make([...args, ...more]),
      })
      return make([])
    },
    batch: async (stmts: any[]) => Promise.all(stmts.map(s => s.run())),
  } as any
}

describe('acquireThrottleGate (cross-isolate 1분 게이트)', () => {
  it('UPDATE 성공(changes=1) → 게이트 통과', async () => {
    const db = mockD1((sql) => {
      if (sql.includes('INSERT OR IGNORE')) return { meta: { changes: 0 } }
      if (sql.includes('UPDATE system_throttle')) return { meta: { changes: 1 } }
      return null
    })
    expect(await acquireThrottleGate(db, 'esc_scan:h1', 60)).toBe(true)
  })

  it('UPDATE 실패(changes=0) → 다른 isolate 가 선점, 게이트 차단', async () => {
    const db = mockD1((sql) => {
      if (sql.includes('UPDATE system_throttle')) return { meta: { changes: 0 } }
      return { meta: { changes: 0 } }
    })
    expect(await acquireThrottleGate(db, 'esc_scan:h1', 60)).toBe(false)
  })

  it('테이블 미존재 등 예외 → 안전하게 통과 허용 (기존 동작 유지)', async () => {
    const db = mockD1(() => { throw new Error('no such table: system_throttle') })
    expect(await acquireThrottleGate(db, 'esc_scan:h1', 60)).toBe(true)
  })
})

describe('scanAndEscalate — throttle 및 설정 규칙', () => {
  it('같은 병원 연속 호출 시 in-memory throttle 로 즉시 차단 (2번째 호출 = [])', async () => {
    const hospitalId = 'h-throttle-' + Date.now()
    let queryCount = 0
    const db = mockD1((sql) => {
      queryCount++
      if (sql.includes('UPDATE system_throttle')) return { meta: { changes: 1 } }
      if (sql.includes('hospital_messenger_settings')) {
        return { escalation_minutes_l1: 10, escalation_minutes_l2: 20, escalation_minutes_l3: 40, enforce_confirm_escalation: 1 }
      }
      if (sql.includes('FROM messages')) return { results: [] }
      return null
    })

    const first = await scanAndEscalate(db, hospitalId)
    expect(first).toEqual([])
    const countAfterFirst = queryCount

    // 두 번째 호출 — in-memory throttle 이 0쿼리로 차단해야 함
    const second = await scanAndEscalate(db, hospitalId)
    expect(second).toEqual([])
    expect(queryCount).toBe(countAfterFirst) // 추가 쿼리 없음
  })

  it('enforce_confirm_escalation=0 이면 스캔 없이 종료', async () => {
    const hospitalId = 'h-disabled-' + Date.now()
    let scannedMessages = false
    const db = mockD1((sql) => {
      if (sql.includes('UPDATE system_throttle')) return { meta: { changes: 1 } }
      if (sql.includes('hospital_messenger_settings')) {
        return { escalation_minutes_l1: 10, escalation_minutes_l2: 20, escalation_minutes_l3: 40, enforce_confirm_escalation: 0 }
      }
      if (sql.includes('FROM messages')) { scannedMessages = true; return { results: [] } }
      return null
    })
    const result = await scanAndEscalate(db, hospitalId, { force: true })
    expect(result).toEqual([])
    expect(scannedMessages).toBe(false)
  })

  it('멤버 1명 이하 채널은 트리거하지 않음', async () => {
    const hospitalId = 'h-solo-' + Date.now()
    let inserted = false
    const db = mockD1((sql) => {
      if (sql.includes('UPDATE system_throttle')) return { meta: { changes: 1 } }
      if (sql.includes('hospital_messenger_settings')) {
        return { escalation_minutes_l1: 10, escalation_minutes_l2: 20, escalation_minutes_l3: 40, enforce_confirm_escalation: 1 }
      }
      if (sql.includes('FROM messages')) {
        return { results: [{ message_id: 'm1', channel_id: 'ch1', sender_id: 'u1', content: 'test', created_at: '2026-01-01', member_count: 1, confirmed_count: 0 }] }
      }
      if (sql.includes('INSERT INTO message_escalations')) { inserted = true; return { meta: { changes: 1 } } }
      return { results: [] }
    })
    const result = await scanAndEscalate(db, hospitalId, { force: true })
    expect(result).toEqual([])
    expect(inserted).toBe(false)
  })

  it('전원 확인 완료(발송자 제외) 메시지는 트리거하지 않음', async () => {
    const hospitalId = 'h-confirmed-' + Date.now()
    let inserted = false
    const db = mockD1((sql) => {
      if (sql.includes('UPDATE system_throttle')) return { meta: { changes: 1 } }
      if (sql.includes('hospital_messenger_settings')) {
        return { escalation_minutes_l1: 10, escalation_minutes_l2: 20, escalation_minutes_l3: 40, enforce_confirm_escalation: 1 }
      }
      if (sql.includes('FROM messages')) {
        // 멤버 5명, 확인 4명 (발송자 제외 전원) → 트리거 X
        return { results: [{ message_id: 'm2', channel_id: 'ch1', sender_id: 'u1', content: 'ok', created_at: '2026-01-01', member_count: 5, confirmed_count: 4 }] }
      }
      if (sql.includes('INSERT INTO message_escalations')) { inserted = true; return { meta: { changes: 1 } } }
      return { results: [] }
    })
    const result = await scanAndEscalate(db, hospitalId, { force: true })
    expect(result).toEqual([])
    expect(inserted).toBe(false)
  })

  it('미확인 메시지는 L1/L2/L3 에스컬레이션 트리거 + notified_count 기록', async () => {
    const hospitalId = 'h-trigger-' + Date.now()
    const inserts: any[] = []
    const db = mockD1((sql, args) => {
      if (sql.includes('UPDATE system_throttle')) return { meta: { changes: 1 } }
      if (sql.includes('hospital_messenger_settings')) {
        return { escalation_minutes_l1: 10, escalation_minutes_l2: 20, escalation_minutes_l3: 40, enforce_confirm_escalation: 1 }
      }
      if (sql.includes('FROM messages')) {
        // 멤버 3명, 확인 0명, 3개 레벨 각각 후보로 반환
        return { results: [{ message_id: 'm3', channel_id: 'ch1', sender_id: 'u1', content: '중요 공지입니다', created_at: '2026-01-01', member_count: 3, confirmed_count: 0 }] }
      }
      if (sql.includes('INSERT INTO message_escalations')) { inserts.push(args); return { meta: { changes: 1 } } }
      if (sql.includes('channel_members cm') || sql.includes('FROM channel_members')) {
        return { results: [{ user_id: 'u1' }, { user_id: 'u2' }, { user_id: 'u3' }] }
      }
      if (sql.includes('messenger_role')) {
        return { results: [{ id: 'u-mgr' }] }
      }
      if (sql.includes('INSERT INTO messenger_audit')) return { meta: { changes: 1 } }
      return { results: [] }
    })
    const result = await scanAndEscalate(db, hospitalId, { force: true })
    expect(result.length).toBe(3) // L1 + L2 + L3
    expect(result.map(r => r.level).sort()).toEqual([1, 2, 3])
    expect(inserts.length).toBe(3)
    for (const r of result) {
      expect(r.message_id).toBe('m3')
      expect(r.notified_count).toBeGreaterThan(0)
      expect(r.message_preview).toBe('중요 공지입니다')
    }
  })
})
