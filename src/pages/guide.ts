/* ═══ v5.13 공개 페이지: 서비스 소개 + 사용법 가이드 (로그인 불필요) ═══
 * pricing.ts의 BASE_HEAD 디자인 언어를 그대로 재사용해 톤을 통일한다.
 * 목적: 서비스를 처음 보는 사람(원장/직원/잠재 고객)이 로그인 없이도
 *       "이게 뭐 하는 서비스인지 + 어떻게 쓰는지"를 한 페이지에서 파악.
 */

const GUIDE_HEAD = `
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
  .nav-ghost { color:var(--teal); text-decoration:none; padding:9px 14px; border-radius:8px; font-weight:600; font-size:14px; border:1.5px solid var(--teal); }
  footer.site { border-top:1px solid var(--border); background:var(--card); margin-top:80px; padding:32px 0; font-size:13px; color:var(--sub); }
  footer.site .container { display:flex; flex-wrap:wrap; gap:16px; justify-content:space-between; align-items:center; }
  footer.site a { color:var(--sub); text-decoration:none; margin-right:16px; }
  footer.site a:hover { color:var(--teal); }
</style>`

export function getGuideHTML(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
${GUIDE_HEAD}
<title>서비스 소개 & 사용법 - Patient Funnel OS</title>
<meta name="description" content="Patient Funnel OS(PFM)가 무엇이고 어떻게 쓰는지 한 페이지로 안내합니다. 환자 퍼널 10단계, 가입 방법, 전체 메뉴 투어, 권한별 기능, FAQ.">
<meta property="og:title" content="Patient Funnel OS 소개 & 사용법 가이드">
<meta property="og:description" content="환자가 병원을 알게 되는 순간부터 지인에게 소개하기까지 — 10단계 퍼널로 병원을 운영하는 방법.">
<style>
  .hero { text-align:center; padding:56px 0 36px; }
  .hero .kicker { display:inline-block; background:#ecfdf5; color:var(--teal-dark); font-size:12.5px; font-weight:700; padding:5px 14px; border-radius:20px; margin-bottom:16px; }
  .hero h1 { font-size:32px; font-weight:800; letter-spacing:-0.5px; }
  .hero h1 .accent { color:var(--teal); }
  .hero p.sub { color:var(--sub); font-size:16px; margin-top:14px; max-width:640px; margin-left:auto; margin-right:auto; }
  .hero .cta-row { margin-top:26px; display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }

  /* 목차 */
  .toc { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; padding:20px; background:var(--card); border:1px solid var(--border); border-radius:14px; margin:0 0 48px; position:sticky; top:76px; z-index:5; }
  .toc a { font-size:13px; padding:6px 13px; border-radius:20px; background:var(--bg); color:var(--ink); text-decoration:none; border:1px solid var(--border); }
  .toc a:hover { border-color:var(--teal); color:var(--teal); }

  section.gsec { margin-bottom:56px; scroll-margin-top:150px; }
  section.gsec h2 { font-size:23px; font-weight:800; margin-bottom:6px; display:flex; align-items:center; gap:8px; }
  section.gsec > p.lead { color:var(--sub); font-size:14.5px; margin-bottom:22px; }

  /* 퍼널 10단계 */
  .funnel-steps { display:flex; flex-wrap:wrap; gap:8px; }
  .funnel-step { flex:1; min-width:88px; background:var(--card); border:1px solid var(--border); border-radius:10px; padding:14px 10px; text-align:center; }
  .funnel-step .n { font-size:11px; color:var(--teal); font-weight:800; }
  .funnel-step .t { font-size:13.5px; font-weight:700; margin-top:4px; }

  /* 시작하기 카드 */
  .start-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:18px; }
  .start-card { background:var(--card); border:1px solid var(--border); border-radius:14px; padding:22px; }
  .start-card .badge { display:inline-block; font-size:11.5px; font-weight:700; background:#ecfdf5; color:var(--teal-dark); padding:3px 10px; border-radius:12px; margin-bottom:10px; }
  .start-card h3 { font-size:16px; font-weight:800; margin-bottom:10px; }
  .start-card ol { padding-left:18px; color:#334155; font-size:13.5px; line-height:1.9; }

  /* 메뉴 투어 */
  .menu-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:16px; }
  .menu-card { background:var(--card); border:1px solid var(--border); border-radius:14px; padding:20px 22px; }
  .menu-card .mh { font-weight:800; font-size:15.5px; margin-bottom:8px; }
  .menu-card .mi { font-size:13px; color:var(--sub); line-height:1.8; }
  .menu-card .mi b { color:#334155; font-weight:600; }

  /* 역할 테이블 */
  .role-table-wrap { overflow-x:auto; background:var(--card); border:1px solid var(--border); border-radius:14px; padding:6px; }
  table.role-table { width:100%; border-collapse:collapse; font-size:13.5px; }
  table.role-table th, table.role-table td { padding:12px 14px; text-align:left; }
  table.role-table thead th { border-bottom:2px solid var(--border); font-weight:700; }
  table.role-table tbody tr { border-bottom:1px solid var(--border); }
  table.role-table tbody tr:last-child { border-bottom:none; }
  table.role-table td:not(:first-child) { color:var(--sub); }

  /* 사용법 타임라인 */
  .flow { display:flex; flex-direction:column; gap:16px; }
  .flow-item { display:flex; gap:16px; align-items:flex-start; }
  .flow-num { flex-shrink:0; width:34px; height:34px; border-radius:50%; background:var(--teal); color:#fff; font-weight:800; font-size:14px; display:flex; align-items:center; justify-content:center; }
  .flow-body h4 { font-size:15px; font-weight:700; margin-bottom:4px; }
  .flow-body p { font-size:13.5px; color:var(--sub); }

  /* FAQ */
  details.faq-item { background:var(--card); border:1px solid var(--border); border-radius:12px; margin-bottom:10px; overflow:hidden; }
  details.faq-item summary { cursor:pointer; padding:16px 18px; font-weight:700; font-size:14.5px; list-style:none; display:flex; align-items:center; gap:8px; }
  details.faq-item summary::-webkit-details-marker { display:none; }
  details.faq-item summary::before { content:"Q"; color:#fff; background:var(--teal); font-size:11px; font-weight:800; width:20px; height:20px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
  details.faq-item .a { padding:0 18px 18px 46px; color:var(--sub); font-size:13.5px; line-height:1.7; }

  .closing-banner { background:linear-gradient(135deg,#0f766e,#115e59); border-radius:16px; padding:36px 32px; color:#fff; text-align:center; }
  .closing-banner h3 { font-size:21px; font-weight:800; }
  .closing-banner p { opacity:.9; margin-top:8px; font-size:14.5px; }
  .closing-banner a { display:inline-block; margin-top:18px; background:#fff; color:var(--teal); padding:11px 26px; border-radius:10px; font-weight:800; text-decoration:none; margin:18px 6px 0; }
  .closing-banner a.ghost { background:transparent; color:#fff; border:1.5px solid rgba(255,255,255,.6); }

  @media (max-width:640px) {
    .toc { position:static; }
    .hero h1 { font-size:26px; }
  }
</style>
</head>
<body>
<header class="site">
  <div class="container">
    <a class="logo" href="/"><span class="logo-badge">PF</span> Patient Funnel OS</a>
    <div style="display:flex;gap:10px;align-items:center">
      <a class="nav-ghost" href="/pricing">요금제</a>
      <a class="nav-cta" href="/?mode=register">14일 무료 체험</a>
    </div>
  </div>
</header>

<main class="container" style="padding-top:8px">
  <section class="hero" id="guide-hero">
    <span class="kicker">📖 서비스 소개 &amp; 사용법 가이드</span>
    <h1>이 서비스, <span class="accent">뭐 하는 곳</span>인지<br>3분이면 다 이해됩니다</h1>
    <p class="sub">
      Patient Funnel OS(내부 별칭 PFM)는 환자가 우리 병원을 처음 알게 되는 순간부터
      치료를 마치고 지인에게 소개하기까지 — <b>10단계 여정(페이션트 퍼널)</b>을
      데이터로 관리하는 병원 경영 시스템입니다. 이 페이지는 로그인 없이 누구나 볼 수 있고,
      팀원이나 동료 원장님께 링크로 바로 공유하셔도 됩니다.
    </p>
    <div class="cta-row">
      <a class="nav-cta" href="/?mode=register">무료로 체험해보기</a>
      <a class="nav-ghost" href="/">로그인하러 가기</a>
    </div>
  </section>

  <nav class="toc" id="guide-toc">
    <a href="#g-what">🤔 무엇을 하는 서비스인가</a>
    <a href="#g-funnel">🧭 핵심 개념: 퍼널 10단계</a>
    <a href="#g-start">🔑 시작하는 방법</a>
    <a href="#g-flow">🚀 처음 3일 사용 흐름</a>
    <a href="#g-menu">📚 전체 기능 투어</a>
    <a href="#g-roles">🔐 권한별 차이</a>
    <a href="#g-security">🛡️ 보안</a>
    <a href="#g-faq">❓ FAQ</a>
  </nav>

  <section class="gsec" id="g-what">
    <h2>🤔 무엇을 하는 서비스인가요?</h2>
    <p class="lead">한 줄 요약: <b>"병원에 오는 환자를 팬으로 만드는 과정을 관리하는 소프트웨어"</b>입니다.</p>
    <div class="start-grid">
      <div class="start-card">
        <div class="badge">보험청구 프로그램이 아닙니다</div>
        <h3>기존 차트 프로그램과 같이 씁니다</h3>
        <p style="color:var(--sub);font-size:13.5px;line-height:1.8">
          덴트웹·원클릭 같은 전자차트/보험청구 프로그램을 대체하지 않습니다.
          그 위에 <b>"환자 경험 설계와 병원 경영"</b>을 얹는 시스템으로, 두 프로그램을
          함께 병행해서 사용하시면 됩니다.
        </p>
      </div>
      <div class="start-card">
        <div class="badge">누가 쓰나요</div>
        <h3>대표원장 · 실장 · 전 직원</h3>
        <p style="color:var(--sub);font-size:13.5px;line-height:1.8">
          원장님은 병원 전체 지표와 매출 흐름을, 실장님은 상담·콜·직원 관리를,
          일반 직원은 본인 담당 환자와 업무 체크리스트를 각자의 화면에서 확인합니다.
        </p>
      </div>
      <div class="start-card">
        <div class="badge">왜 필요한가요</div>
        <h3>감으로 하던 걸 데이터로</h3>
        <p style="color:var(--sub);font-size:13.5px;line-height:1.8">
          "이번 달 신환이 왜 줄었지?", "상담 전환율이 낮은 이유가 뭐지?" 같은 질문에
          엑셀이나 감이 아니라 실제 데이터로 답할 수 있게 해줍니다.
        </p>
      </div>
    </div>
  </section>

  <section class="gsec" id="g-funnel">
    <h2>🧭 핵심 개념: 환자 퍼널(Patient Funnel) 10단계</h2>
    <p class="lead">서비스의 모든 메뉴는 결국 이 10단계 중 하나를 더 잘 관리하기 위해 존재합니다.</p>
    <div class="funnel-steps">
      <div class="funnel-step"><div class="n">1</div><div class="t">인지</div></div>
      <div class="funnel-step"><div class="n">2</div><div class="t">관심</div></div>
      <div class="funnel-step"><div class="n">3</div><div class="t">예약</div></div>
      <div class="funnel-step"><div class="n">4</div><div class="t">방문</div></div>
      <div class="funnel-step"><div class="n">5</div><div class="t">대기</div></div>
      <div class="funnel-step"><div class="n">6</div><div class="t">진단</div></div>
      <div class="funnel-step"><div class="n">7</div><div class="t">상담</div></div>
      <div class="funnel-step"><div class="n">8</div><div class="t">진료</div></div>
      <div class="funnel-step"><div class="n">9</div><div class="t">관리</div></div>
      <div class="funnel-step"><div class="n">10</div><div class="t">소개</div></div>
    </div>
    <p style="margin-top:16px;color:var(--sub);font-size:13.5px;line-height:1.8">
      환자 한 명이 이 10단계를 어디까지 지났는지를 <b>👥 환자 관리 → 환자 퍼널</b> 메뉴에서
      카드 형태로 관리합니다. 어느 단계에서 이탈이 많은지 보이면, 거기가 병원이 개선해야 할
      지점입니다.
    </p>
  </section>

  <section class="gsec" id="g-start">
    <h2>🔑 시작하는 방법 — 2가지 경로</h2>
    <p class="lead">병원의 첫 가입자(보통 원장님)와, 그 뒤에 합류하는 직원의 경로가 다릅니다.</p>
    <div class="start-grid">
      <div class="start-card">
        <h3>🏥 방법 1. 병원 등록 (최초 가입자 / 원장님)</h3>
        <ol>
          <li>로그인 화면에서 <b>[병원 등록]</b> 탭 선택</li>
          <li>병원명, 대표자명, 이메일, 비밀번호 입력</li>
          <li>등록 즉시 <b>관리자(admin)</b> 권한 부여, <b>14일 무료 체험</b> 자동 시작</li>
          <li>이후 6단계 온보딩 마법사가 자동으로 진행됩니다 (진료과목·지역·진료시간·공간 구성·직원 초대)</li>
        </ol>
      </div>
      <div class="start-card">
        <h3>✉️ 방법 2. 초대코드로 가입 (직원)</h3>
        <ol>
          <li>병원 관리자/실장에게 <b>초대코드</b> 또는 초대 링크 요청</li>
          <li>초대 링크 접속 또는 로그인 화면 <b>[직원 가입]</b> 탭에서 코드 입력</li>
          <li>이름, 이메일, 비밀번호 입력 후 가입</li>
          <li>초대코드에 지정된 권한(실장/직원)이 자동으로 부여됩니다</li>
        </ol>
      </div>
    </div>
  </section>

  <section class="gsec" id="g-flow">
    <h2>🚀 처음 3일, 이렇게 써보세요</h2>
    <p class="lead">가입 직후 뭐부터 눌러야 할지 막막할 때 참고하는 순서입니다.</p>
    <div class="flow">
      <div class="flow-item">
        <div class="flow-num">1</div>
        <div class="flow-body">
          <h4>온보딩 마법사부터 완료하기</h4>
          <p>진료과목·지역·진료시간을 입력해두면 이후 통계/매뉴얼 기능이 훨씬 정확해집니다. 건너뛰어도 나중에 <b>⚙️ 설정</b>에서 이어할 수 있습니다.</p>
        </div>
      </div>
      <div class="flow-item">
        <div class="flow-num">2</div>
        <div class="flow-body">
          <h4>직원 초대하기</h4>
          <p><b>💼 HR/성장 → HR 대시보드 → 직원 초대 코드 생성</b>에서 권한(실장/직원)을 정해 코드를 만들고 카카오톡/문자로 전달합니다.</p>
        </div>
      </div>
      <div class="flow-item">
        <div class="flow-num">3</div>
        <div class="flow-body">
          <h4>환자 등록 → 퍼널 이동시키기</h4>
          <p><b>👥 환자 관리 → 환자 DB</b>에서 신규 환자를 등록하면 자동으로 퍼널 1단계(인지)에 들어갑니다. 상담·예약이 진행될 때마다 <b>환자 퍼널</b> 화면에서 카드를 다음 단계로 옮겨주세요.</p>
        </div>
      </div>
      <div class="flow-item">
        <div class="flow-num">4</div>
        <div class="flow-body">
          <h4>상담 기록 쌓기 → 전환율 확인</h4>
          <p>상담이 끝나면 <b>상담 기록</b>에 결과(동의/보류/거절)를 남기세요. 데이터가 쌓이면 <b>상담 분석</b>에서 전환율이 자동 집계됩니다.</p>
        </div>
      </div>
      <div class="flow-item">
        <div class="flow-num">5</div>
        <div class="flow-body">
          <h4>대시보드로 매일 아침 점검</h4>
          <p><b>🏠 대시보드</b>와 <b>📡 진료보드</b>에서 오늘의 예약·신환·매출 흐름을 매일 확인하는 루틴을 만드세요.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="gsec" id="g-menu">
    <h2>📚 전체 기능 투어 (사이드바 메뉴 기준)</h2>
    <p class="lead">로그인하면 왼쪽 사이드바에 아래 7개 그룹 + 홈/설정/사용설명서가 보입니다.</p>
    <div class="menu-grid">
      <div class="menu-card">
        <div class="mh">🏠 대시보드 / 진료보드</div>
        <div class="mi">병원 핵심 지표를 한눈에, <b>진료보드</b>에서 오늘 진료 현황을 실시간으로 확인합니다.</div>
      </div>
      <div class="menu-card">
        <div class="mh">👥 환자 관리</div>
        <div class="mi">환자 DB · <b>환자 통계</b>(LTV 랭킹 탭 포함) · 환자 퍼널 · 리콜 자동화 · 상담 기록/분석 · <b>컴플레인</b>(기록/통계 탭) · <b>예약 관리</b>(관리/통계 탭) · <b>대기시간 관리</b>(관리/통계 탭)</div>
      </div>
      <div class="menu-card">
        <div class="mh">📞 콜 관리</div>
        <div class="mi">인바운드 · 아웃바운드 콜 기록, 콜 통계</div>
      </div>
      <div class="menu-card">
        <div class="mh">🏥 진료 자료</div>
        <div class="mi">수가표 · 설명자료 · 케이스 사진 · 상담 스크립트 — 상담 중 바로 꺼내 쓰는 자료함</div>
      </div>
      <div class="menu-card">
        <div class="mh">💼 HR/성장</div>
        <div class="mi">HR 대시보드 · 직원 관리 · 지원자 관리 · 면접 캘린더 · 온보딩 · 연차 관리</div>
      </div>
      <div class="menu-card">
        <div class="mh">🏢 병원 운영</div>
        <div class="mi">공지사항 · 일정 관리 · 회의록 · 체크리스트 · 물품 구매 · 수리/정비 · 직원용품 주문</div>
      </div>
      <div class="menu-card">
        <div class="mh">💬 커뮤니티</div>
        <div class="mi">자유게시판 · 칭찬하기 · 실수노트(자진신고) · 피드백 노트(학습자산)</div>
      </div>
      <div class="menu-card">
        <div class="mh">📚 지식/네트워크</div>
        <div class="mi">페이션트 인덱스(주간 경영 설문) · 우리 병원 매뉴얼 · 소개 갤럭시</div>
      </div>
      <div class="menu-card">
        <div class="mh">⚙️ 설정 / 📖 사용설명서</div>
        <div class="mi">내 정보 · 병원 기본정보 · 진료시간 · 구독 관리 · 보안/데이터 백업. 로그인 후 언제든 <b>📖 사용설명서</b> 메뉴로 앱 안 상세 가이드를 다시 볼 수 있습니다.</div>
      </div>
    </div>
  </section>

  <section class="gsec" id="g-roles">
    <h2>🔐 권한별 기능 차이</h2>
    <p class="lead">가입 시(또는 초대코드 발급 시) 권한이 정해지고, 이후에도 관리자가 변경할 수 있습니다.</p>
    <div class="role-table-wrap">
      <table class="role-table">
        <thead>
          <tr><th>기능</th><th>대표원장 (admin)</th><th>실장/매니저 (manager)</th><th>직원 (staff)</th></tr>
        </thead>
        <tbody>
          <tr><td>환자/상담 조회·입력</td><td>✅</td><td>✅</td><td>✅ (본인 담당 위주)</td></tr>
          <tr><td>직원 초대코드 발급</td><td>✅</td><td>✅</td><td>❌</td></tr>
          <tr><td>직원 관리(HR) / 권한 변경</td><td>✅</td><td>일부</td><td>❌</td></tr>
          <tr><td>구독/결제 관리</td><td>✅</td><td>❌</td><td>❌</td></tr>
          <tr><td>감사 로그(Audit Log) 조회</td><td>✅</td><td>❌</td><td>❌</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="gsec" id="g-security">
    <h2>🛡️ 보안 &amp; 데이터 안전</h2>
    <p class="lead">환자 정보를 다루는 서비스인 만큼, 아래 원칙을 지킵니다.</p>
    <div class="start-grid">
      <div class="start-card"><h3>병원별 완전 분리</h3><p style="color:var(--sub);font-size:13.5px;line-height:1.8">모든 데이터는 병원(계정) 단위로 논리적으로 완전히 분리 저장되며, 다른 병원과 절대 공유되지 않습니다.</p></div>
      <div class="start-card"><h3>암호화 &amp; 전송 보안</h3><p style="color:var(--sub);font-size:13.5px;line-height:1.8">비밀번호는 단방향 암호화되어 저장되고, 모든 통신은 HTTPS로 암호화됩니다.</p></div>
      <div class="start-card"><h3>추적 가능한 감사 로그</h3><p style="color:var(--sub);font-size:13.5px;line-height:1.8">권한 변경, 데이터 삭제 등 주요 작업은 감사 로그에 남아 관리자가 언제든 확인할 수 있습니다.</p></div>
    </div>
    <p style="margin-top:16px;font-size:13px;color:var(--sub)">자세한 내용은 <a href="/legal/privacy" style="color:var(--teal)">개인정보 처리방침</a>과 <a href="/legal/sla" style="color:var(--teal)">SLA</a> 문서를 참고하세요.</p>
  </section>

  <section class="gsec" id="g-faq">
    <h2>❓ 자주 묻는 질문</h2>
    <details class="faq-item"><summary>이 페이지를 팀원에게 공유해도 되나요?</summary><div class="a">네. <code>/guide</code> 주소는 로그인 없이 누구나 볼 수 있도록 만든 공개 페이지입니다. 링크를 그대로 공유하셔도 됩니다.</div></details>
    <details class="faq-item"><summary>무료 체험 기간이 끝나면 어떻게 되나요?</summary><div class="a">14일 체험이 끝나면 구독 결제 안내가 표시됩니다. 로그인 후 <b>⚙️ 설정 → 구독 관리</b>에서 요금제를 확인·결제할 수 있고, 결제 전까지 데이터는 안전하게 보관됩니다.</div></details>
    <details class="faq-item"><summary>기존 차트 프로그램과 같이 써도 되나요?</summary><div class="a">네. 보험청구/전자차트를 대체하지 않고, 그 위에 환자 경험 설계와 경영 관리를 얹는 구조로 설계되어 병행 사용을 전제로 합니다.</div></details>
    <details class="faq-item"><summary>직원의 권한을 나중에 바꿀 수 있나요?</summary><div class="a">네. 관리자가 로그인 후 <b>⚙️ 설정 → 직원 관리</b>(또는 HR 대시보드)에서 언제든 직원 ↔ 실장 권한을 변경할 수 있습니다.</div></details>
    <details class="faq-item"><summary>모바일에서도 쓸 수 있나요?</summary><div class="a">네. 반응형으로 제작되어 모바일 브라우저에서 바로 쓸 수 있고, PWA로 홈 화면에 추가해 앱처럼 사용할 수도 있습니다.</div></details>
    <details class="faq-item"><summary>로그인 후에도 이 내용을 다시 볼 수 있나요?</summary><div class="a">네. 로그인 후 사이드바 최하단 <b>📖 사용설명서</b> 메뉴에서 계정 권한에 맞춘 더 상세한 버전을 볼 수 있고, 이 공개 페이지 주소(<code>/guide</code>)로도 언제든 돌아올 수 있습니다.</div></details>
  </section>

  <section class="closing-banner" id="guide-closing">
    <h3>이제 감이 좀 잡히셨나요?</h3>
    <p>14일 무료 체험으로 직접 화면을 눌러보시는 게 가장 빠릅니다. 카드 등록 없이 바로 시작할 수 있어요.</p>
    <a href="/?mode=register">무료로 시작하기</a>
    <a class="ghost" href="/pricing">요금제 자세히 보기</a>
  </section>
</main>

<footer class="site">
  <div class="container">
    <div>© 2026 Patient Funnel OS. 서울비디치과 · 페이션트 퍼널</div>
    <div>
      <a href="/pricing">요금제</a>
      <a href="/legal/terms">이용약관</a>
      <a href="/legal/privacy">개인정보 처리방침</a>
      <a href="/legal/sla">SLA</a>
    </div>
  </div>
  <div class="container" style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);font-size:11.5px;line-height:1.7;color:#94a3b8;display:block">
    상호: 페이션트 퍼널(Patient Funnel) · 대표: 문석준 · 사업자등록번호: 등록 준비중 · 통신판매업 신고: 준비중<br>
    이메일: contact@patientfunnel.kr · 고객지원: 평일 10:00–18:00 (주말·공휴일 휴무)
  </div>
</footer>
</body>
</html>`
}
