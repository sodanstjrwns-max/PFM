/* ═══ v5.10.0 이메일 발송 (Resend REST API) ═══
 * Cloudflare Workers 에서는 SMTP 불가 → Resend HTTPS API 사용.
 * RESEND_API_KEY 미설정 시 { ok:false, reason:'not_configured' } — 기능은 안전하게 배포 가능.
 *
 * 설정 방법:
 *   1. https://resend.com 가입 → API Key 발급 (무료 3,000통/월)
 *   2. 도메인 인증 (patientfunnel.kr) 또는 onboarding@resend.dev 로 테스트
 *   3. npx wrangler pages secret put RESEND_API_KEY --project-name patient-funnel-manager
 *   4. (선택) npx wrangler pages secret put EMAIL_FROM  — 기본값: noreply@patientfunnel.kr
 */

export type EmailResult = { ok: boolean; reason?: string; id?: string }

export async function sendEmail(
  env: { RESEND_API_KEY?: string; EMAIL_FROM?: string },
  to: string,
  subject: string,
  html: string,
): Promise<EmailResult> {
  if (!env.RESEND_API_KEY) return { ok: false, reason: 'not_configured' }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM || 'Patient Funnel <noreply@patientfunnel.kr>',
        to: [to],
        subject,
        html,
      }),
    })
    const data: any = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, reason: (data?.message || `HTTP ${res.status}`).slice(0, 200) }
    return { ok: true, id: data?.id }
  } catch (e: any) {
    return { ok: false, reason: (e?.message || 'network error').slice(0, 200) }
  }
}

/* ─── 비밀번호 재설정 메일 템플릿 ─── */
export function passwordResetEmailHTML(name: string, resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="ko"><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)">
      <tr><td style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:28px 32px">
        <div style="color:#fff;font-size:18px;font-weight:800">Patient Funnel Manager</div>
      </td></tr>
      <tr><td style="padding:32px">
        <h2 style="margin:0 0 12px;font-size:20px;color:#0f172a">비밀번호 재설정 요청</h2>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#475569">
          ${name ? name + '님, ' : ''}비밀번호 재설정 요청을 받았습니다.<br>
          아래 버튼을 눌러 새 비밀번호를 설정하세요. <strong>링크는 30분간 유효</strong>합니다.
        </p>
        <a href="${resetUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px">새 비밀번호 설정하기</a>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#94a3b8">
          본인이 요청하지 않았다면 이 메일을 무시하세요 — 비밀번호는 변경되지 않습니다.<br>
          버튼이 동작하지 않으면 다음 주소를 복사해 브라우저에 붙여넣으세요:<br>
          <span style="word-break:break-all;color:#64748b">${resetUrl}</span>
        </p>
      </td></tr>
      <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
        <p style="margin:0;font-size:11px;color:#94a3b8">© Patient Funnel · 본 메일은 발신 전용입니다</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}
