// ============================================================
// Patient Funnel Sync — 환자 온도 ↔ PFM 10단계 퍼널 동기화
// Phase C
// ─────────────────────────────────────────────────────────────
// 핵심 약속:
//   - 환자 온도(5단계)와 PFM 퍼널 단계(10단계)는 결정적으로 매핑된다.
//   - 한쪽이 바뀌면 다른 쪽도 같이 바뀐다 (UPDATE 한 트랜잭션 안에서).
//   - patient_threads ↔ patients 둘 다 같은 값을 가진다 (denormalize).
//
// 매핑 (PATIENT_TEMPERATURES 정의와 동일):
//   cold     → 1-2   (관심 단계 — 인지/방문 전)
//   warm     → 3-5   (상담 단계)
//   hot      → 6-7   (치료 진행)
//   patient  → 8     (치료 완료)
//   advocate → 9-10  (추천/재내원)
// ============================================================

import type { PatientTemperature } from './types'

/**
 * 온도 → 퍼널 기본 단계 (변경 시 사용할 대표값).
 * 범위 안에서 가장 낮은 단계를 기본으로 — 이미 더 높은 단계에 있으면 유지.
 */
const TEMP_TO_STAGE_DEFAULT: Record<PatientTemperature, number> = {
  cold:     1,
  warm:     3,
  hot:      6,
  patient:  8,
  advocate: 9,
}

/** 온도 → 허용 퍼널 단계 범위 [min, max] */
const TEMP_STAGE_RANGE: Record<PatientTemperature, [number, number]> = {
  cold:     [1, 2],
  warm:     [3, 5],
  hot:      [6, 7],
  patient:  [8, 8],
  advocate: [9, 10],
}

/** 퍼널 단계 → 온도 (역방향) */
export function stageToTemperature(stage: number): PatientTemperature {
  if (stage <= 2)  return 'cold'
  if (stage <= 5)  return 'warm'
  if (stage <= 7)  return 'hot'
  if (stage === 8) return 'patient'
  return 'advocate'      // 9, 10
}

/**
 * 온도 변경 시 추천 퍼널 단계 결정.
 * - 새 온도 범위 안에 현재 단계가 이미 들어가면 유지 (덮어쓰지 않음)
 * - 아니면 새 온도의 기본 단계로 이동
 */
export function temperatureToStage(
  newTemp: PatientTemperature,
  currentStage: number,
): number {
  const [lo, hi] = TEMP_STAGE_RANGE[newTemp]
  if (currentStage >= lo && currentStage <= hi) return currentStage
  return TEMP_TO_STAGE_DEFAULT[newTemp]
}

/** 단계 유효성 검증 (1-10) */
export function isValidStage(stage: number): boolean {
  return Number.isInteger(stage) && stage >= 1 && stage <= 10
}

/** 온도 유효성 검증 */
const VALID_TEMPS: ReadonlyArray<PatientTemperature> =
  ['cold', 'warm', 'hot', 'patient', 'advocate']
export function isValidTemperature(t: any): t is PatientTemperature {
  return typeof t === 'string' && (VALID_TEMPS as ReadonlyArray<string>).includes(t)
}

// ─────────────────────────────────────────────────────────────
// DB 동기화 헬퍼
// ─────────────────────────────────────────────────────────────

export interface SyncResult {
  patientId: string
  threadId: string
  before: { temperature: PatientTemperature; stage: number }
  after:  { temperature: PatientTemperature; stage: number }
  changedFields: ('temperature' | 'funnel_stage')[]
}

/**
 * patient_threads + patients 둘 다 같은 값으로 동기화.
 * - patch.temperature 만 주면 stage 는 자동 계산 (현재 stage 범위 안이면 유지)
 * - patch.stage 만 주면 temperature 도 자동 계산
 * - 둘 다 주면 그대로 사용 (단, stage 가 temperature 범위 밖이면 temperature 우선)
 *
 * 반환: 변경 전/후 + 실제 바뀐 필드 목록.
 */
export async function syncPatientFunnel(
  db: D1Database,
  args: {
    hospitalId: string
    threadId: string
    patientId: string
    patch: { temperature?: PatientTemperature; stage?: number }
  }
): Promise<SyncResult> {
  const { hospitalId, threadId, patientId, patch } = args

  // 1. 현재 값 읽기 (thread 기준)
  const before = await db.prepare(
    'SELECT temperature, funnel_stage FROM patient_threads WHERE id = ? AND hospital_id = ?'
  ).bind(threadId, hospitalId).first<{ temperature: PatientTemperature; funnel_stage: number }>()

  if (!before) {
    throw new Error(`patient_thread not found: ${threadId}`)
  }

  const beforeTemp = before.temperature
  const beforeStage = before.funnel_stage

  // 2. 다음 값 결정
  let nextTemp: PatientTemperature = beforeTemp
  let nextStage: number = beforeStage

  if (patch.temperature && patch.stage != null) {
    // 둘 다 명시 — 정합성 체크 (range 밖이면 temperature 우선)
    if (!isValidTemperature(patch.temperature)) throw new Error('invalid temperature')
    if (!isValidStage(patch.stage)) throw new Error('invalid stage')
    const [lo, hi] = TEMP_STAGE_RANGE[patch.temperature]
    nextTemp = patch.temperature
    nextStage = (patch.stage >= lo && patch.stage <= hi)
      ? patch.stage
      : TEMP_TO_STAGE_DEFAULT[patch.temperature]
  } else if (patch.temperature) {
    if (!isValidTemperature(patch.temperature)) throw new Error('invalid temperature')
    nextTemp = patch.temperature
    nextStage = temperatureToStage(patch.temperature, beforeStage)
  } else if (patch.stage != null) {
    if (!isValidStage(patch.stage)) throw new Error('invalid stage')
    nextStage = patch.stage
    nextTemp = stageToTemperature(patch.stage)
  } else {
    // 변경 없음
    return {
      patientId, threadId,
      before: { temperature: beforeTemp, stage: beforeStage },
      after:  { temperature: beforeTemp, stage: beforeStage },
      changedFields: [],
    }
  }

  const changedFields: ('temperature' | 'funnel_stage')[] = []
  if (nextTemp !== beforeTemp) changedFields.push('temperature')
  if (nextStage !== beforeStage) changedFields.push('funnel_stage')

  if (changedFields.length === 0) {
    return {
      patientId, threadId,
      before: { temperature: beforeTemp, stage: beforeStage },
      after:  { temperature: beforeTemp, stage: beforeStage },
      changedFields: [],
    }
  }

  // 3. DB 양쪽 동시 갱신 (D1 batch — 원자성)
  const now = new Date().toISOString()
  await db.batch([
    db.prepare(`
      UPDATE patient_threads
      SET temperature = ?, funnel_stage = ?, updated_at = ?
      WHERE id = ? AND hospital_id = ?
    `).bind(nextTemp, nextStage, now, threadId, hospitalId),
    db.prepare(`
      UPDATE patients
      SET temperature = ?, funnel_stage = ?,
          temperature_updated_at = ?, funnel_stage_updated_at = ?,
          updated_at = ?
      WHERE id = ? AND hospital_id = ?
    `).bind(nextTemp, nextStage, now, now, now, patientId, hospitalId),
  ])

  return {
    patientId, threadId,
    before: { temperature: beforeTemp, stage: beforeStage },
    after:  { temperature: nextTemp,   stage: nextStage },
    changedFields,
  }
}

/**
 * 환자 신규 등록 시 patient_thread 자동 생성용 — 초기값 결정.
 * (patients 테이블에 이미 값이 있으면 그것 사용, 없으면 cold/1)
 */
export function initialFunnelState(
  patient: { temperature?: string | null; funnel_stage?: number | null }
): { temperature: PatientTemperature; funnel_stage: number } {
  const temp = isValidTemperature(patient.temperature) ? patient.temperature : 'cold'
  const stage = patient.funnel_stage && isValidStage(patient.funnel_stage)
    ? patient.funnel_stage
    : TEMP_TO_STAGE_DEFAULT[temp]
  return { temperature: temp, funnel_stage: stage }
}
