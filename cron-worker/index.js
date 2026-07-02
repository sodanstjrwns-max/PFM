/**
 * PFM Cron Worker — 5분마다 프로덕션 /api/cron/tick 호출
 * 예약 메시지 발송 + 에스컬레이션 스캔을 접속자 없이도 보장.
 * CRON_SECRET 은 worker secret 으로 저장 (코드에 노출 없음).
 */
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(tick(env));
  },
  // 수동 트리거/헬스체크용 (GET /: 상태만, 시크릿 불필요)
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/run' && request.method === 'POST') {
      const auth = request.headers.get('Authorization');
      if (auth !== `Bearer ${env.CRON_SECRET}`) {
        return new Response('unauthorized', { status: 401 });
      }
      const result = await tick(env);
      return Response.json(result);
    }
    return Response.json({ service: 'pfm-cron', schedule: '*/5 * * * *' });
  },
};

async function tick(env) {
  const target = env.TARGET_URL || 'https://patient-funnel-manager.pages.dev/api/cron/tick';
  try {
    const res = await fetch(target, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.CRON_SECRET}` },
      signal: AbortSignal.timeout(25000),
    });
    const body = await res.text();
    console.log(`[pfm-cron] ${res.status} ${body.slice(0, 300)}`);
    return { status: res.status, body: body.slice(0, 300) };
  } catch (e) {
    console.error(`[pfm-cron] failed: ${e.message}`);
    return { error: e.message };
  }
}
