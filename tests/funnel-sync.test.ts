// ============================================================
// 퍼널 매핑 테스트 — 환자 온도(5단계) ↔ PFM 퍼널(10단계)
// cold→1-2, warm→3-5, hot→6-7, patient→8, advocate→9-10
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  stageToTemperature,
  temperatureToStage,
  isValidStage,
  isValidTemperature,
  initialFunnelState,
} from '../src/lib/patient-funnel-sync'

describe('stageToTemperature (퍼널 단계 → 온도)', () => {
  it('1-2단계 → cold', () => {
    expect(stageToTemperature(1)).toBe('cold')
    expect(stageToTemperature(2)).toBe('cold')
  })
  it('3-5단계 → warm', () => {
    expect(stageToTemperature(3)).toBe('warm')
    expect(stageToTemperature(4)).toBe('warm')
    expect(stageToTemperature(5)).toBe('warm')
  })
  it('6-7단계 → hot', () => {
    expect(stageToTemperature(6)).toBe('hot')
    expect(stageToTemperature(7)).toBe('hot')
  })
  it('8단계 → patient', () => {
    expect(stageToTemperature(8)).toBe('patient')
  })
  it('9-10단계 → advocate', () => {
    expect(stageToTemperature(9)).toBe('advocate')
    expect(stageToTemperature(10)).toBe('advocate')
  })
})

describe('temperatureToStage (온도 변경 시 추천 단계)', () => {
  it('현재 단계가 새 온도 범위 안이면 유지', () => {
    expect(temperatureToStage('warm', 4)).toBe(4)   // warm=3-5, 4 유지
    expect(temperatureToStage('advocate', 10)).toBe(10)
    expect(temperatureToStage('cold', 2)).toBe(2)
  })
  it('범위 밖이면 기본 단계로 이동', () => {
    expect(temperatureToStage('warm', 1)).toBe(3)   // cold→warm 승격
    expect(temperatureToStage('hot', 3)).toBe(6)    // warm→hot 승격
    expect(temperatureToStage('patient', 6)).toBe(8)
    expect(temperatureToStage('advocate', 8)).toBe(9)
    expect(temperatureToStage('cold', 7)).toBe(1)   // 강등도 기본값으로
  })
})

describe('양방향 매핑 정합성 (round-trip)', () => {
  it('모든 단계에 대해 stage → temp → stage 가 원래 단계를 보존', () => {
    for (let stage = 1; stage <= 10; stage++) {
      const temp = stageToTemperature(stage)
      // 해당 온도로 다시 변환 시 현재 단계가 범위 안이므로 유지되어야 함
      expect(temperatureToStage(temp, stage)).toBe(stage)
    }
  })
})

describe('isValidStage', () => {
  it('1-10 정수만 허용', () => {
    expect(isValidStage(1)).toBe(true)
    expect(isValidStage(10)).toBe(true)
    expect(isValidStage(0)).toBe(false)
    expect(isValidStage(11)).toBe(false)
    expect(isValidStage(3.5)).toBe(false)
    expect(isValidStage(NaN)).toBe(false)
    expect(isValidStage(-1)).toBe(false)
  })
})

describe('isValidTemperature', () => {
  it('5개 온도만 허용', () => {
    for (const t of ['cold', 'warm', 'hot', 'patient', 'advocate']) {
      expect(isValidTemperature(t)).toBe(true)
    }
    expect(isValidTemperature('lukewarm')).toBe(false)
    expect(isValidTemperature('')).toBe(false)
    expect(isValidTemperature(null)).toBe(false)
    expect(isValidTemperature(3)).toBe(false)
    expect(isValidTemperature('COLD')).toBe(false) // 대소문자 엄격
  })
})

describe('initialFunnelState (신규 환자 초기값)', () => {
  it('값이 없으면 cold/1', () => {
    expect(initialFunnelState({})).toEqual({ temperature: 'cold', funnel_stage: 1 })
    expect(initialFunnelState({ temperature: null, funnel_stage: null }))
      .toEqual({ temperature: 'cold', funnel_stage: 1 })
  })
  it('기존 값이 유효하면 그대로 사용', () => {
    expect(initialFunnelState({ temperature: 'hot', funnel_stage: 7 }))
      .toEqual({ temperature: 'hot', funnel_stage: 7 })
  })
  it('temperature 만 있으면 해당 온도의 기본 단계', () => {
    expect(initialFunnelState({ temperature: 'advocate' }))
      .toEqual({ temperature: 'advocate', funnel_stage: 9 })
  })
  it('잘못된 온도는 cold 로 폴백', () => {
    expect(initialFunnelState({ temperature: 'blazing', funnel_stage: 5 }))
      .toEqual({ temperature: 'cold', funnel_stage: 5 })
  })
  it('잘못된 단계는 온도 기본값으로 폴백', () => {
    expect(initialFunnelState({ temperature: 'warm', funnel_stage: 99 }))
      .toEqual({ temperature: 'warm', funnel_stage: 3 })
  })
})
