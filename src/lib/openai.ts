/* ═══════════════════════════════════════════════════════════
 * OpenAI Helper (v5.4.0)
 *  - DB에 저장된 키 사용 (app_settings.openai_api_key)
 *  - 24h 캐시 + 사용량 로그 자동 처리
 *  - GPT-5.5 → GPT-4o-mini 폴백
 * ═══════════════════════════════════════════════════════════ */

export interface AIInsightOptions {
  hospitalId: string
  userId?: string | null
  feature: string                     // 'consult_insight' | 'ltv_analysis' | 'funnel_advice'
  cacheKey: string                    // 캐시 식별자
  cacheTtlHours?: number              // 기본 24h
  systemPrompt: string
  userPrompt: string
  model?: string                      // 기본 'gpt-4o-mini'
  maxTokens?: number                  // 기본 800
  temperature?: number                // 기본 0.4
  forceRefresh?: boolean              // true이면 캐시 무시하고 새로 호출
}

export interface AIInsightResult {
  payload: any
  cached: boolean
  model: string
  tokenCount: number
}

/** OpenAI API 키 조회 (app_settings 우선) */
export async function getOpenAIKey(db: D1Database): Promise<string | null> {
  const row = await db.prepare(
    `SELECT value FROM app_settings WHERE key='openai_api_key' LIMIT 1`
  ).first<any>().catch(() => null)
  return row?.value || null
}

/**
 * AI 호출 with 캐시 + 로깅
 *  - 캐시 히트 → DB에서 바로 반환
 *  - 캐시 미스 → OpenAI 호출 → 결과 캐싱 + usage 로그 기록
 */
export async function aiInsightWithCache(
  db: D1Database,
  opts: AIInsightOptions
): Promise<AIInsightResult> {
  const model = opts.model || 'gpt-4o-mini'
  const ttl = opts.cacheTtlHours || 24

  // 1. 캐시 확인 (forceRefresh이면 스킵)
  const cached = opts.forceRefresh ? null : await db.prepare(
    `SELECT payload, model, token_count FROM ai_insights_cache
     WHERE hospital_id=? AND cache_key=? AND expires_at > datetime('now')
     ORDER BY created_at DESC LIMIT 1`
  ).bind(opts.hospitalId, opts.cacheKey).first<any>().catch(() => null)

  if (cached) {
    // 캐시 히트 로그
    await db.prepare(
      `INSERT INTO ai_usage_log (hospital_id, user_id, feature, model, cached) VALUES (?,?,?,?,1)`
    ).bind(opts.hospitalId, opts.userId || null, opts.feature, cached.model || model).run().catch(() => {})

    try {
      return {
        payload: JSON.parse(cached.payload),
        cached: true,
        model: cached.model || model,
        tokenCount: cached.token_count || 0,
      }
    } catch {
      // 캐시 파싱 실패 시 무시하고 새로 호출
    }
  }

  // 2. API 키 확보
  const apiKey = await getOpenAIKey(db)
  if (!apiKey) {
    throw new Error('AI 기능이 설정되어 있지 않습니다. 관리자에게 문의하세요.')
  }

  // 3. OpenAI 호출 (JSON 모드)
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user',   content: opts.userPrompt   },
      ],
      max_tokens: opts.maxTokens || 800,
      temperature: opts.temperature ?? 0.4,
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

  // 4. 캐시 저장
  const expiresAt = new Date(Date.now() + ttl * 3600 * 1000).toISOString()
  await db.prepare(
    `INSERT INTO ai_insights_cache (hospital_id, cache_key, insight_type, payload, model, token_count, expires_at)
     VALUES (?,?,?,?,?,?,?)`
  ).bind(
    opts.hospitalId, opts.cacheKey, opts.feature,
    JSON.stringify(payload), model, tokens, expiresAt
  ).run().catch(() => {})

  // 5. 사용량 로그
  await db.prepare(
    `INSERT INTO ai_usage_log (hospital_id, user_id, feature, model, prompt_tokens, completion_tokens, cached)
     VALUES (?,?,?,?,?,?,0)`
  ).bind(
    opts.hospitalId, opts.userId || null, opts.feature, model,
    promptTokens, completionTokens
  ).run().catch(() => {})

  return { payload, cached: false, model, tokenCount: tokens }
}

/**
 * 만료된 캐시 청소 (1주일 이상 된 expired 엔트리 삭제)
 * 일별 first hit 때 호출하면 됨
 */
export async function purgeExpiredAICache(db: D1Database): Promise<number> {
  const r = await db.prepare(
    `DELETE FROM ai_insights_cache WHERE expires_at < datetime('now', '-7 days')`
  ).run().catch(() => ({ meta: { changes: 0 } }))
  return r.meta?.changes || 0
}
