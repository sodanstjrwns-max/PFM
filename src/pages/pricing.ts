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

export function getPricingHTML(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
${BASE_HEAD}
<title>요금제 - Patient Funnel OS | 환자를 팬으로 만드는 병원경영 시스템</title>
<meta name="description" content="Patient Funnel OS 요금제. 14일 무료 체험, 월 19.9만원부터. 6,000명 대표원장이 검증한 10단계 환자 퍼널 시스템.">
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
    <a class="nav-cta" href="/?mode=register">14일 무료 체험 시작</a>
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
    <span class="save-badge">연납 시 15% 할인</span>
  </div>

  <section class="plans" id="plans-grid">
    <article class="plan" id="plan-starter">
      <h3>Starter</h3>
      <p class="target">직원 10인 이하 · 개원 초기 병원</p>
      <div class="price"><b data-monthly="19.9" data-yearly="16.9">19.9</b><span>만원 / 월</span></div>
      <p class="price-note" data-yearly-note="연 202.8만원 (매월 16.9만)"></p>
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
      <p class="target">직원 11~30인 · 성장기 병원</p>
      <div class="price"><b data-monthly="39.9" data-yearly="33.9">39.9</b><span>만원 / 월</span></div>
      <p class="price-note" data-yearly-note="연 406.8만원 (매월 33.9만)"></p>
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
      <div class="price"><b data-monthly="79.9" data-yearly="67.9">79.9</b><span>만원~ / 월</span></div>
      <p class="price-note" data-yearly-note="연납 계약 시 협의"></p>
      <ul>
        <li>Growth 전 기능</li>
        <li>다지점 통합 관리</li>
        <li>전담 온보딩 매니저</li>
        <li>커스텀 기능 개발</li>
        <li>SLA 99.9% 보장</li>
        <li>우선 기술 지원</li>
      </ul>
      <a class="cta ghost" href="mailto:contact@patientfunnel.kr?subject=Enterprise%20도입%20문의">도입 문의</a>
    </article>
  </section>

  <p class="trial-note">모든 플랜 <b>14일 무료 체험</b> · 카드 등록 없이 시작 · 체험 중 언제든 해지 가능</p>

  <section class="founding-banner" id="founding-banner">
    <h3>🎉 페이션트 퍼널 교육 수강생이신가요?</h3>
    <p>수강생 전용 파운딩 멤버 혜택이 준비되어 있습니다. 교육 이수 이메일로 문의해주세요.</p>
    <a href="mailto:contact@patientfunnel.kr?subject=수강생%20파운딩%20멤버%20문의">수강생 혜택 확인하기</a>
  </section>

  <section class="faq" id="pricing-faq">
    <h2>자주 묻는 질문</h2>
    <div class="faq-item"><h4>무료 체험 기간이 끝나면 어떻게 되나요?</h4><p>체험 종료 후 플랜을 선택하시면 데이터가 그대로 유지된 채 계속 이용하실 수 있습니다. 선택하지 않으셔도 데이터는 30일간 안전하게 보관됩니다.</p></div>
    <div class="faq-item"><h4>기존 차트 프로그램(덴트웹, 원클릭 등)과 함께 쓸 수 있나요?</h4><p>네. Patient Funnel OS는 보험청구/전자차트를 대체하는 것이 아니라, 그 위에 '환자 여정 설계와 경영 관리'를 얹는 시스템입니다. 기존 프로그램과 병행 사용을 전제로 설계되었습니다.</p></div>
    <div class="faq-item"><h4>직원 수가 플랜 기준을 넘으면요?</h4><p>초과 시점에 상위 플랜 안내를 드리며, 즉시 차단되지 않습니다. 월 중 변경 시 일할 계산으로 정산됩니다.</p></div>
    <div class="faq-item"><h4>환자 데이터는 안전한가요?</h4><p>모든 데이터는 병원별로 완전히 분리 저장되며, 전 구간 HTTPS 암호화, 역할 기반 접근 제어, 전 기능 감사 로그를 갖추고 있습니다. 자세한 내용은 <a href="/legal/privacy">개인정보 처리방침</a>을 확인하세요.</p></div>
    <div class="faq-item"><h4>해지하면 위약금이 있나요?</h4><p>월간 결제는 위약금이 없으며 언제든 해지 가능합니다. 해지 후에도 현재 결제 주기 종료일까지 이용하실 수 있습니다.</p></div>
  </section>
</main>

<footer class="site">
  <div class="container">
    <div>© 2026 Patient Funnel OS. 서울비디치과 · 페이션트 퍼널</div>
    <div>
      <a href="/legal/terms">이용약관</a>
      <a href="/legal/privacy">개인정보 처리방침</a>
      <a href="/legal/sla">서비스 수준 협약(SLA)</a>
    </div>
  </div>
</footer>
<script src="/static/pricing.js"></script>
</body>
</html>`
}

/* ─── 법적 문서 ─── */
const LEGAL_DOCS: Record<'privacy' | 'terms' | 'sla', { title: string; body: string }> = {
  privacy: {
    title: '개인정보 처리방침',
    body: `
<h2>개인정보 처리방침</h2>
<p class="updated">시행일: 2026년 7월 3일 · 버전 1.0</p>

<h3>1. 총칙</h3>
<p>Patient Funnel OS(이하 "서비스")는 「개인정보 보호법」 및 「의료법」 등 관련 법령을 준수하며, 이용 병원(이하 "고객")과 그 소속 직원, 그리고 고객이 서비스에 입력하는 환자 정보를 보호하기 위해 본 방침을 수립합니다.</p>

<h3>2. 수집하는 개인정보 항목</h3>
<ul>
<li><b>계정 정보(직원):</b> 이름, 이메일, 전화번호, 직책/팀, 근무 일정, 암호화된 비밀번호</li>
<li><b>병원 정보:</b> 병원명, 주소, 전화번호, 사업자등록번호</li>
<li><b>환자 정보(고객이 입력):</b> 이름, 연락처, 내원 경로, 상담/진료 관련 기록. 서비스는 고객의 위탁을 받아 이를 보관·처리하는 수탁자 지위에 있습니다.</li>
<li><b>자동 수집:</b> 접속 IP, 브라우저 정보(User-Agent), 접속 일시, 서비스 이용 기록(감사 로그)</li>
<li><b>결제 정보:</b> 카드사명 및 마스킹된 카드번호 끝 4자리 (전체 카드번호는 결제대행사 토스페이먼츠가 보관하며 서비스는 저장하지 않음)</li>
</ul>

<h3>3. 개인정보의 처리 목적</h3>
<ul>
<li>서비스 제공 및 계정 관리 (인증, 권한 관리)</li>
<li>고객의 병원 운영 지원 (환자 관리, 인사 관리, 경영 분석)</li>
<li>구독 요금 결제 및 정산</li>
<li>보안 사고 예방 및 대응 (접근 기록, 감사 로그)</li>
<li>법령상 의무 이행</li>
</ul>

<h3>4. 보유 및 이용 기간</h3>
<ul>
<li>계정 정보: 회원 탈퇴 또는 계약 종료 시까지 (관계 법령에 따른 보존 의무가 있는 경우 해당 기간)</li>
<li>환자 정보: 고객(병원)의 삭제 요청 또는 계약 종료 후 30일 이내 파기. 의료법상 기록 보존 의무는 고객에게 있으며, 고객은 계약 종료 전 데이터 내보내기 기능으로 자료를 확보할 수 있습니다.</li>
<li>감사 로그: 생성일로부터 1년</li>
<li>전자상거래법상 결제 기록: 5년</li>
</ul>

<h3>5. 개인정보의 제3자 제공 및 처리 위탁</h3>
<ul>
<li><b>Cloudflare, Inc.:</b> 클라우드 인프라 (데이터 저장·전송). 국외 이전이 수반될 수 있으며 전 구간 암호화됩니다.</li>
<li><b>토스페이먼츠(주):</b> 결제 처리</li>
<li>위 외에는 법령에 근거한 경우를 제외하고 제3자에게 제공하지 않습니다.</li>
</ul>

<h3>6. 정보주체의 권리</h3>
<p>이용자는 언제든지 자신의 개인정보 열람·정정·삭제·처리정지를 요구할 수 있습니다. 환자 정보에 대한 권리 행사는 해당 병원(개인정보처리자)을 통해 이루어지며, 서비스는 수탁자로서 지체 없이 협조합니다.</p>

<h3>7. 안전성 확보 조치</h3>
<ul>
<li>비밀번호 단방향 암호화(PBKDF2) 저장</li>
<li>전 구간 HTTPS(TLS) 암호화 전송, HSTS 적용</li>
<li>httpOnly 쿠키 인증 및 콘텐츠 보안 정책(CSP)에 의한 XSS 차단</li>
<li>역할 기반 접근 제어(RBAC) 및 요청 단위 실시간 권한 검증</li>
<li>주요 행위 감사 로그 기록 (로그인, 권한 변경, 데이터 삭제, 데이터 내보내기 등)</li>
<li>병원 간 데이터 완전 논리 분리 (테넌트 격리)</li>
<li>로그인 무차별 대입 차단 (요청 제한)</li>
</ul>

<h3>8. 개인정보 보호책임자</h3>
<p>성명: 문석준 · 직책: 대표 · 문의: contact@patientfunnel.kr</p>

<h3>9. 방침 변경</h3>
<p>본 방침이 변경되는 경우 시행 7일 전 서비스 내 공지합니다.</p>`,
  },
  terms: {
    title: '이용약관',
    body: `
<h2>서비스 이용약관</h2>
<p class="updated">시행일: 2026년 7월 3일 · 버전 1.0</p>

<h3>제1조 (목적)</h3>
<p>본 약관은 Patient Funnel OS(이하 "서비스")의 이용과 관련하여 서비스 제공자와 이용 병원(이하 "고객") 간의 권리·의무를 규정함을 목적으로 합니다.</p>

<h3>제2조 (서비스의 내용)</h3>
<p>서비스는 병원 경영 지원을 위한 클라우드 소프트웨어(SaaS)로서 환자 여정 관리(CRM), 경영 대시보드, 인사 관리, 리뷰 관리, 원내 커뮤니케이션 등의 기능을 제공합니다. 서비스는 전자의무기록(EMR) 또는 보험청구 프로그램이 아니며, 이를 대체하지 않습니다.</p>

<h3>제3조 (계약의 성립 및 무료 체험)</h3>
<ol>
<li>계약은 고객이 병원 계정을 등록하고 본 약관에 동의함으로써 성립합니다.</li>
<li>신규 등록 병원에는 14일의 무료 체험 기간이 제공됩니다. 체험 기간 중 결제 수단 등록 의무는 없습니다.</li>
<li>체험 종료 후 유료 플랜을 선택하지 않은 경우 서비스 이용이 제한될 수 있으며, 데이터는 종료일로부터 30일간 보관됩니다.</li>
</ol>

<h3>제4조 (요금 및 결제)</h3>
<ol>
<li>요금제와 가격은 서비스 요금 안내 페이지에 게시하며, 변경 시 30일 전 고지합니다. 변경은 다음 결제 주기부터 적용됩니다.</li>
<li>결제는 등록된 결제 수단으로 매 주기 자동 청구됩니다.</li>
<li>결제 실패 시 7일간 재시도하며, 계속 실패 시 서비스가 일시 제한될 수 있습니다.</li>
</ol>

<h3>제5조 (해지 및 환불)</h3>
<ol>
<li>고객은 언제든 해지할 수 있으며, 해지 시 현재 결제 주기 종료일까지 이용 가능합니다.</li>
<li>월간 결제는 일할 환불하지 않습니다. 연간 결제의 중도 해지 시 이용 개월 수를 월간 정가로 정산한 차액을 환불합니다.</li>
</ol>

<h3>제6조 (고객의 의무)</h3>
<ol>
<li>고객은 환자 정보 입력·처리에 관하여 개인정보 보호법 및 의료법상 개인정보처리자로서의 책임을 부담하며, 정보주체 동의 확보 의무는 고객에게 있습니다.</li>
<li>고객은 계정 정보를 안전하게 관리해야 하며, 직원 퇴사 시 지체 없이 계정을 비활성화해야 합니다.</li>
<li>서비스의 역설계, 무단 크롤링, 재판매를 금지합니다.</li>
</ol>

<h3>제7조 (서비스 제공자의 의무)</h3>
<ol>
<li>서비스 제공자는 개인정보 수탁자로서 위탁받은 정보를 계약 목적 외로 이용하지 않습니다.</li>
<li>서비스 수준은 별도의 <a href="/legal/sla">SLA</a>에 따릅니다.</li>
<li>계약 종료 시 고객 요청에 따라 데이터 내보내기를 지원합니다.</li>
</ol>

<h3>제8조 (책임의 제한)</h3>
<p>서비스 제공자는 천재지변, 기간통신사업자 또는 클라우드 사업자의 장애 등 불가항력으로 인한 손해에 대해 책임지지 않습니다. 서비스 제공자의 배상 책임은 최근 3개월간 고객이 지급한 이용 요금을 한도로 합니다.</p>

<h3>제9조 (분쟁 해결)</h3>
<p>본 약관은 대한민국 법률에 따르며, 분쟁 발생 시 서울중앙지방법원을 관할 법원으로 합니다.</p>`,
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
<p>SLA 관련 문의 및 크레딧 신청: contact@patientfunnel.kr</p>`,
  },
}

export function getLegalHTML(doc: 'privacy' | 'terms' | 'sla'): string {
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
      <a href="/legal/sla">SLA</a>
    </div>
  </div>
</footer>
</body>
</html>`
}
