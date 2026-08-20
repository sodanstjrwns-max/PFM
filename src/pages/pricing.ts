/* ═══ v5.9.0 공개 페이지: 요금제 랜딩 + 법적 문서 (약관/개인정보/SLA) ═══
 * CSP 준수: 인라인 <script> 불가 → 토글 로직은 /static/pricing.js 로 분리.
 * 스타일은 style-src 'unsafe-inline' 허용이므로 인라인 <style> 사용.
 */

const BASE_HEAD = `
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%230f766e'/><text x='16' y='22' text-anchor='middle' fill='white' font-size='14' font-weight='bold' font-family='Arial'>PF</text></svg>">
<style>
  :root { --teal:#0f766e; --teal-dark:#115e59; --ink:#0f172a; --sub:#64748b; --bg:#f8fafc; --card:#ffffff; --border:#e2e8f0; --gold:#d97706; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif; background:var(--bg); color:var(--ink); line-height:1.6; }
  .container { max-width:1080px; margin:0 auto; padding:0 20px; }
  header.site { background:var(--card); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:10; }
  header.site .container { display:flex; align-items:center; justify-content:space-between; height:64px; }
  .logo { font-weight:800; font-size:18px; color:var(--teal); text-decoration:none; display:flex; align-items:center; gap:8px; }
  .logo-badge { background:var(--teal); color:#fff; border-radius:6px; padding:2px 7px; font-size:13px; }
  .nav-cta { background:var(--teal); color:#fff; text-decoration:none; padding:9px 18px; border-radius:8px; font-weight:600; font-size:14px; }
  .nav-cta:hover { background:var(--teal-dark); }
  footer.site { border-top:1px solid var(--border); background:var(--card); margin-top:80px; padding:32px 0; font-size:13px; color:var(--sub); }
  footer.site .container { display:flex; flex-wrap:wrap; gap:16px; justify-content:space-between; align-items:center; }
  footer.site a { color:var(--sub); text-decoration:none; margin-right:16px; }
  footer.site a:hover { color:var(--teal); }
</style>`

/* 사업자정보 푸터 — 사업자등록증(2026-07-14) · 통신판매업신고증(제2024-서울강남-03817호) 기준.
 * ⚠️ 통신판매업신고 상호가 「덴탈퍼널」로 남아있어 상호 불일치 상태. 정부24 변경신고(상호변경) 완료 전까지는
 * 이 신고번호를 그대로 게시하되, 문의 시 변경신고 접수증으로 소명한다. */
const BIZ_FOOTER = `
  <div class="container" style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);font-size:11.5px;line-height:1.7;color:#94a3b8;display:block">
    상호: 페이션트퍼널 · 대표: 문석준 · 사업자등록번호: 469-01-03014 · 통신판매업신고: 제2024-서울강남-03817호<br>
    주소: 서울특별시 강남구 영동대로 602, 6층 z208 (삼성동, 삼성동 미켈란 107) · 연락처: 010-5832-3372 · 이메일: sodanstjrwns@naver.com<br>
    호스팅: Cloudflare, Inc. · <a href="/legal/terms" style="color:#94a3b8;text-decoration:underline">이용약관</a> · <a href="/legal/privacy" style="color:#94a3b8;text-decoration:underline">개인정보처리방침</a> · <a href="/legal/refund" style="color:#94a3b8;text-decoration:underline">환불규정</a>
  </div>`

/* guide.ts 등 다른 공개 페이지에서도 동일한 사업자정보 푸터를 재사용하기 위한 export */
export function getBizFooterHTML(): string {
  return BIZ_FOOTER
}

export function getPricingHTML(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
${BASE_HEAD}
<title>요금제 - Patient Funnel OS | 환자를 팬으로 만드는 병원경영 시스템</title>
<meta name="description" content="Patient Funnel OS 요금제. 14일 무료 체험, 월 19만원부터. 6,000명 대표원장이 검증한 10단계 환자 퍼널 시스템.">
<meta property="og:title" content="Patient Funnel OS 요금제 — 14일 무료 체험">
<meta property="og:description" content="환자 퍼널 CRM + HR + 리뷰관리 올인원. 월 6천만에서 연 120억까지의 노하우를 담은 시스템.">
<style>
  .hero { text-align:center; padding:64px 0 40px; }
  .hero h1 { font-size:36px; font-weight:800; letter-spacing:-0.5px; }
  .hero h1 .accent { color:var(--teal); }
  .hero p.sub { color:var(--sub); font-size:17px; margin-top:12px; }
  .hero .proof { display:flex; gap:28px; justify-content:center; margin-top:28px; flex-wrap:wrap; }
  .proof-item { text-align:center; }
  .proof-item b { display:block; font-size:26px; color:var(--teal); font-weight:800; }
  .proof-item span { font-size:13px; color:var(--sub); }
  .billing-toggle { display:flex; justify-content:center; align-items:center; gap:12px; margin:36px 0 8px; }
  .billing-toggle button { border:1px solid var(--border); background:var(--card); padding:8px 20px; border-radius:20px; font-size:14px; font-weight:600; cursor:pointer; color:var(--sub); }
  .billing-toggle button.active { background:var(--teal); border-color:var(--teal); color:#fff; }
  .save-badge { background:#fef3c7; color:var(--gold); font-size:12px; font-weight:700; padding:3px 10px; border-radius:12px; }
  .plans { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:24px; margin-top:28px; }
  .plan { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:32px 28px; position:relative; display:flex; flex-direction:column; }
  .plan.featured { border:2px solid var(--teal); box-shadow:0 8px 30px rgba(15,118,110,.12); }
  .plan .flag { position:absolute; top:-13px; left:50%; transform:translateX(-50%); background:var(--teal); color:#fff; font-size:12px; font-weight:700; padding:4px 14px; border-radius:14px; white-space:nowrap; }
  .plan h3 { font-size:20px; font-weight:800; }
  .plan .target { color:var(--sub); font-size:13px; margin-top:4px; }
  .plan .price { margin:20px 0 4px; }
  .plan .price b { font-size:34px; font-weight:800; letter-spacing:-1px; }
  .plan .price span { color:var(--sub); font-size:14px; }
  .plan .price-note { font-size:12px; color:var(--gold); font-weight:600; min-height:18px; }
  .plan ul { list-style:none; margin:20px 0 24px; flex:1; }
  .plan li { padding:7px 0; font-size:14px; display:flex; gap:8px; align-items:flex-start; }
  .plan li::before { content:"✓"; color:var(--teal); font-weight:800; flex-shrink:0; }
  .plan .cta { display:block; text-align:center; padding:13px; border-radius:10px; font-weight:700; text-decoration:none; font-size:15px; }
  .plan .cta.primary { background:var(--teal); color:#fff; }
  .plan .cta.primary:hover { background:var(--teal-dark); }
  .plan .cta.ghost { border:1.5px solid var(--teal); color:var(--teal); }
  .trial-note { text-align:center; color:var(--sub); font-size:14px; margin-top:24px; }
  .trial-note b { color:var(--teal); }
  section.faq { margin-top:72px; }
  section.faq h2 { text-align:center; font-size:26px; font-weight:800; margin-bottom:28px; }
  .faq-item { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:20px 24px; margin-bottom:12px; }
  .faq-item h4 { font-size:15px; font-weight:700; margin-bottom:6px; }
  .faq-item p { font-size:14px; color:var(--sub); }
  .founding-banner { margin-top:56px; background:linear-gradient(135deg,#0f766e,#115e59); border-radius:16px; padding:36px 32px; color:#fff; text-align:center; }
  .founding-banner h3 { font-size:22px; font-weight:800; }
  .founding-banner p { opacity:.9; margin-top:8px; font-size:15px; }
  .founding-banner a { display:inline-block; margin-top:18px; background:#fff; color:var(--teal); padding:11px 26px; border-radius:10px; font-weight:800; text-decoration:none; }
</style>
</head>
<body>
<header class="site">
  <div class="container">
    <a class="logo" href="/"><span class="logo-badge">PF</span> Patient Funnel OS</a>
    <div style="display:flex;gap:10px;align-items:center">
      <a href="/guide" style="color:var(--sub);text-decoration:none;font-size:14px;font-weight:600">사용법 보기</a>
      <a class="nav-cta" href="/?mode=register">14일 무료 체험 시작</a>
    </div>
  </div>
</header>

<main class="container">
  <section class="hero" id="pricing-hero">
    <h1>병원 성장의 <span class="accent">전 과정</span>을 하나로</h1>
    <p class="sub">환자가 병원을 알게 되는 순간부터 지인에게 소개하기까지 —<br>10단계 퍼널을 설계하는 병원경영 통합 시스템</p>
    <div class="proof">
      <div class="proof-item"><b>6,000+</b><span>교육 이수 대표원장</span></div>
      <div class="proof-item"><b>2.1배</b><span>평균 매출 성장*</span></div>
      <div class="proof-item"><b>40%</b><span>광고비 절감*</span></div>
      <div class="proof-item"><b>62%</b><span>상담 전환율*</span></div>
    </div>
  </section>

  <div class="billing-toggle" id="billing-toggle">
    <button type="button" id="btnMonthly" class="active">월간 결제</button>
    <button type="button" id="btnYearly">연간 결제</button>
    <span class="save-badge">연납 시 2개월 무료</span>
  </div>

  <section class="plans" id="plans-grid">
    <article class="plan" id="plan-starter">
      <h3>Starter</h3>
      <p class="target">직원 15인 이하 · 개원 초기 병원</p>
      <div class="price"><b data-monthly="19" data-yearly="15.8">19</b><span>만원 / 월</span></div>
      <p class="price-note" data-yearly-note="연 190만원 선결제 (2개월 무료, 매월 15.8만 상당)"></p>
      <ul>
        <li>환자 퍼널 CRM (10단계 여정)</li>
        <li>경영 대시보드 + KPI</li>
        <li>리뷰 통합 관리</li>
        <li>콜/상담 기록</li>
        <li>일일 브리핑</li>
      </ul>
      <a class="cta ghost" href="/?mode=register">무료로 시작하기</a>
    </article>

    <article class="plan featured" id="plan-growth">
      <span class="flag">⭐ 가장 인기</span>
      <h3>Growth</h3>
      <p class="target">직원 16~30인 · 성장기 병원</p>
      <div class="price"><b data-monthly="39" data-yearly="32.5">39</b><span>만원 / 월</span></div>
      <p class="price-note" data-yearly-note="연 390만원 선결제 (2개월 무료, 매월 32.5만 상당)"></p>
      <ul>
        <li>Starter 전 기능</li>
        <li>HR / 근태 / 연차 관리</li>
        <li>회의 · 피드백 시스템</li>
        <li>원내 메신저 + 환자 채팅</li>
        <li>AI 인사이트</li>
        <li>감사 로그 (컴플라이언스)</li>
        <li>페이션트 인덱스</li>
      </ul>
      <a class="cta primary" href="/?mode=register">14일 무료 체험</a>
    </article>

    <article class="plan" id="plan-enterprise">
      <h3>Enterprise</h3>
      <p class="target">다지점 · 직원 30인 이상</p>
      <div class="price"><b data-monthly="69" data-yearly="57.5">69</b><span>만원~ / 월</span></div>
      <p class="price-note" data-yearly-note="연 690만원 선결제 (2개월 무료, 매월 57.5만 상당)"></p>
      <ul>
        <li>Growth 전 기능</li>
        <li>다지점 통합 관리</li>
        <li>전담 온보딩 매니저</li>
        <li>커스텀 기능 개발</li>
        <li>SLA 99.9% 보장</li>
        <li>우선 기술 지원</li>
      </ul>
      <a class="cta ghost" href="mailto:sodanstjrwns@naver.com?subject=Enterprise%20도입%20문의">도입 문의</a>
    </article>
  </section>

  <p class="trial-note">모든 플랜 <b>14일 무료 체험</b> · 카드 등록 없이 시작 · 체험 중 언제든 해지 가능</p>

  <section class="founding-banner" id="founding-banner">
    <h3>🎉 페이션트 퍼널 교육 수강생이신가요?</h3>
    <p>수강생 전용 파운딩 멤버 혜택이 준비되어 있습니다. 교육 이수 이메일로 문의해주세요.</p>
    <a href="mailto:sodanstjrwns@naver.com?subject=수강생%20파운딩%20멤버%20문의">수강생 혜택 확인하기</a>
  </section>

  <section class="faq" id="pricing-faq">
    <h2>자주 묻는 질문</h2>
    <div class="faq-item"><h4>무료 체험 기간이 끝나면 어떻게 되나요?</h4><p>체험 종료 후 플랜을 선택하시면 데이터가 그대로 유지된 채 계속 이용하실 수 있습니다. 선택하지 않으셔도 데이터는 30일간 안전하게 보관됩니다.</p></div>
    <div class="faq-item"><h4>기존 차트 프로그램(덴트웹, 원클릭 등)과 함께 쓸 수 있나요?</h4><p>네. Patient Funnel OS는 보험청구/전자차트를 대체하는 것이 아니라, 그 위에 '환자 여정 설계와 경영 관리'를 얹는 시스템입니다. 기존 프로그램과 병행 사용을 전제로 설계되었습니다.</p></div>
    <div class="faq-item"><h4>직원 수가 플랜 기준을 넘으면요?</h4><p>초과 시점에 상위 플랜 안내를 드리며, 즉시 차단되지 않습니다. 월 중 변경 시 일할 계산으로 정산됩니다.</p></div>
    <div class="faq-item"><h4>환자 데이터는 안전한가요?</h4><p>모든 데이터는 병원별로 완전히 분리 저장되며, 전 구간 HTTPS 암호화, 역할 기반 접근 제어, 전 기능 감사 로그를 갖추고 있습니다. 자세한 내용은 <a href="/legal/privacy">개인정보 처리방침</a>을 확인하세요.</p></div>
    <div class="faq-item"><h4>해지하면 위약금이 있나요?</h4><p>월간 결제는 위약금이 없으며 언제든 해지 가능합니다. 해지 후에도 현재 결제 주기 종료일까지 이용하실 수 있습니다. 자세한 조건은 <a href="/legal/refund">환불규정</a>을 확인하세요.</p></div>
  </section>
</main>

<footer class="site">
  <div class="container">
    <div>© 2026 Patient Funnel OS. 서울비디치과 · 페이션트 퍼널</div>
    <div>
      <a href="/guide">서비스 소개·사용법</a>
      <a href="/legal/terms">이용약관</a>
      <a href="/legal/privacy">개인정보 처리방침</a>
      <a href="/legal/refund">환불규정</a>
      <a href="/legal/sla">서비스 수준 협약(SLA)</a>
    </div>
  </div>
${BIZ_FOOTER}
</footer>
<script src="/static/pricing.js"></script>
</body>
</html>`
}

/* ─── 법적 문서 ─── */
const LEGAL_DOCS: Record<'privacy' | 'terms' | 'sla' | 'refund', { title: string; body: string }> = {
  privacy: {
    title: '개인정보 처리방침',
    body: `
<h2>Patient Funnel OS 개인정보처리방침</h2>
<p class="updated">시행일: 2026년 8월 20일</p>

<p>페이션트퍼널(이하 "회사")은 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고 관련 고충을 신속히 처리하기 위해 다음과 같이 개인정보처리방침을 수립·공개합니다.</p>

<h3>1. 수집하는 개인정보 항목과 방법</h3>
<ul>
<li>회원가입·서비스 이용: 이름, 이메일, 휴대폰번호, 소속 기관명(병·의원명), 비밀번호(암호화 저장)</li>
<li>결제: 결제 관련 정보는 결제대행사(토스페이먼츠㈜)가 직접 수집·처리하며, 회사는 결제 결과(승인 여부, 금액, 주문번호)만 보관합니다.</li>
<li>자동 수집: 접속 IP, 쿠키, 서비스 이용 기록, 기기 정보</li>
</ul>

<h3>2. 개인정보의 처리 목적</h3>
<ul>
<li>회원 식별, 서비스 제공 및 운영, 요금 결제·정산</li>
<li>고객 문의 응대, 공지사항 전달</li>
<li>서비스 개선을 위한 통계 분석(비식별 처리)</li>
</ul>

<h3>3. 보유 및 이용 기간</h3>
<p>회원 탈퇴 시 지체 없이 파기. 단, 관련 법령에 따라 다음 기간 보관:</p>
<ul>
<li>계약·청약철회·대금결제·재화 공급 기록: 5년 (전자상거래법)</li>
<li>소비자 불만·분쟁 처리 기록: 3년 (전자상거래법)</li>
<li>접속 기록: 3개월 (통신비밀보호법)</li>
</ul>

<h3>4. 개인정보의 처리 위탁</h3>
<table>
<tr><th>수탁자</th><th>위탁 업무</th></tr>
<tr><td>토스페이먼츠㈜</td><td>결제 처리 및 결제대행</td></tr>
<tr><td>Cloudflare, Inc.</td><td>서비스 인프라 운영(호스팅, 데이터 보관) — 국외(미국 등 Cloudflare 데이터센터 소재지), 서비스 이용 시점에 전송, 인프라 운영 목적, 회원 탈퇴 시까지 보관</td></tr>
</table>

<h3>5. 정보주체의 권리</h3>
<p>이용자는 언제든지 개인정보 열람·정정·삭제·처리정지를 요구할 수 있습니다. 요청은 아래 개인정보 보호책임자에게 서면, 이메일로 하실 수 있으며 회사는 지체 없이 조치합니다.</p>

<h3>6. 개인정보의 파기</h3>
<p>보유 기간 경과 또는 처리 목적 달성 시 지체 없이 파기합니다. 전자 파일은 복구 불가능한 방법으로 삭제하고, 출력물은 분쇄·소각합니다.</p>

<h3>7. 안전성 확보 조치</h3>
<p>비밀번호 등 주요 정보의 암호화 저장, 전 구간 HTTPS 통신, 접근 권한 관리, 접속 기록 보관·점검을 시행합니다.</p>

<h3>8. 개인정보 보호책임자</h3>
<p>성명: 문석준 (대표)<br>이메일: sodanstjrwns@naver.com<br>연락처: 010-5832-3372</p>

<p>기타 개인정보 침해 신고·상담: 개인정보침해신고센터 (privacy.kisa.or.kr / 국번없이 118)</p>

<p>이 방침은 2026년 8월 20일부터 적용됩니다.</p>`,
  },
  terms: {
    title: '이용약관',
    body: `
<h2>Patient Funnel OS 이용약관</h2>
<p class="updated">시행일: 2026년 8월 20일</p>

<h3>제1조 (목적)</h3>
<p>이 약관은 페이션트퍼널(이하 "회사")이 제공하는 Patient Funnel OS 및 관련 제반 서비스(이하 "서비스")의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>

<h3>제2조 (정의)</h3>
<ol>
<li>"서비스"란 회사가 웹사이트를 통해 제공하는 병·의원 경영 지원 소프트웨어 및 부가 기능 일체를 말합니다.</li>
<li>"회원"이란 이 약관에 동의하고 회사와 이용계약을 체결한 자를 말합니다.</li>
<li>"구독"이란 회원이 요금제를 선택하고 정기 결제를 통해 서비스를 이용하는 계약 형태를 말합니다.</li>
</ol>

<h3>제3조 (약관의 게시와 개정)</h3>
<ol>
<li>회사는 이 약관을 서비스 초기 화면 또는 연결 화면에 게시합니다.</li>
<li>회사는 관련 법령을 위배하지 않는 범위에서 약관을 개정할 수 있으며, 개정 시 적용일자 7일 전(회원에게 불리한 변경은 30일 전)부터 공지합니다.</li>
</ol>

<h3>제4조 (이용계약의 체결)</h3>
<ol>
<li>이용계약은 가입 신청자가 약관에 동의하고 회사가 이를 승낙함으로써 체결됩니다.</li>
<li>회사는 타인 명의 도용, 허위 정보 기재 등의 경우 승낙을 거부하거나 사후에 계약을 해지할 수 있습니다.</li>
</ol>

<h3>제5조 (요금제·결제·갱신)</h3>
<ol>
<li>서비스 요금제와 가격은 서비스 내 요금 안내 페이지에 게시하며, 부가가치세는 별도입니다.</li>
<li>구독 요금은 선택한 주기(월간/연간)에 따라 등록된 결제수단으로 자동 결제됩니다.</li>
<li>구독은 해지하지 않는 한 동일 조건으로 자동 갱신됩니다. 가격이 변경되는 경우 갱신일 30일 전까지 고지합니다.</li>
<li>무료 체험 기간(14일)에는 결제수단 등록 없이 이용할 수 있으며, 체험 종료 후 유료 전환은 회원의 명시적 신청으로만 이루어집니다.</li>
</ol>

<h3>제6조 (구독 해지와 환불)</h3>
<ol>
<li>회원은 언제든지 서비스 내 설정 또는 고객센터를 통해 구독을 해지할 수 있으며, 위약금은 없습니다.</li>
<li>해지 시 이미 결제된 이용기간 종료일까지 서비스를 이용할 수 있습니다.</li>
<li>환불은 별도 <a href="/legal/refund">환불규정</a>에 따릅니다.</li>
</ol>

<h3>제7조 (회사의 의무)</h3>
<ol>
<li>회사는 안정적인 서비스 제공을 위해 노력하며, 설비 장애 또는 데이터 멸실 시 지체 없이 복구합니다.</li>
<li>회사는 회원의 개인정보를 <a href="/legal/privacy">개인정보처리방침</a>에 따라 보호합니다.</li>
<li>정기 점검 등 서비스 중단이 필요한 경우 사전에 공지합니다.</li>
</ol>

<h3>제8조 (회원의 의무)</h3>
<ol>
<li>회원은 서비스 이용 시 관련 법령(의료법, 개인정보 보호법 등)을 준수해야 하며, 특히 환자 정보 등 제3자의 개인정보를 서비스에 입력·저장하는 경우 해당 정보 처리에 필요한 적법한 근거를 갖추어야 합니다.</li>
<li>회원은 계정 정보를 제3자에게 공유·양도할 수 없습니다.</li>
<li>회원은 서비스를 역설계, 크롤링, 재판매하거나 시스템에 부하를 일으키는 행위를 해서는 안 됩니다.</li>
</ol>

<h3>제9조 (데이터의 귀속과 보관)</h3>
<ol>
<li>회원이 서비스에 입력한 데이터의 권리는 회원에게 있습니다.</li>
<li>계약 종료 후 30일간 데이터를 보관하며, 이 기간 내 회원의 요청 시 내보내기를 제공합니다. 기간 경과 후 데이터는 파기됩니다.</li>
</ol>

<h3>제10조 (책임의 제한)</h3>
<ol>
<li>회사는 천재지변, 통신사업자의 귀책 등 불가항력으로 인한 손해에 대해 책임지지 않습니다.</li>
<li>서비스가 제공하는 분석·예측·추천 결과는 경영 참고 자료이며, 이에 근거한 의사결정의 최종 책임은 회원에게 있습니다.</li>
<li>회사의 배상 책임은 회원이 최근 12개월간 회사에 지급한 이용요금 총액을 한도로 합니다.</li>
</ol>

<h3>제11조 (분쟁 해결)</h3>
<p>이 약관은 대한민국 법률에 따라 해석되며, 분쟁에 관한 소송은 민사소송법상 관할법원에 제기합니다.</p>

<p>부칙: 이 약관은 2026년 8월 20일부터 시행합니다.</p>`,
  },
  sla: {
    title: '서비스 수준 협약 (SLA)',
    body: `
<h2>서비스 수준 협약 (SLA)</h2>
<p class="updated">시행일: 2026년 7월 3일 · 버전 1.0</p>

<h3>1. 가용성 목표</h3>
<table>
<tr><th>플랜</th><th>월 가용성 목표</th><th>월 최대 허용 중단</th></tr>
<tr><td>Starter / Growth</td><td>99.5%</td><td>약 3.6시간</td></tr>
<tr><td>Enterprise</td><td>99.9%</td><td>약 43분</td></tr>
</table>
<p>서비스는 Cloudflare 글로벌 엣지 네트워크(300+ 데이터센터)에서 운영되어 단일 서버 장애의 영향을 받지 않는 구조입니다.</p>

<h3>2. 가용성 미달 시 크레딧</h3>
<table>
<tr><th>월 가용성</th><th>크레딧 (해당 월 요금 대비)</th></tr>
<tr><td>목표 미달 ~ 99.0%</td><td>10%</td></tr>
<tr><td>99.0% 미만 ~ 95.0%</td><td>25%</td></tr>
<tr><td>95.0% 미만</td><td>50%</td></tr>
</table>
<p>크레딧은 다음 결제 주기 요금에서 차감되며, 고객이 장애 발생 후 30일 이내 신청해야 합니다.</p>

<h3>3. 제외 사항</h3>
<ul>
<li>사전 공지된 정기 점검 (월 최대 2시간, 최소 48시간 전 공지)</li>
<li>고객 측 네트워크/기기 장애</li>
<li>불가항력 (천재지변, 국가적 통신 장애 등)</li>
</ul>

<h3>4. 기술 지원</h3>
<table>
<tr><th>구분</th><th>Starter</th><th>Growth</th><th>Enterprise</th></tr>
<tr><td>지원 채널</td><td>이메일</td><td>이메일 + 채팅</td><td>전담 매니저</td></tr>
<tr><td>최초 응답 (영업일)</td><td>24시간 이내</td><td>8시간 이내</td><td>4시간 이내</td></tr>
<tr><td>장애(전면 중단) 응답</td><td>4시간 이내</td><td>2시간 이내</td><td>1시간 이내</td></tr>
</table>

<h3>5. 데이터 보호</h3>
<ul>
<li>데이터는 분산 저장되며 시점 복구(Point-in-Time Recovery)를 지원하는 인프라에서 운영됩니다.</li>
<li>계약 종료 시 30일의 데이터 보관 유예 기간을 제공하며, 이 기간 내 데이터 내보내기가 가능합니다.</li>
<li>목표 복구 시점(RPO): 24시간 이내 · 목표 복구 시간(RTO): 12시간 이내</li>
</ul>

<h3>6. 문의</h3>
<p>SLA 관련 문의 및 크레딧 신청: sodanstjrwns@naver.com</p>`,
  },
  refund: {
    title: '환불규정',
    body: `
<h2>Patient Funnel OS 환불규정</h2>
<p class="updated">시행일: 2026년 8월 20일</p>

<h3>1. 구독 서비스 (월간·연간 결제)</h3>
<ol>
<li>결제일로부터 <b>7일 이내</b>이고 서비스를 <b>실질적으로 이용하지 않은 경우</b>(데이터 입력·분석 실행 등 핵심 기능 미사용): 전액 환불</li>
<li>그 외의 경우: 총 결제금액에서 이용 일수에 해당하는 금액을 일할 계산으로 공제한 잔액을 환불</li>
<li>연간 결제(2개월 무료 혜택 적용)의 중도 해지 시: 무료 혜택을 제외한 월간 정가 기준으로 이용분을 계산하여 공제 후 환불</li>
<li>월간 구독의 단순 해지는 환불이 아닌 갱신 중단으로 처리되며, 결제된 이용기간 종료일까지 이용 가능합니다. 위약금은 없습니다.</li>
</ol>

<h3>2. 환불 절차</h3>
<ol>
<li>고객센터(이메일 sodanstjrwns@naver.com / 010-5832-3372)로 환불 요청</li>
<li>회사는 요청일로부터 3영업일 이내에 환불 가능 여부와 금액을 안내</li>
<li>환불은 원 결제수단으로 진행되며, 카드 결제 취소는 카드사 사정에 따라 3~7영업일이 소요될 수 있습니다.</li>
</ol>

<h3>3. 기타</h3>
<ul>
<li>이 규정에서 정하지 않은 사항은 「전자상거래 등에서의 소비자보호에 관한 법률」 등 관련 법령에 따릅니다.</li>
<li>회사의 귀책 사유(서비스 장애 등)로 정상 이용이 불가했던 기간은 이용 일수 계산에서 제외합니다.</li>
</ul>

<p>이 규정은 2026년 8월 20일부터 적용됩니다.</p>`,
  },
}

export function getLegalHTML(doc: 'privacy' | 'terms' | 'sla' | 'refund'): string {
  const d = LEGAL_DOCS[doc]
  return `<!DOCTYPE html>
<html lang="ko">
<head>
${BASE_HEAD}
<title>${d.title} - Patient Funnel OS</title>
<meta name="robots" content="noindex">
<style>
  main.legal { max-width:760px; margin:0 auto; padding:48px 20px 80px; }
  main.legal h2 { font-size:28px; font-weight:800; margin-bottom:4px; }
  main.legal .updated { color:var(--sub); font-size:13px; margin-bottom:32px; }
  main.legal h3 { font-size:17px; font-weight:700; margin:28px 0 10px; color:var(--teal-dark); }
  main.legal p, main.legal li { font-size:14px; color:#334155; }
  main.legal ul, main.legal ol { padding-left:22px; margin:8px 0; }
  main.legal li { margin:5px 0; }
  main.legal table { width:100%; border-collapse:collapse; margin:12px 0; font-size:13px; }
  main.legal th, main.legal td { border:1px solid var(--border); padding:8px 12px; text-align:left; }
  main.legal th { background:var(--bg); font-weight:700; }
  main.legal a { color:var(--teal); }
</style>
</head>
<body>
<header class="site">
  <div class="container">
    <a class="logo" href="/"><span class="logo-badge">PF</span> Patient Funnel OS</a>
    <a class="nav-cta" href="/pricing">요금제 보기</a>
  </div>
</header>
<main class="legal">${d.body}</main>
<footer class="site">
  <div class="container">
    <div>© 2026 Patient Funnel OS</div>
    <div>
      <a href="/legal/terms">이용약관</a>
      <a href="/legal/privacy">개인정보 처리방침</a>
      <a href="/legal/refund">환불규정</a>
      <a href="/legal/sla">SLA</a>
    </div>
  </div>
${BIZ_FOOTER}
</footer>
</body>
</html>`
}
