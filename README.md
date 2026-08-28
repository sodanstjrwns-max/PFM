# Patient Funnel OS (patient-funnel-manager)

## 🌐 배포 정보
- **Production URL**: https://pfm.kr (커스텀 도메인) / https://patient-funnel-manager.pages.dev
- **Cloudflare Pages 프로젝트명**: `patient-funnel-manager`
- **배포 명령**:
  ```bash
  npm run build
  npx wrangler pages deploy dist --project-name patient-funnel-manager --branch main
  ```
- **마이그레이션 적용(프로덕션)**: `npx wrangler d1 migrations apply pfm-production --remote`

## 🔑 필요한 시크릿 (Cloudflare Pages → Settings → Environment variables)
값은 이 저장소 어디에도 저장하지 않는다. `wrangler pages secret put <NAME> --project-name patient-funnel-manager`로 개별 등록.

| 이름 | 용도 | 필수 여부 |
|---|---|---|
| `JWT_SECRET` | 사용자 인증 JWT 서명 | 필수 |
| `CRON_SECRET` | `/api/cron/tick` 인증 | 필수 |
| `TOSS_SECRET_KEY` | 토스페이먼츠 결제 시크릿 키 | 결제 기능 사용 시 필수 |
| `TOSS_CLIENT_KEY` | 토스페이먼츠 클라이언트 키 | 결제 기능 사용 시 필수 |
| `RESEND_API_KEY` | 이메일 발송(Resend) | 선택 |
| `EMAIL_FROM` | 발신 이메일 주소 | 선택 |
| `OPENAI_API_KEY` | AI 기능(있는 경우) | 선택 |
| `ALLOWED_ORIGINS` | CORS 허용 origin 목록 | 선택 |
| `PS_SERVICE_KEY` | Patient Series 통합 공급자 API 인증 키. **미설정 시 `/api/v1/*` 전체 404** (fail-closed) | PS 통합 사용 시 필수 |
| `PS_HOSPITAL_MAP` | PS 통합 파일럿 매핑, 형식: `전역ID=로컬hospital_id` 콤마 구분 (예: `bdd-001=34653f75-...`) | PS 통합 사용 시 필수 |

## 🔗 Patient Series(PS) 통합 상태
이 서비스는 Patient Series Open API v1의 **공급자(Provider)** 로 동작한다. 소비(Consumer) 역할은 없음.

- **공급 엔드포인트** (인증: `Authorization: Bearer {PS_SERVICE_KEY}` + `X-PS-Hospital-Id: {전역ID}` 헤더, 소스: `src/routes/ps.ts`)
  - `GET /api/v1/funnel` — 10단계 퍼널 스냅샷 `{ stages: [{key,label,count,rate}], as_of }`
  - `GET /api/v1/signals?since=` — 단계별 전환율 급락 신호 (데이터 부족 시 빈 배열)
- **인증 미들웨어**: `src/routes/ps.ts` 상단 `ps.use('/*', ...)` — `PS_SERVICE_KEY` 미설정 시 404, 불일치 시 401, 병원ID 미매핑 시 404
- **로직 위치**: `src/lib/ps-funnel.ts` (기존 `src/routes/funnel.ts`의 `GET /score`와 동일한 실측 카운트 방식을 독립적으로 재구현 — 회귀 위험 차단을 위해 의도적 복제, 리팩터링 아님)
- **소비 측**: `patient-hub` 프로젝트가 `PFM_API_URL` + `PFM_API_KEY` 시크릿으로 위 엔드포인트를 호출

---

> 페이션트 퍼널 운영체제 — 병원 경영 분석/AI 플랫폼
> (※ v5.5.0에서 도입되었던 원내 메신저 기능, 주차권 관리 기능, 분석/KPI·마케팅 메뉴 그룹(KPI 대시보드/주간 인사이트/KPI 통계/벤치마킹/일간 기록/목표 설정/월간 보고서/유입 분석/유입 히트맵/리뷰 관리/만족도 설문/카카오 알림톡)은 이후 버전에서 완전히 제거되었습니다. 매출·마케팅 분석은 별도 SaaS를 사용하며, 전 직원이 함께 쓰는 플랫폼 성격에 맞춰 정리했습니다. 아래 히스토리는 과거 기록입니다.)
> 서울비디치과 + 페이션트 퍼널(PF) 6,000명 대표원장 교육의 노하우를 시스템화한 치과 경영 솔루션.

## 🚨 D1 조회 시 반드시 `--remote` (운영 필수 수칙)

`wrangler d1 execute`는 **`--remote`가 없으면 경고 없이 로컬 DB를 읽는다.**
에러도, 경고도 없다. 2026-07-25에 이 때문에 사고가 날 뻔했다:

> 프로덕션 병원 목록을 조회했다고 믿었는데 실제로는 샌드박스 로컬 DB였고,
> **존재하지 않는 "테스트 병원 43개"를 삭제 대상으로 산정**했다.
> 로컬·원격 숫자가 `182/55/44`로 **완전히 동일**하게 나온 게 이상해서 겨우 멈췄다.
> (실제 프로덕션은 병원 9개 / 환자 12,620명)

**그래서 손으로 `wrangler d1 execute`를 치지 말고 래퍼를 쓴다.**
대상(`local`/`prod`)을 생략하면 **실행 자체가 거부**된다 — 기본값을 두지 않은 게 핵심이다.
"깜빡하면 안전한 쪽으로"가 아니라 "깜빡하면 아예 안 돌아간다".

```bash
npm run db:local -- --command="SELECT COUNT(*) FROM hospitals"   # 로컬
npm run db:prod  -- --command="SELECT COUNT(*) FROM hospitals"   # 프로덕션(경고 출력)
npm run db       # 대상 누락 → 사용법 안내 후 exit 1

npm run db:migrate:local    # 마이그레이션 (로컬)
npm run db:migrate:prod     # 마이그레이션 (프로덕션, --remote 포함)
```

---

## 📅 v5.12.1 — 미래 날짜 검증 + 테스트 격리 (2026-07-25)

v5.12에서 날짜 **형식**은 막았지만 **의미**는 통과하던 구멍을 메웠다.

### 1. 미래 날짜 입력 차단 (실적 데이터만)
`2099-01-01` 매출을 입력하면 그대로 저장되어 월평균·추이 그래프가 왜곡됐다.
연도 오타(`2026`→`2099`) 한 번에 대시보드 전체가 틀어지는 구조였다.

다만 "미래 금지"를 전역 규칙으로 박으면 안 된다 — 성격에 따라 갈랐다:

| 구분 | 정책 | 대상 |
|---|---|---|
| **실적**(이미 일어난 일) | 미래 **거부** (400) | KPI 일일실적, 상담 기록, 일괄 업로드 |
| **계획**(앞으로의 일) | 미래 **허용** | 휴가 신청, KPI 월간 목표 |

- `src/lib/middleware.ts`: `todayKST()`, `isValidPastDate(val, graceDays)`, `isValidPastMonth()` 추가
  - Workers는 UTC로 도니 KST 기준일을 별도 계산 (`+9h`)
- `src/routes/kpi.ts`: `POST /daily` 미래 거부, 일괄 업로드는 미래 행만 **스킵**하고 나머지 반영(`skipped_invalid_dates` 리턴)
- `src/routes/consult.ts`: `POST /`·`PUT /:id` — **날짜 검증이 아예 없던 구간**이라 형식 검증까지 함께 신설
- 에러 메시지에 기준일을 노출: `미래 날짜는 입력할 수 없습니다 (오늘: 2026-07-25)`

### 2. 테스트 상호 간섭 제거 (`tests/_helpers.mjs`)
레이트리밋 검증 스위트가 남긴 잠금 때문에 뒤이어 도는 UI 스위트의 로그인이
429로 막혀 **앱 버그처럼 보이는 유령 실패가 세 번 반복**됐다.

처음 세운 가설("스위트마다 다른 `X-Forwarded-For`를 쓰면 격리된다")은 **틀렸다**.
서버는 `CF-Connecting-IP || X-Forwarded-For` 순으로 IP를 읽는데,
로컬 `wrangler pages dev`가 `CF-Connecting-IP: 127.0.0.1`을 항상 주입한다.
→ 우선순위 앞단이 늘 채워져 테스트의 IP 헤더는 전부 무시되고 한 카운터에 집계된다.

또 잠금 카운터는 **D1 + 워커 프로세스 메모리 양쪽**에 있어서,
D1만 지우면 메모리 카운터가 살아남아 재실행이 1번째 시도부터 429가 됐다.

- `resetRateLimits()` — D1 기록 삭제 (피해자 스위트의 사전 자기방어용)
- `hardResetRateLimits()` + `waitForServer()` — D1 + PM2 워커 재시작으로 완전 초기화
- `suiteEmail()` — 계정 키(`ip|email`)는 이메일로 분리되므로 이게 실제 격리 수단
- 잠금을 만드는 스위트는 **시작 전·종료 후 모두** 완전 청소
- `suiteIP()`는 `@deprecated` 표기 후 프로덕션 대상 실행용으로만 유지

### 검증
- `tests/date-fuzz.mjs` **138/138** (미래 날짜 섹션 포함)
- `tests/rate-limit-scope.mjs` **5/5** — 연속 2회 실행 멱등성 확인, 잔여 기록 0
- 과거 깨지던 순서(rate-limit → date-fuzz → data-integrity)로 재현 시도 → 전부 통과
- `tests/ui-full-menu-sim.mjs` **463/463** (유령 실패 2건 소멸)
- `vitest` 50/50, `data-integrity` 12/12, `ui-value-loop` 16/16, `ui-data-act` 7/7, `ui-sweep-csp` 37페이지 위반 0건

---

## 🛡️ v5.12 — 실사용 시뮬레이션 기반 3대 결함 수정 (2026-07-25)

Claude Opus 5 기념 전기능 실사용 시뮬레이션에서 발견된 결함을 우선순위대로 수정. 기존 UI 스위트가 "화면이 뜨는가"만 보던 사각지대를 API 퍼징·동시성·권한 범위 관점에서 메웠다.

**[P0] 잘못된 날짜 입력이 서버를 죽이던 문제 — 500 × 27건 → 0건**
- 원인: `new Date(x + 'T00:00:00').getDay()`가 `NaN` → 요일 배열 인덱싱이 `undefined` → D1 `bind()`에서 `D1_TYPE_ERROR` → HTTP 500
- `'2026/07/24'`(슬래시)처럼 데스크에서 실제로 칠 수 있는 형식도 포함돼 있어 이론상 결함이 아닌 실사용 사고였음
- `src/lib/middleware.ts`에 `isValidDateString` / `sanitizeDate` / `isValidMonthString` / `safeDayOfWeek` 공용 헬퍼 추가 후 `kpi`·`briefing`·`leave`·`clinical`·`hr` 호출부 치환 → 400 반환
- `kpi/bulk-import`는 잘못된 행만 건너뛰고 `skipped_invalid_dates`로 보고 (한 줄 오타로 배치 전체가 죽지 않도록)
- 깨진 JSON body도 `onError`에서 `SyntaxError`를 분기해 500 → 400

**[P1] 직원 1명의 비밀번호 오타가 병원 전체를 잠그던 문제**
- 원인: 레이트리밋 키가 IP 단독 → 공용 IP를 쓰는 병원에서 데스크 직원이 5회 틀리면 원장·실장까지 5분간 로그인 불가 (시뮬레이션에서 실제 재현)
- 키를 **IP+이메일 2단 구조**로 변경: 계정 단위 5회 / IP 단위 30회
- 개인 오타는 본인만 잠기고, 여러 계정을 훑는 스프레이 공격은 IP 상한이 여전히 차단 (검증: 26번째 시도에서 429)

**[P1] KPI 부분 수정이 미전송 필드를 0으로 날리던 문제**
- 원인: `sanitizeNumber(undefined, 0)` → `0`이 그대로 UPDATE되어 "신규환자 숫자만 고치려다 그날 매출이 소실"되는 사고 가능
- 요청 본문에 실제로 포함된 필드만 갱신하는 PATCH 시맨틱으로 변경 (명시적 `0`은 정상 반영)

**[P2] 환자 등록 연타로 중복 환자 5건 생성**
- `(hospital_id, chart_number)` UNIQUE 부분 인덱스 추가 (`migrations/0047`, 빈 차트번호는 제외)
- 사전 조회 + UNIQUE 위반 캐치로 500 대신 **409 + 기존 환자 안내**

**[P2] 죽은 레거시 번들 제거**
- `public/static/dist/bundle.js`(약 1MB)가 참조처 0곳인데 매 빌드 생성·배포되고 있었음 → 번들러에서 생성 로직 삭제

**신규 테스트 스위트**
- `tests/date-fuzz.mjs` **130/130** — 12종 비정상 날짜 × 10개 엔드포인트 + 정상값 회귀 + 깨진 JSON
- `tests/rate-limit-scope.mjs` **5/5** — 본인 잠금 / 타 계정 무영향 / 스프레이 차단
- `tests/data-integrity.mjs` **12/12** — KPI 부분 수정 보존 / 동시 연타 중복 차단
- `scripts/extract-routes.cjs` — 라우트 목록 자동 추출 (`api-sweep.mjs`가 단독 실행 가능하도록 고정)

**회귀 확인**: `vitest` 50/50, `ui-full-menu-sim` 463/463, `ui-value-loop` 16/16, `ui-data-act` 7/7, `ui-sweep-csp` 37/37 CSP·JS 에러 0건

## 📖 사용설명서 (앱 내 페이지)

가입부터 전체 메뉴 사용법까지 원장님/실장님/데스크 직원 누구나 볼 수 있는 **사용설명서가 앱 안에 내장**되어 있습니다. (외부 PDF 다운로드가 아니라 로그인 후 바로 열리는 실제 페이지입니다.)

- **접속 경로**: 로그인 후 사이드바 최하단 **📖 사용설명서** 메뉴 클릭 (모든 역할(admin/manager/staff)에서 접근 가능)
- **내용**: ① PFM 소개 ② 회원가입 2가지 방법(병원 등록/직원 초대코드) ③ 6단계 초기설정 마법사 ④ 전체 메뉴 투어(9개 그룹) ⑤ 권한별 기능 차이(admin/manager/staff) ⑥ 핵심 업무 빠른 시작 가이드(환자·상담·KPI) ⑦ 직원 초대코드 발급 절차 ⑧ 보안/데이터 안전 ⑨ FAQ
- **구현**: `public/static/modules/help.js` 모듈, 사이드바 `help` 페이지로 등록 (다른 모든 메뉴처럼 지연로딩되는 청크)

## ♿ v5.11.4 — 명암비(Contrast) 전체 점검 + axe-core 자동 회귀 테스트 도입 (2026-07-21)

"화이트 버전에서 글씨가 잘 안 보인다"는 신고를 계기로, 기존 UI 시뮬레이션 스위트가 "기능 동작"만 검증하고 "글씨가 실제로 보이는지(명암비)"는 전혀 체크하지 않는다는 구조적 공백을 발견. axe-core(W3C 표준 접근성 엔진) 기반 자동 회귀 테스트를 신설하고, 라이트/다크 테마 59개 리프 페이지 전체를 6차에 걸쳐 스캔하며 발견된 명암비 위반을 전부 수정.

### 신설: `tests/ui-contrast-check.mjs`
- axe-core를 브라우저에 직접 주입해 `color-contrast` 규칙만 실행 → CSS 변수 중복 선언, `!important` 충돌, 인라인 스타일 오버라이드 등 **원인 불문하고 실제 렌더링 결과** 기준으로 WCAG 2.1 AA(4.5:1) 위반을 탐지
- 라이트/다크 테마 × 59개 리프 페이지 전량 순회, 앞으로 회귀 스위트에 상시 포함
- 발견한 패턴: axe가 측정하는 실제 렌더링 색상은 폰트 안티앨리어싱으로 인해 CSS 값 기준 이론적 명암비보다 1.3~1.4포인트 낮게 나오는 경우가 있음 → 색상 선택 시 4.5:1 최소치보다 충분한 여유(6:1 이상)를 두는 것으로 기준 강화

### 수정한 명암비 위반 (총 6차 스캔에 걸쳐 발견/수정, 최종 0건)
1. PWA 설치 배너 버튼, 칸반 배지, 캘린더 이벤트 칩(다크), LIVE 인디케이터
2. `wait_times` 페이지(막대그래프 색상 분리), `materials`/`cases`/`scripts`의 카테고리 탭(다크 테마) — 탭 자료실 카드의 "undefined" 텍스트 버그(DB `SELECT`문에 `icon` 컬럼 누락)도 동시 발견해 수정
3. `staff_supplies`(다크, `--text-muted` 명도 보정), `knowledge`(투명도/색상 3건), `gamification`(빈 상태 CSS 변수화), `hire_interviews`(상태 배지 → 재사용 가능한 `.status-chip` + `color-mix` 클래스로 리팩터링)
4. `kpi_targets`(다크, 25건) — 요일별 요약/계산 미리보기의 하드코딩 색상 전면 교체: 텍스트에 알파채널 접미사(`${color}88`)를 붙여 색을 희석시키던 안티패턴 제거, 흰 배경 박스에 텍스트색을 명시하지 않아 다크테마 상속색과 충돌하던 버그 수정, 파랑/보라 액센트 명도 강화
5. 캘린더 이벤트 칩 — 다크 테마만 `color-mix` 처리되어 있어 **라이트 테마**에서 인라인 원색이 그대로 노출되던 버그(4차 스캔 이후 5차 재검증 중 발견) 수정

### 검증
- `tests/ui-contrast-check.mjs` 최종(6차) 실행: **59페이지 × 2테마 전체 위반 0건**
- `npx vitest run` 50/50(당시 표기 73/73은 오기 — v5.12에서 정정), `tests/ui-full-menu-sim.mjs` 487/487, `tests/ui-data-act.mjs` 7/7, `tests/ui-value-loop.mjs` 16/16, `tests/ui-sweep-csp.mjs` 32페이지 CSP/JS 에러 0건 — 전체 회귀 스위트 재확인 통과

## 🔀 v5.11.3 — 레거시 시스템 통합: 리뷰/수가표 데이터 병합 (2026-07-15)

v5.11.2에서 "프로덕션 데이터 위험"으로 별도 작업으로 미뤄뒀던 2개 중복 시스템을 실제 통합 완료. (앱이 아직 실서비스 전이라 백업 없이 바로 진행)

### 1. 리뷰 관리 통합: `reviews` → `review_management`
- 레거시 `reviews`(단순 CRUD, 85 rows) 데이터를 서바이버 시스템 `review_management`(감정분석/응답추적/태그/고정 지원)로 전량 이전
- 이전 시 `review-management.ts`의 긍정/부정 키워드 알고리즘을 그대로 재사용해 `sentiment` 산출, `reply` 존재 여부로 `response_status`(completed/pending) 결정
- 신규 ID는 `rv-lg<원본UUID 앞10자리>` 규칙으로 충돌 없이 생성(로컬+프로덕션 통합 102개 ID 전수 유일성 확인)
- 백엔드 `/reviews` 라우트(`community.ts`) 제거, 프론트 `renderReviews`(`operations.js`) 제거, nav/titles/switch-case 전부 정리
- **프로덕션 결과**: `review_management` 530 → **615 rows** (원본 `reviews` 테이블은 삭제하지 않고 그대로 보존 — 롤백 안전장치)

### 2. 수가표 통합: `pricing` → `fee_items`/`fee_categories`
- 레거시 `pricing`(전 직원 열람 가능, 만원 단위 최소~최대 range, 14 rows)을 서바이버 시스템 `fee_items`(원 단위 base/discount point price)로 이전
- 단위 변환: `base_price = price_max × 10000`, `discount_price = price_min × 10000`(최소=최대인 경우 NULL)
- 카테고리는 `(hospital_id, name)` 완전 일치 시 기존 `fee_categories` 재사용, 불일치 시 신규 생성(아이콘/컬러는 `fee-schedule.js`의 팔레트에서 순환 할당)
- **권한 모델 충돌 해결**: `pricing`은 전 직원 열람 가능이었으나 `fee_schedule`은 관리자 전용이었음 → `fee.ts`의 GET `/categories`, `/items`에서 `requireRole('admin','manager')` 제거(쓰기 라우트는 관리자 전용 유지). 프론트 `fee-schedule.js`는 `isManager`가 원래 쓰기 버튼만 가렸을 뿐 데이터 조회는 이미 전 역할 공통이었어서 변경 불필요
- 백엔드 `/pricing` 라우트(`materials.ts`) 제거, 프론트 `renderPricing`/`openAddPricingModal`(`management.js`) 제거, nav/titles/switch-case 정리(단, `fee_schedule` nav 항목의 관리자 전용 노출 제한도 함께 해제)
- **프로덕션 결과**: `fee_items` 12 → **26 rows**, `fee_categories` 2 → **7 rows** (원본 `pricing` 테이블 보존)

### 3. 2차 참조 수정
- `pf-index.ts`: `computeObjective()`의 `FROM reviews` → `FROM review_management`
- `dashboard.ts`: Q1 집계 쿼리 `FROM pricing` → `FROM fee_items` (프론트 호환을 위해 응답 JSON 키명 `pricing`은 유지)
- `bundle-frontend.cjs`: `MODULE_PAGE_MAP`에서 `management.js`의 `pricing`, `operations.js`의 `reviews` 청크 매핑 제거
- `index.tsx` 라우트 마운트 주석에서 stale `reviews`/`pricing` 언급 정리

### 검증
- `npx vitest run` **73/73 통과**
- `tests/ui-full-menu-sim.mjs` **487/487 통과** (admin 59/59 리프, staff 57/57 리프 — `pricing`/`reviews` 제거로 61→59, `fee_schedule`을 `MANAGER_ONLY_PAGES`에서 제외해 staff 노출 페이지 +1)
- `tests/ui-data-act.mjs` **7/7 통과**
- API 레벨 직접 검증: 신규 가입→샘플 데이터 주입→대시보드 조회 시 `fee_items` 기반 `pricing` 카운트 정상 반영 확인
- `tests/ui-sweep-csp.mjs`/`ui-value-loop.mjs`: 이번 병합과 무관한 기존 산발적 플레이키(랜덤 페이지 pageerror, git stash로 구버전에서도 동일 재현) 확인 — 병합 범위 밖 이슈로 별도 트래킹 필요

### 남은 저위험 작업 (선택)
- `scripts/gen_demo_seed.cjs`: dev용 시드 생성기가 여전히 `pricing` 테이블을 시딩하는 코드 포함 — 런타임에 실행되지 않는 개발 도구이므로 낮은 우선순위로 보류
- `tools/seed-boards.sql`, `scripts/mega-seed.sql`: `reviews` INSERT 문 잔존 — 개발용 1회성 시드 스크립트, 낮은 우선순위로 보류

## 🗂️ v5.11.2 — 사이드바 9그룹 재설계 + 모달 하단 버튼 전역 수정 (2026-07-15)

### 1. 모달 하단 등록/취소 버튼 사라짐 버그 전역 수정
- **증상**: 필드가 많은 모달(예: 🦷 환자 등록)에서 하단 등록/취소 버튼이 스크롤 없이 보이지 않음
- **원인**: `.modal-header`는 `position: sticky`였지만 `.modal-footer`는 고정되지 않아, 본문이 길어지면 footer가 뷰포트 밖으로 밀려남
- **수정**: `public/static/style.css` `.modal-footer`에 `position: sticky; bottom: 0` + 배경/그림자 추가 — **앱 전체 26개 모달(8개 파일)에 동시 적용**
- 검증: `tests/verify-modal-footer-fix.mjs`(신규, 9/9) — 환자 등록 모달 + 비품 주문 모달 스팟체크, sticky 동작(스크롤 위/아래 모두 footer 노출) 확인

### 2. 사이드바 메뉴 3단계 전수조사 → 9그룹 재설계
전체 메뉴 계층을 3단계로 전수조사한 결과 발견된 구조적 문제(8개 평면 그룹 + 4개 최상위 고립 항목, 아이콘 폴백 버그 다수, orphan 페이지 2건)를 근본적으로 재설계.

**신구조 (8그룹→9그룹, `public/static/app.js` `getNavConfig()`):**
- 🏠 대시보드 / 📡 진료보드 (그룹 아닌 최상위 바로가기, 기존 유지)
- 👥 환자 관리 · 📞 콜 관리 · 📊 분석/KPI · 📈 마케팅 (기존 유지)
- 🏥 진료 자료 — 구 '진료 관리'에서 성격을 명확히 하기 위해 개명
- 💼 HR/성장 — 구 'HR'에서 라벨 보강
- 🏢 병원 운영 — **직원용품 주문(staff_supplies) 신규 편입**
- 💬 커뮤니티 (기존 유지)
- 📚 지식/네트워크 — **신규 그룹**. 기존 최상위에 고립되어 있던 메신저/페이션트 인덱스/PF 지식베이스/소개 갤럭시 4개를 그룹으로 통합
- ⚙️ 설정 (계정/시스템, 최하단 독립 유지)

**Orphan 페이지 정리:**
- **`staff_supplies` (직원용품 주문)**: 백엔드·모듈(`operations.js`)·번들 청크 매핑까지 이미 완성되어 있었으나 사이드바 nav 항목이 없어 접근 불가능했던 것을 발견 → 병원 운영 그룹에 정식 편입
- **`briefing` (일일 브리핑)**: nav 항목 없이 고립된 모듈이었고, 대시보드(`dashboard.js`의 `renderBriefingSection()`)에 내용이 이미 중복 구현되어 있던 것을 확인 → 모듈 파일(`modules/briefing.js`) 삭제 + 번들 청크 매핑/스위치 케이스/타이틀 항목 전부 제거. **백엔드 `/api/protected/briefing` API는 대시보드가 그대로 사용 중이므로 변경 없음**

**아이콘 폴백 버그 수정 (약 10곳):**
- `ICONS.monitor || ICONS.dashboard`, `ICONS.phone || ICONS.message`, `ICONS.clock || ICONS.calendar` 등 — 존재하지 않는 아이콘 키를 참조해 매번 조용히 폴백만 타던 죽은 코드를 전부 정리, 유효한 키로 직접 지정

**명시적 범위 제외 (프로덕션 데이터 위험으로 별도 작업 예정, → v5.11.3에서 완료):**
- 리뷰(`reviews`)/리뷰 통합 관리(`review_mgmt`) 데이터 병합 — 85/530 rows
- 수가표(`pricing`)/진료 자료 수가표(`fee_schedule`) 데이터 병합 — 14/12 rows

**검증 (전체 회귀 통과):**
- `tests/ui-full-menu-sim.mjs` **499/499** (admin 61 leaf + staff 58 leaf, briefing 제거·staff_supplies 추가 반영)
- `tests/ui-sweep-csp.mjs` **32/32**, `tests/ui-data-act.mjs` **7/7**, `npx vitest run` **73/73**, `tests/ui-launch-sim.mjs` **12/12** ("메뉴 62개 발견" 확인)
- `tests/verify-sidebar-redesign.mjs`(신규) **5/5** — 그룹 9개+id 일치, 새로고침 시 전 그룹 닫힘 유지(이전 강제-열림 버그 재발 방지), staff_supplies 존재, briefing 제거 확인
- Playwright 스크린샷으로 9그룹 전체 육안 확인 (그룹별 하위 항목 순서/라벨 정확성 확인 후 삭제 — 검증용 임시 아티팩트)

## 🧪 v5.11.1 — 전 메뉴 실사용 시뮬레이션 재검증 + 버그 1건 수정 (2026-07-14)

### 검증 범위 (`tests/ui-full-menu-sim.mjs`, 신규)
- `getNavConfig()` 실제 사이드바 구조에서 추출한 **리프 페이지 61개 전수** (그룹 헤더 8개 제외)
- **admin / staff 두 역할**로 각각 순회 → 역할별 사이드바 노출 여부(`fee_schedule`·`kpi_targets`·`kakao` 등 manager 전용 4종)까지 구분해 오탐 없이 검증
- 페이지별: 빈 화면 여부 / JS 에러 / CSP 위반 / API 5xx / 그룹 아코디언 토글 / 주요 "추가" 버튼→모달 오픈(환자·퍼널·컴플레인·회의록·연차) / 검색 인터랙션
- **결과: ✅491 / ❌0** (역할별 60+57 페이지 × 4항목 + 부가 시나리오)

### 발견 및 수정
1. **주간 인사이트 모달 ESC 키 미지원** (`public/static/modules/dashboard.js` `showWeeklyInsightsModal`)
   → 로그인 시 자동 표시되는 이 모달만 다른 모달들과 달리 ESC keydown 리스너가 없어 배경 클릭/버튼 클릭으로만 닫혔음
   → `overlay.onkeydown` 추가로 전 모달 공통 UX(ESC 닫기) 일치시킴

### 회귀 확인
- 기존 스위트 전체 재실행: `ui-sweep-csp`(32p) / `ui-value-loop`(16) / `ui-data-act`(7) / `ui-launch-sim`(12) — **전부 통과**
- `vitest run` **73/73 통과**

## 🧪 v5.11.0 추가 — 수천 명 스케일 데이터 검증 + 프로덕션 배포 (2026-07-04)

### 대량 데이터 검증 (합성 시드 기준)
- **시드 규모**: 병원 40곳 (메가 1곳 직원 120명 + 일반 39곳 25명) / 직원 1,095명 / 메시지 118,500건 / 읽음 297,000건 / 환자 27,500명 — DB 113MB
- **쿼리 감사** (`scripts/query-audit.cjs`): 핫쿼리 14종 EXPLAIN QUERY PLAN 풀스캔 탐지 + 실측 → **ALL CLEAR (전부 <5ms)**
- **동시성 부하** (`tests/load-concurrency.mjs`): **9/9 통과**
  - 60명 동시 로그인 / 폴링 스톰 600 req 무오류 / 읽기 혼합 90 req 무오류
  - 같은 채널 20명 동시 발송 → **유실/중복 0건**
  - 멀티테넌트 격리: 타 병원 채널 읽기/쓰기 차단 + 폴링 presence 격리 확인

### 발견 및 수정
1. **마이그레이션 0046** (`0046_scale_indexes.sql`): 환자 목록이 TEMP B-TREE 정렬을 타던 것 발견
   → `idx_patients_hospital_created` 등 4종 인덱스 추가 (4.9ms → **0.7ms**)
2. **poll unread 카운트 LIMIT 100 캡**: 오래 안 읽은 멤버가 채널당 수천 행을 매 폴링마다 스캔하던 것 차단 (UI는 어차피 99+ 표시 — D1 rows_read 과금 절감)

### 프로덕션 배포 ✅
- 마이그레이션 0045+0046 원격 적용 → `wrangler pages deploy` 완료
- 검증: 루트 200 (0.2s) / plans 엣지 캐시 확인 / 신규 가입→보호 API→poll fast-path→구독 상태 전 경로 200

---

## ⚡ v5.11.0 — 수평 확장 최적화: 수백~수천 동시 사용자 대비 (2026-07-04)

> 목표: 병원 수백 곳 × 직원 수십 명이 동시에 폴링을 돌려도 D1 쿼리 폭증 없이 버티는 구조.

### 1. 인증 핫패스 캐시 (`src/lib/middleware.ts`)
- **문제**: 모든 보호 API 요청마다 `users` 실시간 조회 1회 → 3초 폴링 × N천 명 = 인증 검증만으로 초당 수백 쿼리
- **해법**: isolate 로컬 **30초 TTL 사용자 상태 캐시** (`getLiveUserState`)
  - 퇴사/비활성/강등 반영: 즉시 → **최대 30초** (기존 "JWT 7일 박제" 대비 여전히 압도적 개선)
  - 같은 isolate 내 변경은 `invalidateUserAuthCache()` 로 즉시 반영 (hr 직원 수정 라우트 연동)
  - 상태 필드만 캐시 — 토큰/비밀번호 검증과 무관, 보안 표면 증가 없음
- **효과**: 폴링·대시보드 등 반복 호출의 인증 D1 쿼리 **~90% 절감**

### 2. 구독 게이트 캐시
- 체험 만료 게이트(`isTrialLocked`)의 `subscriptions` 조회 → **병원 단위 60초 캐시**
- 결제/해지 성공 시 `invalidateSubscriptionCache()` 즉시 무효화 (billing subscribe/cancel 연동)

### 3. 메신저 적응형 폴링 백오프 (`public/static/modules/messenger.js`)
- `unchanged` 응답 5회 연속부터 3초 → 매회 +1.5초 → **최대 12초**로 점진 완화
- 메시지 발신 / 입력 중 / 채널 전환 / 새 메시지 수신 / 타이핑 감지 시 **즉시 3초 복귀**
- `setInterval` → `setTimeout` 재귀 구조로 전환 (겹침 실행 방지)
- **효과**: 유휴 사용자 폴링 QPS 최대 **1/4** — 서버 fast-path와 합산 시 유휴 부하 대폭 절감

### 4. 로그 보존 정책 (cron tick 3.5단계)
- `error_logs` 90일 / `audit_logs` 1년 초과분 자동 정리 (tick당 최대 500행 배치 — 무한 증식 방지)

### 5. 공개 카탈로그 엣지 캐시
- `GET /api/billing/plans` 에 `Cache-Control: public, max-age=300` — 랜딩 트래픽이 워커까지 오지 않음

- 테스트: vitest **73/73 통과** + 로컬 E2E (가입→인증 캐시 경로→poll fast-path→badge) 검증 완료

---

## 🚀 v5.10.0 — 런칭 마감 패키지: 비번 재설정 + 체험 게이트 + 자동 갱신 청구 (2026-07-03)

### 1. 비밀번호 셀프 재설정 (마이그레이션 0044 `password_reset_tokens`)
- `POST /api/auth/forgot-password` — 이메일로 재설정 링크 발송 (Resend API, `src/lib/email.ts`)
- `POST /api/auth/reset-password` — 토큰 검증 후 변경
- **보안**: 토큰 SHA-256 해시만 저장 / 30분 만료 / 1회용 / 계정 열거 방지(동일 응답) / IP 레이트리밋 / 감사 로그
- 프론트: 로그인 화면 "재설정 링크 받기" + `/?reset=<token>` 진입 시 새 비밀번호 다이얼로그
- **RESEND_API_KEY 미설정 시**: 503 + 지원팀 메일 안내 (안전 폴백)

### 2. 체험 만료 게이트 (`isTrialLocked` + authMiddleware)
- **TOSS_SECRET_KEY 설정된 경우에만 활성** — 결제 인프라 준비 전엔 아무도 잠기지 않음
- trial 만료 + **3일 유예** 후 → 보호 API 402 (`reason: trial_expired`)
- 결제/구독/에러리포팅 경로는 항상 허용 (잠긴 상태에서도 결제 가능)
- 프론트: 402 수신 → 구독 안내 오버레이 ("데이터 그대로 보관" 안심 카피 + /pricing CTA)

### 3. 월 자동 갱신 청구 (`chargeRenewals` — cron tick 4단계)
- `active` + billingKey 보유 + `current_period_end` 경과 병원 → 토스 자동 청구 (tick당 최대 20건)
- 성공: period +1개월 연장 / 실패: `past_due` 전환 + `payment_failed` 이벤트 / 네트워크 오류: 다음 tick 재시도
- 만료된 재설정 토큰도 cron에서 정리

### 4. 전자상거래 사업자 정보 (P2)
- /pricing + /legal footer: 상호·대표(문석준)·고객지원 시간 표기 (사업자번호는 등록 후 교체)

### 이메일 발송 활성화 방법
```bash
# https://resend.com 가입 (무료 3,000통/월) → 도메인 인증 → API 키 발급
npx wrangler pages secret put RESEND_API_KEY --project-name patient-funnel-manager
npx wrangler pages secret put EMAIL_FROM --project-name patient-funnel-manager  # 선택
```

- 테스트: vitest 73/73 (billing.test.ts 12건 신규) + ui-launch-sim 12/12 + ui-pricing 13/13

---

## 💳 v5.9.0 — 판매 준비 패키지: 구독/결제 + 요금제 랜딩 + 법적 문서 (2026-07-03)

### 1. 구독 시스템 (마이그레이션 0042 `subscriptions` + `billing_events`)
- **플랜**: Starter 19.9만 / Growth 39.9만 / Enterprise 79.9만~ (연납 15% 할인) — 2026-07 시장조사 기반 가치·경쟁 앵커링
- **기존 병원 무중단 보장**: 백필로 전원 `founding`(파운딩 멤버, 무료 active) 처리
- **신규 가입 = Growth 14일 무료 체험** 자동 시작 (`createTrialSubscription`)
- `src/lib/billing.ts` — 플랜 카탈로그 + 토스페이먼츠 빌링 헬퍼 (SQLite datetime 파싱 안전처리)

### 2. 빌링 API (`src/routes/billing.ts`)
- 공개: `GET /api/billing/plans` — 요금제 카탈로그
- 보호: `GET /api/protected/billing/status`(전체), `POST issue-key`/`subscribe`/`cancel`, `GET history`(admin)
- **토스페이먼츠 자동결제 스캐폴드**: `TOSS_SECRET_KEY` 미설정 시 503 '준비중' — 키만 넣으면 즉시 활성화
- 결제 행위 전부 감사 로그 (`billing.card_registered`/`subscribe`/`cancel`) + `billing_events` 이력

### 3. 공개 페이지 (`src/pages/pricing.ts`, CSP 준수)
- `/pricing` — 요금제 랜딩 (월/연 토글 `public/static/pricing.js`, 수강생 파운딩 배너, FAQ)
- `/legal/privacy` · `/legal/terms` · `/legal/sla` — 개인정보 처리방침(수탁자 구조 명시)/이용약관/SLA(가용성 99.5~99.9% + 크레딧)

### 4. 인앱 UI
- 앱 상단 **체험 배너** (`#trialBanner`): trial 남은 일수 / 3일 이하 강조 / past_due 경고 — 세션 캐시, 실패 무지장
- 설정 > **구독 관리** 섹션 (원장 전용): 플랜/상태 배지, 체험 D-day, 해지, 파운딩 멤버 안내
- 테스트: `tests/ui-pricing.mjs` 13/13 통과 (토글·법적문서·구독섹션·체험배너·CSP 0건) + vitest 61/61

### 결제 활성화 방법 (공식 오픈 시)
```bash
npx wrangler pages secret put TOSS_SECRET_KEY   # 토스 시크릿 키
npx wrangler pages secret put TOSS_CLIENT_KEY   # 토스 클라이언트 키
```

---

## 🔐 v5.8.0 — 감사 로그(Audit Trail) + CSP 전면 봉인 (2026-07-02)

### 1. 시스템 전역 감사 로그 (마이그레이션 0041 `audit_logs`)
- `src/lib/audit.ts` — `writeAudit`/`auditFromCtx` (fire-and-forget, 메인 플로우 무중단)
- **기록 지점 12곳**: 로그인/직원합류 · 권한/재직상태 변경(before/after) · 초대코드 생성/취소 · 환자 비활성화 · 퍼널/소개관계/리뷰 삭제 · 연차 승인/반려/타인취소 · CSV 내보내기
- `GET /api/protected/admin/audit-logs` (admin 전용, 액션 접두어 필터 + 페이지네이션 + total)
- 설정 페이지 하단 **감사 로그 뷰어** (필터/새로고침/페이징, 원장 전용)

### 2. CSP `script-src-attr 'none'` — 인라인 핸들러 129곳 전면 제거
- `modules/actions.js`: **data-act 이벤트 위임 + 미니 인터프리터** (eval/Function 미사용, deny-list + 할당 화이트리스트 → 속성 주입돼도 코드 실행/데이터 유출 불가)
- codemod(`scripts/codemod-inline-handlers.cjs`)로 onclick/onchange/onkeyup/hover 전량 → `data-act*` 전환
- `script-src` 폴백에서도 `unsafe-inline` 제거 — **인라인 스크립트 실행 경로 완전 차단**
- 검증: data-act UI 7/7, 전메뉴 32페이지 스윕 CSP 위반 0건, Vitest 61/61

## 🌐 프로덕션 배포 (v5.7.2 — 2026-07-02)

- **Production**: https://patient-funnel-manager.pages.dev
- **GitHub**: https://github.com/sodanstjrwns-max/PFM
- **크론 워커**: https://pfm-cron.sodanstjrwns.workers.dev (`*/5 * * * *` — 5분마다 `/api/cron/tick` 자동 호출)
- **Secrets(프로덕션)**: `JWT_SECRET`, `CRON_SECRET` (wrangler pages secret)
- **D1**: `pfm-production` (마이그레이션 0040까지 적용) / **R2**: `pfm-assets`

## 🔐 v5.7.2 — 5차 감사: 인증 계층 강화 (2026-07-02)

### 토큰 role 박제 방지 — authMiddleware 실시간 DB 검증
- JWT 발급 후 7일간 role이 토큰에 "박제"되던 구멍 봉인 — **매 요청 DB에서 role/is_active/work_status 실시간 확인** (PK 단건 조회, ~1 row read)
- 퇴사·비활성 직원의 발급済 토큰 **즉시 401** / 강등·승격 **즉시 반영** (토큰 재발급 불필요)
- hospital_id 토큰↔DB 정합 검증
- ✅ E2E: staff 토큰 → DB 승격 → 같은 토큰 403→200 / 비활성화 → 즉시 401

### 로그인·초대코드 방어 강화
- `is_active=0` 계정 로그인 차단 + 퇴사/비활성 체크를 비밀번호 검증 **이후**로 이동 (계정 열거 방지)
- `POST /join` + `GET /invite/:code`에 IP 레이트리밋 (5회 실패 → 5분 잠금) — 초대코드 무차별 대입 차단 ✅ E2E: 6번째 429
- 초대코드 생성: `Math.random` → **CSPRNG** (혼동문자 제외 30자 × 8자리 = 6.5×10¹¹ 조합)

### 프론트 UI ↔ 백엔드 권한 정책 동기화 3건
- feedback 해결/보관, leave 연차취소, meetings 수정 버튼 — manager에게도 노출 (백엔드는 이미 허용이었으나 UI가 숨김)

## 🔐 v5.7.0 — 보안 강화 3종 + 테스트 기반

### 1. httpOnly 쿠키 인증 (localStorage JWT 폐기)
- 로그인/가입/합류 시 `pfm_auth` httpOnly 쿠키 발급 (Secure, SameSite=Lax, 7일)
- authMiddleware: **쿠키 우선 + Bearer 폴백** (전환기 호환, API 클라이언트 지원)
- `POST /api/auth/logout` (쿠키 제거) / `POST /api/auth/cookie-sync` (레거시 자동 마이그레이션)
- 프론트: localStorage 토큰 저장 중단 → XSS로 토큰 탈취 불가

### 2. Vitest 유닛 테스트 61개 (`npm test`)
- `tests/funnel-sync.test.ts` — 온도(5)↔퍼널(10단계) 매핑 + round-trip (15)
- `tests/totp.test.ts` — RFC 6238 표준 벡터 + Base32 + 백업코드 (24)
- `tests/permissions.test.ts` — requireRole 매트릭스 + 금액 마스킹 + JWT 변조/만료 (14)
- `tests/escalation.test.ts` — throttle 게이트 + L1/L2/L3 트리거 규칙 (8)

### 3. CSP 인라인 스크립트 차단
- 인라인 `<script>` 4곳 외부화 (theme-init / boot-loader / survey-page / report-print)
- `script-src-elem`에서 `unsafe-inline` 제거 → 주입형 `<script>` 태그 차단
- `script-src-attr`는 유지 (기존 onclick 핸들러 76곳 호환 — 점진 리팩토링 대상)
- `base-uri 'self'` / `form-action 'self'` 추가

### 4. 크론 파이프라인 완성 (1회 작업 완료)
- 전용 워커 `pfm-cron` 배포: 5분마다 `POST /api/cron/tick` 호출
- 예약 메시지 발송 + 에스컬레이션 스캔이 **접속자 없이도 보장**
- `cron-worker/` 디렉토리에 소스 포함 (redeploy: `cd cron-worker && npx wrangler deploy -c wrangler.toml`)

## 🛡️ v5.5.1 — 운영 신뢰성 강화 (기능 동결, 품질 올인)

> **기능 추가 없음.** 분산환경 정합성 · 스케줄링 보장 · D1 비용 절감에 집중한 hardening 릴리즈.

### 1. 분산환경(cross-isolate) 정합성 — 마이그레이션 **0040**
Workers isolate 는 콜로마다 별개 + 수시 재생성 → in-memory Map 기반 방어가 실제로는 리셋되던 구멍을 D1 영속 계층으로 봉인.
- **`login_rate_limits` 테이블**: 로그인 브루트포스 방어 2계층화 (in-memory 1차 필터 → D1 영속). 공격자가 엣지 노드를 옮겨도 5회 실패 → 5분 잠금 유지. ✅ E2E: 5회 실패 후 6번째 429 + `locked=1` 확인
- **`system_throttle` 테이블**: 에스컬레이션 스캔 1분 게이트를 원자적 조건부 UPDATE 로 구현 (`meta.changes` 기반 — 동시 스캔 경쟁 없음). ✅ E2E: tick #1 `triggered:1` → 즉시 tick #2 `triggered:0`

### 2. 크론 보장 — `POST /api/cron/tick`
예약 발송이 "누군가 접속해야" 나가던 구멍 제거. 외부 스케줄러(cron Worker / GitHub Actions)가 5분마다 호출.
- 인증: `Authorization: Bearer <CRON_SECRET>` (미설정 시 503 — 실수로 열리지 않음)
- 처리: ① `dispatchAllDue()` 전 병원 예약 메시지 발송 (호출당 50건) ② 활성 병원 에스컬레이션 스캔 ③ 오래된 레이트리밋 행 정리
- ✅ E2E: 503(미설정) / 401(오시크릿) / `scheduled:{sent:1}` + DB `status='sent'` 확인
- **프로덕션 세팅**: `npx wrangler pages secret put CRON_SECRET` 후 외부에서 5분 간격 호출

### 3. 폴링 fast-path — D1 부하 ~90% 절감 (유휴 시)
- 13개 쿼리 전에 **1쿼리 변화 감지** (`has_msg / has_urgent / has_esc` EXISTS 3종) → 변화 없으면 `{unchanged:true}` 경량 응답
- 클라이언트 ~10회마다 `full=1` 재동기화 (읽음수/presence 드리프트 보정)
- 백그라운드 탭 폴링 3초 → 15초 자동 완화, 탭 복귀 시 즉시 full 동기화
- presence 쓰기 스로틀: 폴링마다 UPDATE → 30초당 1회
- ✅ E2E: 유휴 시 `unchanged:true` / 새 메시지 발생 시 full 응답 (`newMessages:1`) 전환 확인

### 4. 빌드/타입 안전망
- `tsc --noEmit` 클린 (attachments.ts FormDataEntryValue 타입 에러 3건 수정)
- **SW 캐시 버전 자동 주입** (`scripts/stamp-sw.cjs`): 빌드 시 `pfm-v<version>-<git hash>` 자동 치환 — "배포했는데 구버전 캐시" 사고 원천 차단
- `package.json` version 5.5.1 로 실버전 동기화

## 🔀 v5.5.0 — Patient Chat 통합 (Phase A + B + C + D + E + F 완료)

> **Latest deploy**: https://df2bd1e9.patient-funnel-manager.pages.dev · main https://patient-funnel-manager.pages.dev
> **Build**: 578.11 kB · 87 modules · D1: 0039 적용

PFM 의 분석/AI 두뇌에 페이션트 챗(v5.5.5) 의 원내 메신저 신경계를 흡수.
"환자 인지 → 상담 → 진료 → 회수 → 추천" 전 과정이 한 OS 안에서 흐름.

### Phase A — 토대 (✅ 완료)
- 마이그레이션 **0035**: 메신저 코어 13개 테이블 (channels / messages / message_reads / message_escalations / urgent_calls / quick_replies / scheduled_messages / messenger_audit_logs / messenger_notification_preferences / hospital_messenger_settings / user_sessions / trusted_devices / channel_members)
- 마이그레이션 **0036**: users 테이블에 TOTP(2FA) + messenger_role + presence 컬럼 추가, PFM role → 메신저 role 자동 매핑
- 신규 라이브러리: `src/lib/messenger-audit.ts` (의료 컴플라이언스 감사 로그), `src/lib/totp.ts` (Web Crypto 기반 2FA)

### Phase B — 메신저 코어 (✅ 완료)
**백엔드 (4개 라우트 + 1개 헬퍼):**
- `src/lib/messenger-helpers.ts` — ID 생성 (`msg_/ch_/esc_/...`), 채널 접근 검증, mention 파싱, 권한 매트릭스 (`hasMessengerPermission`)
- `src/routes/messenger/channels.ts` — 채널 CRUD + 멤버 관리 + 타이핑 인디케이터 + DM + 사용자 디렉토리
- `src/routes/messenger/messages.ts` — 메시지 CRUD + 핀/리액션/읽음/Confirm/스레드/전달/리마인더/검색
- `src/routes/messenger/poll.ts` — 1~2초 폴링 (newMessages/unreadCounts/urgentCalls/userStatuses/pendingConfirms/typing) + 사이드바 배지 + presence 변경
- `src/routes/messenger/init.ts` — 부트스트랩 (📢공지/💼경영/🦷진료/💬상담·데스크/☕휴게실 5개 default 채널 자동 생성, 전 직원 자동 가입) + 병원 설정 CRUD + 알림 설정

**프론트엔드:**
- `public/static/modules/messenger.js` (1,014 줄) — 슬랙 스타일 UI, 사이드바 채널 트리, 메시지 패널, 폴링 기반 실시간, DM, 리액션, Confirm-required, Pin
- 사이드바 메뉴 `💬 메신저` 정식 등록 (`bundle-frontend.cjs` chunk 매핑)

**검증:**
- 로컬: 8개 mutation E2E (메시지 발송→리액션→핀→Confirm→read bar→검색) 전부 성공
- 프로덕션: 5개 default 채널 자동 부트스트랩, 박원장 → 💼경영 채널에 confirm-required + urgent 메시지 발송 ✅

### Phase C — 환자 통합 (✅ 완료)
PFM 환자 1명 = 메신저 스레드 1줄. "환자 카드 + 채팅 + 타임라인" 이 한 줄에서 흐름.

**마이그레이션:**
- **0037**: `patient_threads` (환자당 1줄, 담당자 4명 + 우선순위 + 태그) + `patient_thread_events` (퍼널 변경/온도 변경/치료/결제/메모 등 시스템 이벤트)
- **0038**: `patients` 에 `temperature`, `funnel_stage`, `*_updated_at` 컬럼 추가

**백엔드 (1개 라우트 + 1개 동기화 헬퍼):**
- `src/lib/patient-funnel-sync.ts` — 환자 온도(5단계) ↔ PFM 퍼널(10단계) 결정적 매핑. `cold↔1-2 / warm↔3-5 / hot↔6-7 / patient↔8 / advocate↔9-10`. `syncPatientFunnel()` 한 호출로 `patient_threads` + `patients` 양쪽 D1 batch 동시 갱신.
- `src/routes/messenger/patient-threads.ts` — 환자 스레드 CRUD + 타임라인 + 온도 변경 + 이벤트 추가 + 통계
  - `GET /patient-threads?temperature=&stage=&owner=&priority=&q=` 목록
  - `POST /patient-threads` 생성 (멱등 — 같은 환자면 기존 스레드 반환)
  - `GET /patient-threads/:id` 상세 + 환자 카드 + 최근 이벤트 + 최근 메시지
  - `PATCH /patient-threads/:id` 담당자/우선순위/태그/요약 변경
  - `POST /patient-threads/:id/temperature` **온도 변경 (퍼널 자동 동기화) — 시그니처 API**
  - `POST /patient-threads/:id/events` 수동 이벤트 추가 (치료/결제/메모)
  - `GET /patient-threads/:id/events` **통합 타임라인** (이벤트 + 메시지 한 응답)
  - `POST /patient-threads/:id/archive` / `unarchive`
  - `GET /patient-threads/stats/summary` 병원 단위 퍼널 분포 (온도별/단계별 환자 수)
  - `GET /patients/:patientId/thread` 편의 라우트 (환자 ID → 스레드)

**검증 (로컬 16개 E2E + 프로덕션 라우트 등록 확인):**
- ✅ 스레드 생성 멱등성 (같은 환자 2번 → `created:false`)
- ✅ 온도 cold → warm 시 퍼널 자동 1 → 3 (warm 범위 기본값)
- ✅ 퍼널 6 직접 지정 시 온도 자동 hot (반대 방향 동기화)
- ✅ **`patients` 테이블도 동시에 hot/6 으로 갱신됨** (D1 batch 원자성)
- ✅ 통합 타임라인에 이벤트(thread_created, temperature_change, funnel_change, treatment) + 메시지 인터리브
- ✅ `messages.patient_thread_id` 첫 사용 — 채널 메시지가 환자 스레드와 연결됨
- ✅ 잘못된 온도(`lukewarm`) → 400, 변경 없음 → `updated:false`

### Phase D — 실시간 + 긴급콜 + 에스컬레이션 엔진 (✅ 완료)
메신저가 "수동 채팅" 에서 "미확인 메시지가 알아서 위로 올라가는 신경계" 로 진화. Durable Object 없이 폴링 + in-memory throttle 만으로 운영급 에스컬레이션 구현.

**백엔드 (3개 신규 파일 + 2개 hook):**
- `src/lib/escalation-engine.ts` — confirm-required 메시지 자동 승격 엔진
  - **1분 in-memory throttle** (`Map<hospitalId, lastScanAt>`) — 폴링 트래픽에도 DB 부하 차단, `force:true` 로 우회
  - **L1 (기본 10분)**: 미확인 시 채널 멤버 + 발송자 전원 알림
  - **L2 (기본 20분)**: 추가로 `messenger_role IN (owner/admin/manager/team_lead)` 알림
  - **L3 (기본 40분)**: 병원 owner + admin 전원 알림
  - **Idempotency**: `(message_id, level)` UNIQUE — 재스캔해도 중복 발사 없음
  - 모든 트리거를 `messenger_audit_logs` 에 `escalation.l1/l2/l3` 로 기록
- `src/routes/messenger/urgent.ts` — 긴급콜 6개 라우트
  - `POST /urgent` 발송 (call_type: urgent/emergency/code_blue, target: user/channel/all, 멀티테넌트 검증)
  - `GET /urgent?status=&limit=` 목록 / `GET /urgent/:id` 상세
  - `POST /urgent/:id/ack` (acknowledged_by JSON 배열에 추가, active→acknowledged)
  - `POST /urgent/:id/resolve` (발송자 본인은 항상, 외엔 `urgent.resolve` 권한)
  - `GET /urgent/stats/summary` (active/acknowledged/resolved_today/total_today)
- `src/routes/messenger/escalations.ts` — 에스컬레이션 조회 4개 라우트
  - `GET /escalations` 전체 (audit.read 권한, level 필터, 메시지+발송자+채널 조인)
  - `GET /escalations/me` 내 것만 (notified_user_ids 포함 — 배지용)
  - `GET /escalations/stats/summary` (l1/l2/l3/today/total)
  - `POST /escalations/scan` (`force:true` 로 throttle 우회, settings.update 권한)
- `src/routes/messenger/poll.ts` (modified) — 폴링 응답마다 `scanAndEscalate` + `getUserEscalations` 자동 실행 (try/catch 안전), 응답에 `escalations` + `newEscalations` 두 필드 추가

**검증 (로컬 11+5개 E2E + 프로덕션 라우트 등록 확인):**
- ✅ 긴급콜 6 시나리오 모두 통과 (Code Blue 생성 → 다중 ack → resolve → 권한 검증 → 통계 → 폴링 인입)
- ✅ **L1+L2+L3 동시 트리거**: 메시지 `created_at` 을 45분 전으로 조작 → `force` 스캔 → `triggered_count:3` (L1/L2/L3 각각 1건)
- ✅ 통계 정확: `{l1:1, l2:1, l3:1, today:3, total:3}`
- ✅ **Idempotency**: 즉시 재스캔 → `triggered_count:0`
- ✅ 폴링 응답에 escalations 3건 자동 인입
- ✅ 프로덕션 5개 라우트 모두 HTTP 401 반환 (등록 확인 — 비인증 차단)

**Phase D 의 한 줄 약속:**
> 원장님이 "수액 빠짐" 같은 confirm-required 메시지를 보내고 10분 동안 아무도 확인 안 하면, **시스템이 알아서 데스크 매니저(L1)에게 알리고, 20분 지나면 진료실장(L2)에게, 40분 지나면 원장님(L3)에게 자동으로 올라갑니다.** 동시에 긴급콜로 화면이 빨갛게 됩니다. 🚨

### Phase E — R2 파일 + AI 강화 (✅ 완료)
대화에 X-ray, 진료 동의서, 진단 사진이 붙고, GPT-4o-mini가 환자 하나다를 읽어 "지금까지 흐름 요약 + 다음 액션 + 이탈 위험"을 한 화면에 채워 주는 단계.

**마이그레이션:**
- **0039**: `messenger_attachments` (R2 메타, hospital_id path prefix로 cross-tenant 차단) + `patient_thread_ai_insights` (3종 인사이트 이력 캐시, context_hash 기반 invalidation) + `messages.attachment_count` 컬럼 추가

**백엔드 (4개 신규 파일):**
- `src/lib/r2-helpers.ts` — R2 업/다운로드 + MIME 화이트리스트(15개) + 25MB 한도 + `hospitals/{hospital_id}/attachments/{att_id}/{filename}` 멀티테넌트 키 컨벤션
- `src/routes/messenger/attachments.ts` — 파일 6개 라우트
  - `POST /attachments/upload` (multipart, channel_id/patient_thread_id/message_id 멀티테넌트 검증)
  - `GET /attachments/:id` 메타 / `GET /attachments/:id/download` (Workers proxy, presigned URL 안 씬 — 권한 매번 검증)
  - `DELETE /attachments/:id` (soft-delete + R2 실 제거, 업로더 본인/관리자)
  - `POST /messages/:id/attach` (미포함 업로드를 메시지에 사후 attach)
  - `GET /messages/:id/attachments`, `GET /patient-threads/:id/attachments`
- `src/lib/thread-ai.ts` — 환자 스레드 AI 엔진 (3종 인사이트)
  - **summary** — `headline/current_stage/key_points/concerns/wins`
  - **next_actions** — `priority_action/next_actions[]/talking_points/risks_if_ignored`
  - **risk_assessment** — `risk_level/score/signals/recommended_intervention/estimated_dropout_probability`
  - 컬르다 컬러서닛: 환자 카드 + 최근 이벤트 30 + 메신저 대화 50줄
  - **컬러스마트 캐싱**: `(message_count, event_count)` 일치 시 재사용, 새 이벤트/메시지 생기면 자동 미스 → 재생성
  - `force_refresh:true` 로 우회 가능
  - summary 생성 시 `patient_threads.summary` 를 headline으로 자동 갱신
  - 토큰 사용량은 기존 `ai_usage_log` 에 `thread_summary` 등 feature로 적재 → v5.4.0 비용 대시보드와 상호 호환
- `src/routes/messenger/thread-ai.ts` — AI 4개 라우트
  - `POST /patient-threads/:id/ai/:type` (생성/갱신, `{force_refresh}`)
  - `GET /patient-threads/:id/ai/:type` (최신 캐시 조회, 새 호출 안 함)
  - `GET /patient-threads/:id/ai` (3종 한꺼번에)
  - `GET /patient-threads/:id/ai/history/list` (생성 이력 + 토큰 사용량 감사용)

**검증 (로컬 13개 E2E + 프로덕션 11개 라우트 등록 확인):**
- ✅ 텍스트 업로드 → 다운로드 완전 일치 (Content-Length 78, 한국어 원본 복원)
- ✅ 허용되지 않는 .exe (`application/x-msdownload`) → HTTP 415 거부
- ✅ 멀티테넌트 IDOR 검증: 다른 병원 channel_id/thread_id/message_id → 403
- ✅ 스레드 체부 올바르게 존레 표시, 삭제 후 다운로드 → 404 (R2 + DB 둘 다 제거)
- ✅ **AI summary 실호출**: GPT-4o-mini가 김민지 환자 이벤트(임플란트 2차 수술 + 통증 호소)에서 **`headline: "김민지, 임플란트 2차 수술 후 통증 호소"` + `current_stage: "6/10 - 치료중(hot), 주의 필요"`** 도출 (659 tokens)
- ✅ **AI next_actions**: 우선 액션="통증 관리 상담" (counselor, today) + 3건 액션 + talking_points + risks_if_ignored (934 tokens)
- ✅ **AI risk_assessment**: `risk_level: high, score: 75`, signals 3건 (`high: 통증 호소`)
- ✅ **캐시 hit**: 같은 (msg, event) 컬라우더 재호출 → `cached:True`, 같은 ID 반환 (토큰 절약)
- ✅ **force_refresh:true** → `cached:False`, 새 ID + 새 호출
- ✅ **`patient_threads.summary` 자동 갱신**: AI summary 호출 직후 스레드.summary 컬럼이 headline으로 자동 update (환자 리스트에서 바로 보임)
- ✅ AI 히스토리 2건 기록 (summary 659 + next_actions 934 tokens) — 감사/비용 추적
- ✅ 프로덕션 11개 라우트 모두 HTTP 401 (등록 확인)

**Phase E 의 한 줄 약속:**
> 시간 없는 원장님이 환자 스레드를 열면, **AI가 해당 환자의 임플란트 상담부터 수술 후 통증까지의 전 과정을 5초 안에 요약해 주고, "지금 더 중요한 건 이다" + "이게 이일이면 이런 위험" 까지 구체적으로 제시**합니다. X-ray 파일은 메시지에 드래그로 올리면 R2에 안전하게 저장되어 스레드 타임라인에 바로 표시됩니다. 📎🧠

### Phase F.1 — 직원 디렉토리 + Presence (✅ 완료)
누가 지금 진료실에 있는지, 누가 자리 비웠는지, 누가 방해금지인지 사이드바에서 한눈에. 30초마다 자동 갱신, 클릭하면 바로 DM.

**백엔드 (`src/routes/messenger/directory.ts` — 6 routes):**
- `effectivePresence(stored, last_seen_at)` 계산: 5분 → away 자동, 15분 → offline 자동, DND 는 무조건 유지
- `GET /directory?q=&department=&role=&online=1` 검색/부서/role/온라인 필터
- `GET /directory/me` 본인 카드 + presence
- `GET /directory/departments` 부서별 인원 수
- `GET /directory/stats` online/away/dnd/offline 카운트
- `POST /directory/presence` 수동 presence + location (예: "수술실 3", "원장실")
- `POST /directory/heartbeat` 30초마다 — DND 존중하면서 last_seen 갱신

**UI (`public/static/modules/messenger.js`):**
- 사이드바 좌측 하단에 "동료 · N명" 섹션 추가 — 검색 인풋 + 온라인만 토글 + 새로고침 버튼
- presence dot 색상: 🟢 online / 🟡 away / 🔴 dnd / ⚪ offline
- 동료 클릭 → 1:1 DM 즉시 시작
- 30초 디렉토리 폴링 + 30초 heartbeat (mState.dirInterval, mState.heartbeatInterval)

**검증 (로컬 10/10 + 프로덕션 6개 라우트 401):**
- ✅ /directory/me 본인 카드, /presence dnd 설정, heartbeat (DND 유지), 11명 디렉토리, 부서별 통계, role 필터, online 필터, 검색

### Phase F.2 — 알림 설정 + Quiet Hours (✅ 완료)
22시 이후엔 메신저가 조용해지지만, 긴급콜과 L3 에스컬레이션은 항상 통과. 채널마다 mute/멘션만 따로 설정 가능.

**백엔드 (`src/routes/messenger/notifications.ts` — 5 routes):**
- `GET /notifications/preferences` global + per_channel 분리 응답 (없으면 defaults)
- `PUT /notifications/preferences` 전역 upsert (`__global__` sentinel channel_id)
- `PUT /notifications/preferences/:channelId` 채널별 mute/mentions_only upsert (DND 컬럼은 채널 단위에서는 잠금)
- `DELETE /notifications/preferences/:channelId` 채널 오버라이드 제거 → global 로 fallback
- `POST /notifications/quiet-check` body `{channel_id?, is_mention?, is_urgent?, is_l3_escalation?}` → quiet/override 판정

**Quiet Hours 우회 규칙 (UX 약속):**
1. `is_urgent=true` → **quiet:false, override:true, override_reasons:['urgent_call']** (항상 통과)
2. `is_l3_escalation=true` → **quiet:false, override:true, override_reasons:['l3_escalation']** (항상 통과)
3. 그 외 판정 순서: global mute → DND 윈도우 (자정 넘김 22:00→07:00 지원) → mentions_only → channel mute → channel mentions_only
4. DND 윈도우 안에서도 `is_mention=true && notify_mentions_only` 면 통과

**UI (`public/static/modules/messenger.js`):**
- 사이드바 헤더에 🔔 알림 설정 버튼 추가
- 알림 설정 모달:
  - **전역**: 전체 음소거 / @멘션만 / 🌙 방해금지 시간대 (start/end time picker, 자정 넘김 OK) / 🔊 사운드 / 🖥️ 데스크탑
  - **채널별**: 채널 목록 + 음소거/멘션만 토글 + 초기화 버튼 (즉시 반영)

**검증 (로컬 11/11 통과):**
- ✅ defaults 응답 → 전역 PUT → GET 재확인
- ✅ urgent override / L3 override (override_reasons 정확)
- ✅ 현재 06:20 UTC, DND 22:00~07:00 윈도우 안 → `quiet:true, reason:dnd_window`
- ✅ 채널별 PUT → per_channel 응답에 포함 → DELETE → 정리
- ✅ 프로덕션 4개 라우트 401 (마운트 확인)

**Phase F.1 + F.2 의 한 줄 약속:**
> **사이드바 하단**에서 데스크 매니저가 지금 자리에 있는지, 진료실장이 DND 중인지 한눈에 확인하고 클릭 한 번으로 DM. **🔔 버튼**으로 "22시 이후엔 안 울리되, 환자 응급 콜과 L3 에스컬레이션은 무조건 알림" 같은 인사 정책을 직원 본인이 직접 설정. 🟢🌙

### Phase F.3 — Quick Reply 단축어 + Scheduled Messages 예약 발송 (✅ 완료)
자주 쓰는 멘트를 `/call`, `/done` 같은 단축어로 1초 만에 입력. "내일 아침 9시에 자동 발송" 같은 예약 메시지로 직원 인지 부담 제거.

**백엔드 (`src/routes/messenger/quick-replies.ts` — 6 routes, `src/routes/messenger/scheduled.ts` — 6 routes):**
- Quick Reply: 본인 + 공유(공유는 admin/manager/owner만) — `UNIQUE(hospital_id, COALESCE(user_id,''), shortcut)`
- 6종 placeholder 치환: `{patient_name} {channel_name} {user_name} {my_name} {date} {time}`
- Scheduled Messages: ISO 8601 또는 `YYYY-MM-DD HH:MM`, **1분 후 ~ 90일 한도**, 과거 시각 거부
- **인라인 best-effort dispatcher**: `GET /scheduled` 호출 시마다 호출자의 due 메시지 최대 20건을 `messages` 테이블로 자동 INSERT (별도 cron 없음)
- 모든 mutation은 `messenger_audit_logs` 에 `quick_reply.*`, `scheduled.*` 액션으로 기록

**UI (`public/static/modules/messenger.js`):**
- 입력창에서 `/` 입력 시 단축어 팝업 (↑↓ 선택, Enter 적용, Esc 닫기)
- 📅 예약 발송 모달 (datetime-local, 대기중 예약 목록 + 인라인 취소)
- ⚙️ 단축어 관리 모달 (추가/삭제, 공유 토글)

**검증 (로컬 11/11 통과, QR 8 + Sched 7):**
- ✅ `/call` 사용 시 `{patient_name}/{my_name}/{date}/{time}` 모두 치환 확인
- ✅ 공유 단축어 생성: admin OK / staff 403
- ✅ Scheduled 1분 후 INSERT → `GET /scheduled` 호출로 inline dispatch → `messages` 테이블에서 실제 메시지 확인
- ✅ 과거 시각 / 90일 초과 거부
- ✅ 프로덕션 4개 라우트 401

### Phase F.4 — 운영 대시보드 (✅ 완료)
관리자 한 화면에서 메신저 활성도, 미확인 confirm TOP, 에스컬레이션 이력, presence 분포, 환자 스레드 현황을 한눈에. 감사 로그 필터/페이지네이션도 같은 라우트군 안에서.

**백엔드 (`src/routes/messenger/ops.ts` — 6 routes):**
- `requireAdmin` 헬퍼로 admin/manager/owner 만 통과 (그 외 403)
- `GET /ops/audit?action=&actor_id=&target_type=&since=&cursor=&limit=` — 필터 + 시간 커서 페이지네이션, `has_more / next_cursor`
- `GET /ops/audit/actions` — 지난 30일 사용된 action 종류 + 카운트 (필터 드롭다운용)
- `GET /ops/dashboard` — **8개 어그리거트 동시 조회**: 활성도(today/yesterday/7d) + 채널 TOP 5 + 미확인 confirm TOP + 최근 에스컬레이션 + 예약 메시지 status 분포 + AI 사용량 30d + presence 분포 + 환자 스레드 open/closed
- `GET /ops/activity?days=14` — 일자별 메시지/활성유저/urgent/confirm 카운트 (최대 30일)
- `GET /ops/unconfirmed` — confirm_required 미확인 메시지 (전원 확인 안 된 것만 필터)
- `GET /ops/escalations?days=30` — message_escalations + level 분포 통계 (최대 90일)

**Confirm 추적 스키마 의사결정:**
- 별도 `message_confirmations` 테이블 없음 → `message_reads.confirmed_at IS NOT NULL` 로 일관되게 계산
- 에스컬레이션 테이블은 `message_escalations` (NOT `escalations`)

**UI (`public/static/modules/messenger.js`):**
- 사이드바 헤더에 🛡️ 운영 대시보드 버튼 (admin 전용 — 비-admin이 누르면 403 메시지 표시)
- 8개 KPI 카드 + 채널 TOP 5 테이블 + 미확인 confirm 카드 리스트 + 에스컬레이션 타임라인 + 예약 메시지 status 배지
- 권한 없는 사용자에게는 친절한 안내 (admin/manager/owner 권한이 필요합니다)

**검증 (로컬 6/6 라우트 통과, 프로덕션 6개 401):**
- ✅ `/ops/dashboard`: today=1, top_ch=5, unconfirmed=1, esc=3, presence_total=12
- ✅ `/ops/audit?limit=3`: 3건, has_more=True, first_action=scheduled.create
- ✅ `/ops/audit/actions`: 19종 action 집계
- ✅ `/ops/activity?days=7`: 2일치 데이터
- ✅ `/ops/unconfirmed`: 미확인 1건 (confirmed < total members)
- ✅ `/ops/escalations?days=30`: 3건, `by_level: {1:1, 2:1, 3:1}` (Phase D에서 시드된 L1+L2+L3 그대로 인입)
- ✅ 프로덕션 6개 라우트 모두 HTTP 401

**Phase F 의 한 줄 약속:**
> 원장님이 아침에 출근해서 🛡️ 한 번 누르면, **오늘/어제 메시지 수, 누가 자리비움인지, 어제 밤에 누가 못 본 confirm-required 메시지, AI가 30일 동안 쓴 토큰 비용, 환자 스레드 열린 게 몇 개** — 모두 한 화면. 정상이면 닫고, 빨간 거 있으면 거기서 바로 액션. 📊🛡️

---

### Phase F.1 — 직원 디렉토리 + Presence (✅ 완료)
"누가 지금 진료실에 있는지" 한눈에 보고 바로 DM 시작.

**백엔드 (`src/routes/messenger/directory.ts`, 6 routes):**
- `effectivePresence(stored, last_seen_at)`: DND→DND, offline→offline, 5분 무활동→away, 15분→offline 자동 계산 (수동 dnd는 절대 덮어쓰지 않음)
- `GET /directory?q=&department=&role=&online=1` — 이름/부서/messenger_role 필터
- `GET /directory/me` — 본인 카드 + presence
- `GET /directory/departments` — 부서별 인원 카운트
- `GET /directory/stats` — online/away/dnd/offline 통계
- `POST /directory/presence` — 수동 상태 설정 + location
- `POST /directory/heartbeat` — 30초마다 last_seen 갱신 (offline→online 자동 승격, DND 존중)

**UI (`public/static/modules/messenger.js`):**
- 사이드바에 동료 섹션 추가 (검색 + 🟢 온라인만 토글 + ↻ 새로고침)
- presence dot 5단계 (🟢/🟡/🔴/⚪)
- 동료 클릭 → DM 자동 시작
- 30초 주기 디렉토리 갱신 + 30초 주기 heartbeat ping

**검증**: 로컬 E2E 10/10 통과, 프로덕션 6개 라우트 401 확인. Build 548 kB.

### Phase F.2 — 알림 설정 + Quiet Hours (✅ 완료)
"22시 이후엔 조용히, 단 긴급콜만은 통과시킨다" — 직원 휴식과 환자 응급을 동시에 보호.

**백엔드 (`src/routes/messenger/notifications.ts`, 5 routes):**
- `GET /notifications/preferences` — global + per_channel 분리 응답
- `PUT /notifications/preferences` — 전역 설정 upsert (`__global__` sentinel)
- `PUT /notifications/preferences/:channelId` — 채널별 mute/mentions_only 오버라이드
- `DELETE /notifications/preferences/:channelId` — 오버라이드 제거 (global로 fallback)
- `POST /notifications/quiet-check` — `{channel_id?, is_mention?, is_urgent?, is_l3_escalation?}` → 우회/quiet 판정

**우회 규칙 (UX 약속):**
- urgent_call → 항상 통과 (`override_reasons: ["urgent_call"]`)
- L3 escalation → 항상 통과 (`override_reasons: ["l3_escalation"]`)
- 그 외 판정 순서: global mute > DND window (자정 넘김 22:00→07:00 지원) > mentions_only > channel mute > channel mentions_only

**UI:**
- 사이드바 헤더에 🔔 알림 설정 버튼
- 알림 설정 모달: 전체 음소거 / @멘션만 / 🌙 DND 시간대 (시작/종료 time 입력) / 🔊 사운드 / 🖥️ 데스크탑 / 채널별 오버라이드 (음소거 + 멘션만 + 초기화)

**검증 (로컬 E2E 11/11 통과 + 프로덕션 4개 라우트 401 확인):**
- ✅ defaults 응답 / global PUT / GET 재확인
- ✅ urgent override (DND 윈도우 안에서도 quiet=false, override=true)
- ✅ L3 override
- ✅ DND 22:00~07:00 윈도우, 현재 06:20 UTC → quiet=true, reason="dnd_window", dnd_end_time="07:00"
- ✅ 채널별 PUT/per_channel 응답 포함/DELETE → global fallback
- ✅ Build 555 kB (F.1 548 → F.2 555)

**Phase F.2 의 한 줄 약속:**
> 직원이 22시 이후 휴대폰을 봐도 일반 채팅은 조용하지만, **환자가 긴급콜을 띄우거나 미확인 메시지가 L3까지 올라가면 무조건 알림이 옵니다.** 채널마다 따로 음소거할 수도 있어서, 휴게실 채널은 끄고 진료실만 켜는 식으로 세팅 가능합니다. 🌙

## 🤖 v5.4.0 — AI Insights (배치 1+2 완료)

### 신규 기능 (Batch 2 — AI 차별화)
- **🏆 C-1 페이션트 퍼널 10단계 자동 채점**: 시그니처 무기. 콜→환자→상담→소개까지 10단계 통과율 측정, 가중치(8~12pt) 합산으로 100점 만점 점수 산출. 등급(최상위/우수/양호/보통/미흡) + 약점 TOP 3 + 단계별 액션 제안 자동 생성.
- **🤖 C-2 AI 상담 인사이트**: GPT-4o-mini가 월별 상담 데이터 분석 → 강점/약점/우선순위 액션/상담사별 코칭 자동 생성. 6시간 캐시로 비용 통제.
- **👑 C-3 환자 LTV 분석**: 환자별 평생가치 추정 + 등급(VIP/GOLD/SILVER/REGULAR) + 다음 액션 + 업셀 기회 + 이탈 위험 AI 분석. LTV 랭킹 페이지로 한눈에.
- **🌐 C-4 전국 벤치마크**: 페이션트 퍼널 점수 화면에 익명 집계된 전국 평균 대비 백분위 비교 (콜/환자/동의율/치료확정).

### Batch 1 — 안정화 (v5.3.0)
- 📱 모바일 반응형 (4 breakpoints, 140줄 CSS)
- 🎨 빈 상태 UI 통일 (emptyState 팩토리)
- 💬 에러 메시지 한국어화 (humanizeError)
- ⏳ 스켈레톤/로딩 통일

## 🌌 v4.8 — Patient Referral Universe (소개 갤럭시)

3D 시각화 기반 소개 트리 + 팬 등급 자동 분류 시스템 출시!

### 핵심 신규 기능
- **🌌 3D 소개 갤럭시**: 옵시디언 그래프뷰 스타일 — Three.js + 3d-force-graph
- **💎 팬 등급 자동 분류**: 5단계 (전도사/팬/충성/만족/일반)
- **🔔 등급 변화 내부 알림**: 환자 X, 직원만 봄 (data-driven 응대)
- **📊 영향력 점수**: 소개수 × 50 + 깊이 × 30 + 매출 + 방문 + 만족도

## 🚀 URLs
- **Production**: https://patient-funnel-manager.pages.dev
- **Latest Build**: https://680b8e0e.patient-funnel-manager.pages.dev (v5.11.4 — 명암비 전체 점검 + axe-core 회귀 테스트)
- **Phase F.2 Build**: https://535bf6be.patient-funnel-manager.pages.dev (v5.5.0 — 알림 설정 + Quiet Hours)
- **Phase F.1 Build**: https://c0a8d2e2.patient-funnel-manager.pages.dev
- **Phase E Build**: https://20976dbb.patient-funnel-manager.pages.dev
- **Demo Login**: admin@demo.pf / demo1234

## 📊 시스템 현황 (서울비디치과 데모 데이터)
- 환자 200명, 소개 관계 139건, 누적 소개 매출 5.76억원
- 🌟 전도사 4명 (TOP: 전태현 18명, 김지호 17명)
- 💎 팬 11명 / 💗 충성 7명 / 😊 만족 36명 / 👤 일반 142명

## 🎯 24개 핵심 API 헬스체크: ✅ 23/24 (96%)

## 📦 Tech Stack
- **Backend**: Hono + TypeScript + Cloudflare Workers
- **Database**: D1 (SQLite, 40 마이그레이션) + R2 (첨부파일)
- **3D Visualization**: Three.js r149 + 3d-force-graph 1.73 (CDN)
- **Frontend**: Vanilla JS + Tailwind CSS + Glassmorphism UI
- **Cache**: Service Worker pfm-v4.8.1

## 📋 남은 작업 / Next Steps
- 리뷰(reviews/review_mgmt), 수가표(pricing/fee_schedule) 데이터 병합 — 프로덕션 데이터 위험으로 별도 세션에서 신중히 진행 예정
- 사이드바 9그룹 구조에 대한 사용자 실사용 피드백 수집 후 그룹/라벨 미세조정

## 🔥 Last Updated: 2026-07-22 (사용설명서(PDF, 24p) 제작 및 README 반영 + ui-sweep-csp.mjs stale 페이지 id 정리)
