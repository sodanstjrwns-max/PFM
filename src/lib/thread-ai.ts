/* ═══════════════════════════════════════════════════════════
 * Patient Thread AI (Phase E)
 *  - 환자 스레드 요약 (지금까지 흐름 한눈에)
 *  - 다음 액션 제안 (구체적 To-Do)
 *  - 위험 평가 (이탈/컴플레인 신호)
 *
 *  컨텍스트:
 *   - 환자 카드 (온도/퍼널/태그/담당자)
 *   - 최근 이벤트 30개 (퍼널 변경/치료/결제/메모)
 *   - 최근 메시지 50개 (해당 스레드 연결된 채널 메시지)
 *
 *  캐싱: patient_thread_ai_insights 에 message_count + event_count + insight_type 기반
 *        같은 컨텍스트면 캐시 히트, 새 이벤트/메시지 생기면 자동 미스
 * ═══════════════════════════════════════════════════════════ */

import { getOpenAIKey } from './openai'
import { generateMessengerId } from './messenger-helpers'

export type ThreadInsightType = 'summary' | 'next_actions' | 'risk_assessment'

export interface ThreadAIOptions {
  hospitalId: string
  threadId: string
  userId: string
  insightType: ThreadInsightType
  forceRefresh?: boolean
  cacheTtlHours?: number          // 기본 24
  maxTokens?: number              // 기본 700
}

export interface ThreadAIResult {
  id: string                       // tai_xxxxx
  threadId: string
  insightType: ThreadInsightType
  payload: any
  model: string
  tokenCount: number
  cached: boolean
  generatedAt: string
}

/* ═══ 컨텍스트 수집 ═══ */
async function loadThreadContext(db: D1Database, hospitalId: string, threadId: string) {
  // 스레드 + 환자 카드
  const thread = await db.prepare(`
    SELECT t.*,
           p.patient_name AS patient_name, p.phone, p.gender, p.birth_date,
           p.chart_number, p.last_visit_date, p.first_visit_date,
           p.visit_reason, p.memo AS patient_memo, p.visit_count
    FROM patient_threads t
    LEFT JOIN patients p ON p.id = t.patient_id AND p.hospital_id = t.hospital_id
    WHERE t.id = ? AND t.hospital_id = ?
    LIMIT 1
  `).bind(threadId, hospitalId).first<any>()

  if (!thread) return null

  // 최근 이벤트
  const evts = await db.prepare(`
    SELECT id, event_type, title, body, payload, created_at, actor_id
    FROM patient_thread_events
    WHERE thread_id = ?
    ORDER BY created_at DESC
    LIMIT 30
  `).bind(threadId).all<any>()

  // 최근 메시지
  const msgs = await db.prepare(`
    SELECT m.id, m.user_id, m.content, m.created_at,
           u.name AS user_name
    FROM messages m
    LEFT JOIN users u ON u.id = m.user_id
    WHERE m.patient_thread_id = ? AND m.is_deleted = 0
    ORDER BY m.created_at DESC
    LIMIT 50
  `).bind(threadId).all<any>()

  return {
    thread,
    events: (evts.results || []).reverse(),       // 오래된 → 최신 순
    messages: (msgs.results || []).reverse(),
  }
}

/* ═══ 캐시 lookup ═══ */
async function findFreshInsight(
  db: D1Database,
  threadId: string,
  insightType: ThreadInsightType,
  currentMessageCount: number,
  currentEventCount: number,
): Promise<any | null> {
  const row = await db.prepare(`
    SELECT id, payload, model, token_count, message_count_at_gen, event_count_at_gen, created_at
    FROM patient_thread_ai_insights
    WHERE thread_id = ? AND insight_type = ?
      AND (expires_at IS NULL OR expires_at > datetime('now'))
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(threadId, insightType).first<any>().catch(() => null)

  if (!row) return null

  // 컨텍스트가 동일하면 재사용 (메시지/이벤트 수 모두 일치)
  if (row.message_count_at_gen === currentMessageCount &&
      row.event_count_at_gen === currentEventCount) {
    return row
  }
  return null
}

/* ═══ 프롬프트 빌더 ═══ */
const SYSTEM_PROMPTS: Record<ThreadInsightType, string> = {
  summary: `당신은 치과 상담실장/원장이 환자 한 명의 흐름을 5초 안에 파악하도록 돕는 AI입니다.
주어진 환자 정보, 시스템 이벤트, 메신저 대화 기록을 바탕으로 다음 JSON 스키마로 응답하세요:
{
  "headline": "한 줄 핵심 요약 (40자 이내, 환자 상태와 다음 분기점)",
  "current_stage": "현재 퍼널 단계 + 온도 해석",
  "key_points": ["주요 사실 3~5개 (시간순)"],
  "concerns": ["우려/주의 사항 0~3개"],
  "wins": ["긍정 신호 0~3개"]
}
중요: 한국어로 작성. 추측보다 사실 위주. 환자 개인정보는 그대로 인용.`,

  next_actions: `당신은 치과 환자의 다음 액션을 결정해주는 시니어 상담실장 AI입니다.
환자 정보, 시스템 이벤트, 메신저 대화를 보고 다음 JSON으로 응답하세요:
{
  "priority_action": {
    "title": "지금 당장 해야 할 가장 중요한 한 가지",
    "owner": "primary_owner | counselor | doctor | desk | any",
    "due": "today | this_week | this_month | flexible",
    "rationale": "왜 이게 우선인지 한 문장"
  },
  "next_actions": [
    {"title": "...", "owner": "...", "due": "...", "rationale": "..."}
  ],
  "talking_points": ["환자와 다음 만남에서 꺼낼 화제 3개"],
  "risks_if_ignored": ["방치 시 발생 가능한 위험 0~3개"]
}
한국어로 작성. 행동 가능한 구체적 액션 (예: "전화로 X 확인", "Y 견적 재발송") 위주.`,

  risk_assessment: `당신은 치과 환자 이탈/컴플레인 위험을 조기 감지하는 AI입니다.
다음 JSON으로 응답하세요:
{
  "risk_level": "low | medium | high | critical",
  "score": 0-100,
  "signals": [
    {"signal": "관찰된 신호", "severity": "low|medium|high", "evidence": "근거 인용"}
  ],
  "recommended_intervention": "권장 개입 방법",
  "estimated_dropout_probability": 0.0-1.0
}
한국어로. 추측이 아닌 실제 대화/이벤트 인용 기반.`,
}

function buildUserPrompt(ctx: NonNullable<Awaited<ReturnType<typeof loadThreadContext>>>): string {
  const t = ctx.thread
  const TEMP_LABEL: Record<string, string> = { cold:'관심(cold)', warm:'상담(warm)', hot:'치료중(hot)', patient:'치료완료(patient)', advocate:'추천팬(advocate)' }

  const card = [
    `# 환자 카드`,
    `- 이름: ${t.patient_name || '(미상)'}`,
    `- 차트번호: ${t.chart_number || '-'}`,
    `- 성별/생년월일: ${t.gender || '-'} / ${t.birth_date || '-'}`,
    `- 첫 방문: ${t.first_visit_date || '-'} / 최근 방문: ${t.last_visit_date || '-'} / 누적 방문 ${t.visit_count || 0}회`,
    `- 방문 사유: ${t.visit_reason || '-'}`,
    `- 환자 메모: ${(t.patient_memo || '-').toString().slice(0, 200)}`,
    `- 현재 온도: ${TEMP_LABEL[t.temperature] || t.temperature} / 퍼널 단계: ${t.funnel_stage}/10`,
    `- 우선순위: ${t.priority}`,
    `- 담당자: 주담당=${t.primary_owner_id || '-'} 상담=${t.counselor_id || '-'} 진료=${t.doctor_id || '-'} 데스크=${t.desk_id || '-'}`,
    `- 태그: ${t.tags || '[]'}`,
    `- 기존 요약: ${t.summary || '(없음)'}`,
  ].join('\n')

  const events = ctx.events.length === 0
    ? `(이벤트 없음)`
    : ctx.events.map((e: any) =>
        `- [${e.created_at}] ${e.event_type}: ${e.title || ''}${e.body ? ' — ' + e.body.slice(0, 200) : ''}`
      ).join('\n')

  const messages = ctx.messages.length === 0
    ? `(메시지 없음)`
    : ctx.messages.map((m: any) =>
        `- [${m.created_at}] ${m.user_name || m.user_id}: ${(m.content || '').slice(0, 300)}`
      ).join('\n')

  return [
    card,
    ``,
    `# 시스템 이벤트 (시간순, 최근 30개)`,
    events,
    ``,
    `# 메신저 대화 (시간순, 최근 50개)`,
    messages,
  ].join('\n')
}

/* ═══ 메인: AI 인사이트 생성 ═══ */
export async function generateThreadInsight(
  db: D1Database,
  opts: ThreadAIOptions
): Promise<ThreadAIResult> {
  const ctx = await loadThreadContext(db, opts.hospitalId, opts.threadId)
  if (!ctx) throw new Error('스레드를 찾을 수 없습니다')

  const messageCount = ctx.messages.length
  const eventCount = ctx.events.length

  // 캐시 lookup
  if (!opts.forceRefresh) {
    const cached = await findFreshInsight(db, opts.threadId, opts.insightType, messageCount, eventCount)
    if (cached) {
      let payload: any = null
      try { payload = JSON.parse(cached.payload) } catch { payload = { raw: cached.payload } }
      return {
        id: cached.id,
        threadId: opts.threadId,
        insightType: opts.insightType,
        payload,
        model: cached.model || 'gpt-4o-mini',
        tokenCount: cached.token_count || 0,
        cached: true,
        generatedAt: cached.created_at,
      }
    }
  }

  // API 키
  const apiKey = await getOpenAIKey(db)
  if (!apiKey) throw new Error('AI 기능이 설정되어 있지 않습니다. 관리자에게 문의하세요.')

  const systemPrompt = SYSTEM_PROMPTS[opts.insightType]
  const userPrompt = buildUserPrompt(ctx)
  const model = 'gpt-4o-mini'

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: opts.maxTokens || 700,
      temperature: 0.4,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`OpenAI API 오류 (${res.status}): ${errText.slice(0, 200)}`)
  }

  const data: any = await res.json()
  const content = data?.choices?.[0]?.message?.content || '{}'
  const tokens = (data?.usage?.prompt_tokens || 0) + (data?.usage?.completion_tokens || 0)
  const promptTokens = data?.usage?.prompt_tokens || 0
  const completionTokens = data?.usage?.completion_tokens || 0

  let payload: any
  try { payload = JSON.parse(content) }
  catch { payload = { raw: content, _parse_error: true } }

  // 저장
  const id = generateMessengerId('tai')
  const ttl = opts.cacheTtlHours ?? 24
  const expiresAt = ttl > 0 ? new Date(Date.now() + ttl * 3600 * 1000).toISOString() : null
  const contextHash = `${messageCount}:${eventCount}`

  await db.prepare(`
    INSERT INTO patient_thread_ai_insights
      (id, hospital_id, thread_id, patient_id, insight_type,
       message_count_at_gen, event_count_at_gen, context_hash,
       payload, model, token_count, created_by, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
  `).bind(
    id, opts.hospitalId, opts.threadId, ctx.thread.patient_id, opts.insightType,
    messageCount, eventCount, contextHash,
    JSON.stringify(payload), model, tokens, opts.userId, expiresAt
  ).run().catch(() => {})

  // 사용량 로그 (기존 ai_usage_log 재사용)
  await db.prepare(`
    INSERT INTO ai_usage_log (hospital_id, user_id, feature, model, prompt_tokens, completion_tokens, cached)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `).bind(
    opts.hospitalId, opts.userId, `thread_${opts.insightType}`, model,
    promptTokens, completionTokens
  ).run().catch(() => {})

  // 요약이면 patient_threads.summary 자동 갱신 (headline 만)
  if (opts.insightType === 'summary' && payload?.headline) {
    await db.prepare(
      `UPDATE patient_threads SET summary = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(String(payload.headline).slice(0, 200), opts.threadId).run().catch(() => {})
  }

  return {
    id,
    threadId: opts.threadId,
    insightType: opts.insightType,
    payload,
    model,
    tokenCount: tokens,
    cached: false,
    generatedAt: new Date().toISOString(),
  }
}

/* ═══ 최신 인사이트 조회 (cache만, 새 호출 없이) ═══ */
export async function getLatestInsight(
  db: D1Database,
  hospitalId: string,
  threadId: string,
  insightType: ThreadInsightType
): Promise<ThreadAIResult | null> {
  const row = await db.prepare(`
    SELECT id, payload, model, token_count, created_at,
           message_count_at_gen, event_count_at_gen
    FROM patient_thread_ai_insights
    WHERE hospital_id = ? AND thread_id = ? AND insight_type = ?
    ORDER BY created_at DESC LIMIT 1
  `).bind(hospitalId, threadId, insightType).first<any>().catch(() => null)

  if (!row) return null

  let payload: any = null
  try { payload = JSON.parse(row.payload) } catch { payload = { raw: row.payload } }

  return {
    id: row.id,
    threadId,
    insightType,
    payload,
    model: row.model || 'gpt-4o-mini',
    tokenCount: row.token_count || 0,
    cached: true,
    generatedAt: row.created_at,
  }
}
