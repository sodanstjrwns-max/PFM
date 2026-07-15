const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');
const STATIC = path.join(BASE, 'public', 'static');
const DIST = path.join(STATIC, 'dist');

/* ═══ Code Splitting Strategy ═══
   Core: app.js + dashboard → loaded immediately (~90KB minified)
   Chunks: all other modules → lazy loaded on demand (~580KB total, loaded as needed)
═══ */

const CORE_FILES = [
  'modules/actions.js', // v5.8 CSP-safe 이벤트 위임 (data-act) — 반드시 최우선 로드
  'app.js',
  'modules/dashboard.js',
  'modules/pwa.js',   // v3.2 PWA + Service Worker 등록
  'modules/polish.js', // v5.6 Cmd+K 커맨드 팔레트 + UX 폴리싱 (즉시 로드 필요)
];

const CHUNK_FILES = [
  'modules/management.js', 'modules/scripts.js',
  'modules/community.js', 'modules/operations.js', 'modules/hire.js',
  'modules/hr.js', 'modules/clinical.js', 'modules/consult.js',
  'modules/patients.js', 'modules/patients-stats.js',
  'modules/calls-inbound.js', 'modules/calls-outbound.js', 'modules/calls-stats.js',
  'modules/leave.js', 'modules/meetings.js', 'modules/fee-schedule.js',
  'modules/funnel.js', 'modules/kpi.js', 'modules/kpi-stats.js',
  'modules/complaints.js', 'modules/reservations.js', 'modules/wait-times.js',
  'modules/parking.js', 'modules/surveys.js', 'modules/settings.js',
  'modules/heatmap.js', 'modules/gamification.js', 'modules/reviews.js',
  'modules/chat.js',
  'modules/messenger.js',
  'modules/onboarding.js',
  'modules/recall.js',   // v3.2 환자 리콜 자동화
  'modules/kakao.js',    // v3.3 카카오 알림톡
  'modules/reports.js',  // v3.3 월간 보고서 & 내보내기
  'modules/feedback.js', // v3.5 피드백 노트 (상급자↔하급자)
  'modules/pf-index.js', // v4.6 페이션트 인덱스 (매주 월요일 경영 설문)
  'modules/knowledge.js', // v4.7 PF 지식베이스 (원장님 6권 노하우 카드)
  'modules/referrals.js', // v4.8 소개 갤럭시 (3D 시각화 + 팬 등급)
];

// Module-to-page mapping (which pages need which module)
const MODULE_PAGE_MAP = {
  'modules/management.js': ['materials', 'cases'],
  'modules/scripts.js': ['scripts'],
  'modules/community.js': ['notice', 'free', 'praise', 'mistake', 'kanban_purchase', 'kanban_repair'],
  'modules/operations.js': ['staff_supplies', 'checklists', 'calendar', 'marketing'],
  'modules/hire.js': ['hire_postings', 'hire_applicants', 'hire_interviews', 'hire_onboarding'],
  'modules/hr.js': ['hr_dashboard', 'hr_staff'],
  'modules/clinical.js': ['clinical_board'],
  'modules/consult.js': ['consult_records', 'consult_dashboard'],
  'modules/patients.js': ['patients'],
  'modules/patients-stats.js': ['patients_stats'],
  'modules/calls-inbound.js': ['calls_inbound'],
  'modules/calls-outbound.js': ['calls_outbound'],
  'modules/calls-stats.js': ['calls_stats'],
  'modules/leave.js': ['leave_management'],
  'modules/meetings.js': ['meetings'],
  'modules/fee-schedule.js': ['fee_schedule'],
  'modules/funnel.js': ['funnel'],
  'modules/kpi.js': ['kpi_dashboard', 'kpi_daily', 'kpi_targets'],
  'modules/kpi-stats.js': ['kpi_stats', 'kpi_benchmark'],
  'modules/complaints.js': ['complaints', 'complaints_stats'],
  'modules/reservations.js': ['reservations', 'reservation_stats'],
  'modules/wait-times.js': ['wait_times', 'wait_time_stats'],
  'modules/parking.js': ['parking', 'parking_stats'],
  'modules/surveys.js': ['surveys'],
  'modules/settings.js': ['settings'],
  'modules/heatmap.js': ['heatmap'],
  'modules/gamification.js': ['gamification'],
  'modules/reviews.js': ['review_mgmt'],
  'modules/chat.js': [],  // v5.5.0: 레거시 (Phase F 에서 제거 예정)
  'modules/messenger.js': ['messenger'],  // v5.5.0 Phase B
  'modules/onboarding.js': ['onboarding'],
  'modules/recall.js': ['recall'],
  'modules/kakao.js': ['kakao'],
  'modules/reports.js': ['reports'],
  'modules/feedback.js': ['feedback_notes'],
  'modules/pf-index.js': ['pf_index'],
  'modules/knowledge.js': ['knowledge'],
  'modules/referrals.js': ['referrals'],
};

// Reverse map: page → chunk file
const pageToChunk = {};
for (const [file, pages] of Object.entries(MODULE_PAGE_MAP)) {
  for (const page of pages) {
    pageToChunk[page] = file.replace('modules/', '').replace('.js', '');
  }
}

fs.mkdirSync(DIST, { recursive: true });
fs.mkdirSync(path.join(DIST, 'chunks'), { recursive: true });

async function build() {
  const { minify } = require('terser');
  const terserOpts = {
    ecma: 2020,
    compress: { dead_code: true, drop_console: false, passes: 2 },
    mangle: { reserved: ['state', 'api', 'apiForm', 'toast', 'h', 'escapeHtml', 'ICONS', 'ICONS_HIRE', 'PFM'] },
    format: { comments: false },
  };

  let totalInput = 0;
  let totalOutput = 0;

  // 1) Build Core Bundle
  let coreBundle = '';
  for (const file of CORE_FILES) {
    const content = fs.readFileSync(path.join(STATIC, file), 'utf8');
    coreBundle += content + '\n';
    totalInput += content.length;
  }

  // Add page-to-chunk map for lazy loader (app.js reads window._PAGE_CHUNK_MAP)
  const lazyLoaderCode = `
/* ═══ Page-to-Chunk Map ═══ */
window._PAGE_CHUNK_MAP = ${JSON.stringify(pageToChunk)};
`;

  coreBundle += lazyLoaderCode;
  
  let coreOutput = coreBundle;
  try {
    const result = await minify(coreBundle, terserOpts);
    if (result.code) coreOutput = result.code;
  } catch(e) { console.warn('Core minification failed:', e.message); }
  
  fs.writeFileSync(path.join(DIST, 'core.js'), coreOutput);
  totalOutput += coreOutput.length;
  console.log(`Core: ${(coreBundle.length/1024).toFixed(1)}KB → ${(coreOutput.length/1024).toFixed(1)}KB`);

  // 2) Build Chunks (individual module files)
  for (const file of CHUNK_FILES) {
    const content = fs.readFileSync(path.join(STATIC, file), 'utf8');
    totalInput += content.length;
    
    let output = content;
    try {
      const result = await minify(content, terserOpts);
      if (result.code) output = result.code;
    } catch(e) { console.warn(`Chunk ${file} minification failed:`, e.message); }
    
    const chunkName = file.replace('modules/', '').replace('.js', '');
    fs.writeFileSync(path.join(DIST, 'chunks', chunkName + '.js'), output);
    totalOutput += output.length;
  }

  // 3) Also build legacy bundle.js (for backward compat)
  let bundle = '';
  for (const file of [...CORE_FILES, ...CHUNK_FILES]) {
    bundle += fs.readFileSync(path.join(STATIC, file), 'utf8') + '\n';
  }
  let bundleOutput = bundle;
  try {
    const result = await minify(bundle, terserOpts);
    if (result.code) bundleOutput = result.code;
  } catch(e) {}
  fs.writeFileSync(path.join(DIST, 'bundle.js'), bundleOutput);

  console.log(`\n═══ Build Summary ═══`);
  console.log(`Total Input: ${(totalInput/1024).toFixed(1)} KB`);
  console.log(`Total Output: ${(totalOutput/1024).toFixed(1)} KB (split)`);
  console.log(`Bundle.js: ${(bundleOutput.length/1024).toFixed(1)} KB (legacy)`);
  console.log(`Core.js: ${(coreOutput.length/1024).toFixed(1)} KB (initial load)`);
  console.log(`Chunks: ${CHUNK_FILES.length} files`);
  console.log(`Reduction: ${((1 - totalOutput/totalInput) * 100).toFixed(1)}%`);
  
  // Size report
  const chunkSizes = [];
  for (const file of CHUNK_FILES) {
    const chunkName = file.replace('modules/', '').replace('.js', '');
    const size = fs.statSync(path.join(DIST, 'chunks', chunkName + '.js')).size;
    chunkSizes.push({ name: chunkName, size });
  }
  chunkSizes.sort((a, b) => b.size - a.size);
  console.log(`\nTop 5 largest chunks:`);
  chunkSizes.slice(0, 5).forEach(c => {
    console.log(`  ${c.name}: ${(c.size/1024).toFixed(1)} KB`);
  });
}

build().catch(console.error);
