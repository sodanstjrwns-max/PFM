/* ═══ Module: Help / 사용설명서 (앱 내 도움말 페이지) ═══
 * 가입부터 전체 메뉴, 권한별 차이, 빠른 시작 가이드, FAQ까지
 * PDF 없이 앱 안에서 바로 볼 수 있는 사용설명서.
 */
(function(PFM) {
'use strict';
const { state, esc } = PFM;

const TOC = [
  ['intro', '📖 PFM이란?'],
  ['signup', '🔑 가입하기'],
  ['onboarding', '🧭 첫 로그인 - 온보딩 마법사'],
  ['menu', '📚 전체 메뉴 투어 (9개 그룹)'],
  ['roles', '🔐 권한별 기능 차이'],
  ['quickstart', '🚀 빠른 시작 가이드'],
  ['invite', '✉️ 직원 초대코드 발급'],
  ['security', '🛡️ 보안 & 데이터 안전'],
  ['faq', '❓ FAQ'],
];

function sec(id, title, bodyHtml) {
  return `
    <section id="help-${id}" class="card" style="padding:24px;margin-bottom:16px">
      <div class="section-title" style="margin-top:0">${title}</div>
      ${bodyHtml}
    </section>`;
}

function faqItem(q, a) {
  return `
    <details class="help-faq-item" style="border:1px solid var(--border);border-radius:8px;margin-bottom:8px;overflow:hidden">
      <summary style="cursor:pointer;padding:14px 16px;font-weight:600;background:var(--bg-secondary,#f8fafc);list-style:none;display:flex;align-items:center;gap:8px">
        <span style="color:var(--primary)">Q.</span> ${esc(q)}
      </summary>
      <div style="padding:4px 16px 16px 40px;color:var(--text-secondary);line-height:1.7;font-size:14px">${a}</div>
    </details>`;
}

function menuGroupCard(icon, title, items) {
  return `
    <div style="background:var(--bg-secondary,#f8fafc);border:1px solid var(--border);border-radius:8px;padding:16px 18px;margin-bottom:10px">
      <div style="font-weight:700;margin-bottom:6px">${icon} ${esc(title)}</div>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.8">${items}</div>
    </div>`;
}

async function renderHelp(body) {
  await PFM.withErrorBoundary(body, async () => {
    const role = state.user?.role || 'staff';
    const roleLabel = role === 'admin' ? '대표원장(admin)' : role === 'manager' ? '실장/매니저(manager)' : '직원(staff)';

    body.innerHTML = `
      <div class="page-header" style="margin-bottom:16px">
        <h2 style="margin:0;font-size:22px;font-weight:700">📖 사용설명서</h2>
        <p style="margin:4px 0 0;color:var(--text-secondary);font-size:13px">
          가입부터 매뉴 사용까지 — PFM(페이션트 퍼널 매니저)을 처음 쓰시는 분도 5분이면 감을 잡을 수 있게 정리했습니다.
          현재 로그인 계정 권한: <b>${esc(roleLabel)}</b>
        </p>
        <p style="margin:8px 0 0;color:var(--text-secondary);font-size:12.5px">
          💡 로그인 전 팀원/동료 원장님께 공유하실 땐 로그인 없이 볼 수 있는
          <a href="/guide" target="_blank" rel="noopener" style="color:var(--primary);font-weight:600">공개 소개·사용법 페이지(/guide)</a>를 링크로 보내주세요.
        </p>
      </div>

      <!-- 목차 -->
      <div class="card" style="padding:16px 20px;margin-bottom:20px;display:flex;flex-wrap:wrap;gap:8px">
        ${TOC.map(([id, label]) => `
          <a href="#help-${id}" style="font-size:13px;padding:6px 12px;border-radius:20px;background:var(--bg-secondary,#f1f5f9);color:var(--text-primary);text-decoration:none;border:1px solid var(--border)">${esc(label)}</a>
        `).join('')}
      </div>

      ${sec('intro', '📖 PFM이란?', `
        <p style="line-height:1.8;color:var(--text-secondary)">
          <b>페이션트 퍼널 매니저(PFM)</b>는 환자가 병원을 처음 인지하는 순간부터 치료를 마치고 지인에게
          소개하기까지의 <b>10단계 여정(페이션트 퍼널)</b>을 데이터로 관리하는 병원 경영 시스템입니다.
          환자 DB·상담 기록·콜 관리·KPI·직원 HR까지 병원 운영에 필요한 업무를 한 곳에서 처리합니다.
        </p>
        <p style="line-height:1.8;color:var(--text-secondary);margin-bottom:0">
          이 페이지는 언제든 사이드바 최하단 <b>📖 사용설명서</b> 메뉴를 눌러 다시 볼 수 있습니다.
        </p>
      `)}

      ${sec('signup', '🔑 가입하기 — 2가지 방법', `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px" class="help-signup-grid">
          <div style="border:1px solid var(--border);border-radius:8px;padding:16px">
            <div style="font-weight:700;margin-bottom:8px">🏥 방법 1. 병원 등록 (원장님/최초 가입자)</div>
            <ol style="padding-left:18px;color:var(--text-secondary);font-size:13px;line-height:1.9;margin:0">
              <li>로그인 화면에서 <b>[병원 등록]</b> 탭 선택</li>
              <li>병원명, 대표자명, 이메일, 비밀번호 입력</li>
              <li>등록 즉시 <b>관리자(admin)</b> 권한으로 가입되고, <b>14일 무료 체험</b>이 시작됩니다</li>
              <li>가입 시 이용약관·개인정보처리방침 동의 필요</li>
            </ol>
          </div>
          <div style="border:1px solid var(--border);border-radius:8px;padding:16px">
            <div style="font-weight:700;margin-bottom:8px">✉️ 방법 2. 초대코드로 가입 (직원)</div>
            <ol style="padding-left:18px;color:var(--text-secondary);font-size:13px;line-height:1.9;margin:0">
              <li>병원 관리자/실장에게 <b>초대코드</b> 또는 초대 링크 요청</li>
              <li>받은 링크(<code>.../#join/코드</code>) 접속 또는 로그인 화면에서 <b>[직원 가입]</b> 탭 선택 후 코드 입력</li>
              <li>이름, 이메일, 비밀번호 입력 후 가입</li>
              <li>초대코드에 미리 설정된 권한(manager/staff)이 자동 부여됩니다</li>
            </ol>
          </div>
        </div>
      `)}

      ${sec('onboarding', '🧭 첫 로그인 — 6단계 온보딩 마법사', `
        <p style="color:var(--text-secondary);font-size:13px;margin-top:0">
          관리자로 병원을 처음 등록하면 아래 6단계 마법사가 자동으로 시작됩니다. 언제든 <b>건너뛰기</b> 가능하고,
          나중에 <b>⚙️ 설정</b> 메뉴에서 다시 이어서 할 수 있습니다.
        </p>
        <ol style="padding-left:18px;color:var(--text-secondary);font-size:13px;line-height:2;margin:0">
          <li><b>환영 안내</b> — PFM 소개 및 진행 순서 안내</li>
          <li><b>진료 과목 선택</b> — 임플란트·교정·보철·신경치료 등 12개 진료과목 중 우리 병원 특화 항목 체크</li>
          <li><b>지역 설정</b> — 병원 위치 지역(광역시/도 → 세부 지역) 선택, 마케팅·KPI 분석의 기준이 됩니다</li>
          <li><b>진료시간 설정</b> — 요일별 진료시간, 휴무일 입력</li>
          <li><b>층/공간 구성</b> — 진료실, 상담실, 대기실 등 병원 공간 명칭 설정</li>
          <li><b>직원 초대</b> — 초대코드를 바로 만들어 실장/직원을 초대</li>
        </ol>
      `)}

      ${sec('menu', '📚 전체 메뉴 투어 (사이드바 7개 그룹)', `
        ${menuGroupCard('🏠', '대시보드 / 진료보드', '병원 핵심 지표 한눈에 보기, 오늘의 진료 현황 실시간 보드')}
        ${menuGroupCard('👥', '환자 관리', '환자 DB · 환자 통계 · LTV 랭킹 · 환자 퍼널(10단계) · 리콜 자동화 · 상담 기록/분석 · 컴플레인 · 예약 · 대기시간')}
        ${menuGroupCard('📞', '콜 관리', '인바운드/아웃바운드 콜 기록, 콜 통계')}
        ${menuGroupCard('🏥', '진료 자료', '수가표 · 설명자료 · 케이스 사진 · 상담 스크립트 — 상담 시 바로 꺼내 쓰는 자료함')}
        ${menuGroupCard('💼', 'HR/성장', 'HR 대시보드 · 직원 관리 · 성과 게이미피케이션 · 채용(공고/지원자/인터뷰/온보딩) · 연차 관리')}
        ${menuGroupCard('🏢', '병원 운영', '공지사항 · 일정 관리 · 회의록 · 체크리스트 · 물품구매/수리 · 직원용품 주문')}
        ${menuGroupCard('💬', '커뮤니티', '자유게시판 · 칭찬하기 · 실수노트(완전 익명) · 피드백 노트')}
        ${menuGroupCard('📚', '지식/네트워크', '페이션트 인덱스(주간 경영 설문) · PF 지식베이스 · 소개 갤럭시')}
        ${menuGroupCard('⚙️', '설정', '내 정보 · 병원 기본정보 · 진료시간 · 구독 관리 · 보안/데이터 백업 (최하단 독립 메뉴)')}
      `)}

      ${sec('roles', '🔐 권한별 기능 차이', `
        <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="border-bottom:2px solid var(--border);text-align:left">
              <th style="padding:8px">기능</th>
              <th style="padding:8px">대표원장 (admin)</th>
              <th style="padding:8px">실장/매니저 (manager)</th>
              <th style="padding:8px">직원 (staff)</th>
            </tr>
          </thead>
          <tbody style="color:var(--text-secondary)">
            <tr style="border-bottom:1px solid var(--border)"><td style="padding:8px">환자/상담 조회·입력</td><td style="padding:8px">✅</td><td style="padding:8px">✅</td><td style="padding:8px">✅ (본인 담당 위주)</td></tr>
            <tr style="border-bottom:1px solid var(--border)"><td style="padding:8px">직원 초대코드 발급</td><td style="padding:8px">✅</td><td style="padding:8px">✅</td><td style="padding:8px">❌</td></tr>
            <tr style="border-bottom:1px solid var(--border)"><td style="padding:8px">직원 관리(HR) / 권한 변경</td><td style="padding:8px">✅</td><td style="padding:8px">일부</td><td style="padding:8px">❌</td></tr>
            <tr style="border-bottom:1px solid var(--border)"><td style="padding:8px">구독/결제 관리</td><td style="padding:8px">✅</td><td style="padding:8px">❌</td><td style="padding:8px">❌</td></tr>
            <tr><td style="padding:8px">감사 로그(Audit Log) 조회</td><td style="padding:8px">✅</td><td style="padding:8px">❌</td><td style="padding:8px">❌</td></tr>
          </tbody>
        </table>
        </div>
        <p style="font-size:12px;color:var(--text-muted);margin-top:10px;margin-bottom:0">
          ※ 권한은 초대코드 생성 시 지정되며, 이후 <b>⚙️ 설정 → 직원 관리</b>에서 변경할 수 있습니다.
        </p>
      `)}

      ${sec('quickstart', '🚀 빠른 시작 가이드', `
        <div style="display:grid;gap:14px">
          <div style="border-left:3px solid var(--primary);padding-left:14px">
            <div style="font-weight:700;margin-bottom:4px">1) 환자 · 퍼널 등록하기</div>
            <p style="margin:0;color:var(--text-secondary);font-size:13px;line-height:1.7">
              <b>👥 환자 관리 → 환자 DB → [+ 신규 환자]</b>에서 이름/연락처/유입경로를 입력하면
              자동으로 <b>인지→관심→예약→방문→...→소개</b>의 10단계 퍼널에 등록됩니다.
              단계가 바뀔 때마다 <b>환자 퍼널</b> 메뉴에서 카드를 옆 단계로 이동시키면 됩니다.
            </p>
          </div>
          <div style="border-left:3px solid var(--primary);padding-left:14px">
            <div style="font-weight:700;margin-bottom:4px">2) 상담 기록 남기기</div>
            <p style="margin:0;color:var(--text-secondary);font-size:13px;line-height:1.7">
              <b>👥 환자 관리 → 상담 기록 → [+ 상담 기록 작성]</b>에서 환자 선택 후 상담 내용,
              제안 진료, 견적, 결과(동의/보류/거절)를 기록합니다. 누적되면 <b>상담 분석</b>에서
              상담 전환율을 바로 확인할 수 있습니다.
            </p>
          </div>
        </div>
      `)}

      ${sec('invite', '✉️ 직원 초대코드 발급 절차 (관리자/실장)', `
        <ol style="padding-left:18px;color:var(--text-secondary);font-size:13px;line-height:2;margin:0">
          <li><b>💼 HR/성장 → HR 대시보드</b> 이동</li>
          <li><b>[🔗 직원 초대 코드 생성]</b> 버튼 클릭</li>
          <li>부여할 권한(manager/staff), 최대 사용 인원, 만료일을 설정</li>
          <li>생성된 코드 또는 초대 링크를 카카오톡/문자로 직원에게 전달</li>
          <li><b>[📋 초대 코드 관리]</b>에서 발급 내역 확인, 미사용 코드는 언제든 회수(취소) 가능</li>
        </ol>
      `)}

      ${sec('security', '🛡️ 보안 & 데이터 안전', `
        <ul style="padding-left:18px;color:var(--text-secondary);font-size:13px;line-height:1.9;margin:0">
          <li>모든 환자 데이터는 병원(계정)별로 완전히 분리되어 저장되며, 다른 병원과 공유되지 않습니다.</li>
          <li>비밀번호는 암호화되어 저장되고, 서버는 원문 비밀번호를 절대 보관하지 않습니다.</li>
          <li>중요 작업(권한 변경, 데이터 삭제 등)은 <b>감사 로그(Audit Log)</b>에 기록되어 관리자가 추적할 수 있습니다.</li>
          <li><b>⚙️ 설정 → 데이터 백업/복구</b>에서 주기적으로 데이터를 내보내 백업할 수 있습니다.</li>
        </ul>
      `)}

      ${sec('faq', '❓ 자주 묻는 질문 (FAQ)', `
        ${faqItem('무료 체험 기간이 끝나면 어떻게 되나요?', '14일 체험 기간이 끝나면 구독 결제 안내가 표시됩니다. ⚙️ 설정 → 구독 관리에서 요금제를 확인하고 결제할 수 있으며, 결제 전까지는 조회만 가능하고 신규 데이터 입력은 제한될 수 있습니다.')}
        ${faqItem('직원의 권한을 나중에 바꿀 수 있나요?', '네. 관리자가 ⚙️ 설정 → 직원 관리(또는 HR 대시보드 → 직원 관리)에서 언제든 staff ↔ manager 권한을 변경할 수 있습니다.')}
        ${faqItem('초대코드를 잘못 보냈어요. 취소할 수 있나요?', 'HR 대시보드 → 📋 초대 코드 관리에서 해당 코드를 찾아 [회수/취소]하면 이후 그 코드로는 가입할 수 없습니다.')}
        ${faqItem('온보딩 마법사를 건너뛰었는데 다시 할 수 있나요?', '네. ⚙️ 설정 메뉴 상단에서 온보딩을 다시 시작하거나 이어서 진행할 수 있습니다.')}
        ${faqItem('환자 퍼널의 10단계는 무엇을 기준으로 만들어졌나요?', '문석준 원장의 페이션트 퍼널 이론에 기반한 인지→관심→예약→방문→대기→진단→상담→진료→관리→소개의 10단계 모델입니다. 환자 관리 → 환자 퍼널 메뉴에서 확인할 수 있습니다.')}
        ${faqItem('모바일에서도 사용할 수 있나요?', '네. PFM은 반응형으로 제작되어 모바일 브라우저에서도 사용 가능하며, PWA로 홈 화면에 추가해 앱처럼 쓸 수도 있습니다.')}
        ${faqItem('이 사용설명서는 어디서 다시 볼 수 있나요?', '로그인 후 사이드바 최하단의 📖 사용설명서 메뉴를 클릭하면 언제든 이 페이지로 돌아올 수 있습니다.')}
      `)}

      <div class="card" style="padding:20px 24px;text-align:center;color:var(--text-secondary);font-size:13px">
        더 궁금한 점이 있으신가요? 병원 관리자(대표원장/실장)에게 문의하시거나,
        서비스 관련 문의는 페이션트 퍼널 고객센터로 연락해 주세요.
      </div>
    `;
  }, 'help');
}

/* Public API */
const pubApi = { renderHelp };
PFM.modules = PFM.modules || {};
PFM.modules.help = pubApi;
})(window.PFM = window.PFM || {});
