# Patient Funnel Manager (PF Manager)

## 프로젝트 개요
- **이름**: Patient Funnel Manager
- **목표**: 병의원 통합 관리 플랫폼 - 진료관리, 환자관리, 마케팅, HR, 운영, 커뮤니티를 한 곳에서
- **대상**: 치과, 내과, 피부과 등 병의원 원장 및 스태프
- **버전**: v3.6 "Team Edition" (피드백 노트 — 상·하급자 양방향 성장 시스템)

## 🎯 v3.6 "Team Edition" (2026-04-21)
> "한 번의 지적으로 끝나지 않는다" — 피드백이 성장으로 이어지는 양방향 기록 시스템
- **📝 피드백 노트 게시판** (`/api/protected/feedback`)
  - **상급자**: 하급자의 실수를 기록 + 피드백(개선 방향) 작성
  - **하급자**: 확인 체크박스 + 본인 피드백(본인 입장/개선 계획) 입력
  - **양방향 쓰레드**: 상급자·하급자가 댓글로 계속 대화 가능
  - 기록으로 남기되 "꾸짖음"이 아닌 "성장 포인트"로 자리잡도록 설계
- **🎛️ 메타데이터**:
  - **심각도**: 경미(mild) / 보통(moderate) / 중대(severe)
  - **카테고리**: 진료(care) / 응대(service) / 행정(admin) / 위생(hygiene) / 안전(safety) / 기타
  - **공개범위**: 본인만(private) / 관리자까지(managers) / 전체(all)
  - **상태**: 열림 → 확인완료 → 해결 / 보관
- **👀 받은 피드백 UX** (하급자 관점):
  - 미확인 피드백 카드 빨간 테두리 + "🔴 미확인" 뱃지 + 헤드라인 노출
  - ✅ 체크박스 눌러야 "acknowledged" 상태로 전환
  - 본인 피드백 텍스트 에리어(최대 2000자) — 당시 상황, 개선 계획 자유 서술
  - 확인 후에도 본인 피드백 업데이트 가능 (관리자는 언제든 수정)
- **📤 보낸 피드백 UX** (상급자 관점):
  - 대상자 선택 드롭다운(본인 제외, 활성 직원만)
  - 대상자 확인 전까지 수정 가능 / 확인 후엔 관리자만 수정
  - resolve / archive 상태 변경
- **📊 피드백 통계** (`/api/protected/feedback/stats/summary`) — 관리자 전용:
  - 전체/열림/확인완료/해결/중대 건수
  - 최근 30일 신규 피드백 수
  - 카테고리 TOP 3 (최근 90일)
  - 피드백 많이 받은 직원 TOP 10 (교육 니즈 파악)
- **9개 엔드포인트**:
  - `GET /` (type=sent/received/all), `GET /:id`, `POST /` (작성)
  - `PATCH /:id` (수정), `POST /:id/acknowledge` (확인+본인응답)
  - `POST /:id/status` (해결/보관), `POST /:id/replies` (댓글)
  - `DELETE /:id` (작성자/관리자), `GET /stats/summary`, `GET /users/list`
- **🗃️ 마이그레이션**: `0025_feedback_notes.sql` — feedback_notes + feedback_replies 2테이블, 6개 인덱스
- **🔐 접근 제어**: 본인만(private)은 작성자·대상자만 / 관리자까지(managers)는 admin·manager도 열람 / all은 전 직원
- **검증** (2026-04-21 E2E): 작성 ✅ 수신 확인 ✅ 본인 응답 저장 ✅ 쓰레드 댓글 ✅ 통계 집계 ✅

## 🎯 v3.5 "Weekly Edition" (2026-04-21)
> "발견"을 일회성 이벤트가 아닌 매주 반복되는 습관으로 — 리텐션 엔진 가동
- **📊 주간 인사이트 API** (`/api/protected/insights/weekly`)
  - **지난 7일 vs 그 전 7일** 6가지 지표 자동 비교
  - 매출 / 신환 / 상담 전환율 / 숨은 매출 / 콜 예약전환 / 컴플레인 / 리뷰
  - 각 카드에 **변화율(Δ)** + **한 줄 해석 내러티브** + **액션 페이지 이동** 링크
  - 예: "💎 숨은 매출 +73% — 📞 리콜 한 통이면 이 중 20-30%는 예약 전환 가능"
- **🔔 자동 표시**: 매니저 로그인 시 이번주 미확인이면 자동 모달 (0.8초 delay)
  - `hospitals.settings.weekly_insights_seen[user_week]` 별도 저장 (원장/실장 각자)
  - Dismiss 후 다음 주 월요일까지 배너 숨김
- **📬 대시보드 진입 배너**: 주간 브리핑 준비 알림 (주황+핑크 그라디언트)
- **🧭 네비게이션 메뉴**: 📊 분석/KPI > **주간 인사이트** 항목으로 언제든 재열람
- **🔕 브라우저 알림 자동 발송**: 알림 권한 있으면 `📊 주간 인사이트 브리핑` 네이티브 알림
- **상태 관리 3-엔드포인트**:
  - `GET /weekly` — 카드 + 헤드라인 + 요약 데이터
  - `GET /weekly/status` — 이번주 본 적 있는지 + shouldShow
  - `POST /weekly/dismiss` — 이번주 확인 완료 기록
- **검증** (2026-04-21 샘플 데이터 기준):
  - headline: "💎 숨은 매출 (미결정) +73% — 리콜 한 통이면 20-30%는 예약 전환 가능"
  - 카드 6장 정상 생성 (💰4,398만/👤35명/📊0%/💎630만/📞0%/😠1건)

## 🎯 v3.4 "Insight Edition" (2026-04-21)
> "숫자 보여주기"에서 "가치 발견"으로 — 진짜 아하모멘트 완성
- **🔍 자동 인사이트 엔진**: `/api/protected/onboarding/insights`
  - 샘플 주입 직후 데이터를 분석해 6가지 "발견"을 자동 계산
  - **숨은 매출 기회** = 상담은 받았지만 미결정 환자들의 계획 진료비 합계 (예: 16,750만원)
  - **돌아올 만한 환자** = 180일 이상 미방문 휴면 환자 리스트
  - **전환 대기 상담** = 상담 후 의사결정 안 한 환자 수
  - **응답 대기 리뷰** = 미응대 리뷰(방문율 -23% 영향) 알림
  - **내 상담 전환율 vs 업계 평균(62%)** 자동 비교
  - **소개 환자 비중** = 팬 마케팅 작동 지표
- **🎯 인사이트 모달**: 샘플 주입 완료 시 단순 숫자 카운트 대신 "이런 걸 발견했어요" 카드 4~6장
  - 카드 클릭 → 해당 액션 페이지로 바로 이동 (상담 기록/리콜/리뷰/퍼널/벤치마크)
  - 상단에 핵심 "숨은 매출 ○○만원" 강조 배너
  - 30초 자동 대기 (읽는 시간 충분히 제공)
- **📢 투어 종료 CTA 3배 강화**: 웰컴 투어 마지막에
  - 샘플 버튼 **펄스 애니메이션** + 그라디언트 보더 (시선 자동 유도)
  - 버튼 위에 "👆 여기를 눌러 3분 체험 시작!" **말풍선 힌트** 6초 표시
  - 자동 포커스로 키보드 접근성 확보
- **🎲 샘플 시드 현실화**: 새로 주입되는 샘플 데이터가 더 의미 있게
  - 환자 30%를 "휴면"(200~380일 전 방문)으로 생성 → 리콜 인사이트 즉시 노출
  - `visit_source`에 지인소개 포함 → 소개환자 비중 인사이트 노출
- **🔧 Service Worker 스코프 수정**: `/sw.js` 루트 경로 프록시 + `Service-Worker-Allowed: /` 헤더
  - PWA 등록 에러 완전 제거 (콘솔 에러 0건)
  - 오프라인 캐싱이 전체 앱 범위에 적용됨
- **결과**: 첫 로그인 → 3분 투어 → 샘플 주입 → **"아, 우리 병원에도 이런 숨은 돈이 있구나!"** 순간까지 5분 이내
- **검증**(2026-04-21 샘플 재주입 기준): 숨은 매출 **1억 8,120만원**, 휴면 환자 **11명**, 미응답 리뷰 **6건** 자동 발견 ✅

## 🎯 v3.3 "Complete Edition" (2026-04-21)
- **💛 카카오 알림톡 통합**: SMS 대비 5배 열람률(평균 95%), 알리고 API 연동 일원화
  - 병원별 설정(센더키/발신자ID/사전승인 템플릿), 템플릿 CRUD, 발송 로그, 테스트 발송
  - 리콜/예약확인/정기검진 자동 발송 연계 가능
  - API: `/api/protected/kakao/config|templates|send|logs|test`
- **📄 월간 보고서 & 내보내기**: 원장 보고용 자료를 원클릭으로
  - A4 프린트 최적화 HTML 리포트(환자/매출/상담/콜/컴플레인 요약 + 표)
  - Excel 호환 CSV 다운로드 5종 (환자·상담·일간·콜·컴플레인, UTF-8 BOM)
  - 브라우저 인쇄 → PDF 저장 워크플로우
  - API: `/api/protected/reports/monthly-report|csv/*`
- **🎯 아하모멘트 3배 강화**: 첫 5분 안에 "이거 진짜 쓸만하다" 실감
  1. **축하 컨페티 모달**: 샘플 주입 완료 시 60개 입자 컨페티 + 대형 성공 모달 + "다음 단계 추천" 카드
  2. **오늘의 할 일 체크리스트**: 대시보드 상단 5단계 탐험 가이드(퍼널→벤치마크→상담→리콜→보고서), 진행률 프로그레스 바, 3일 숨기기
  3. **웰컴 투어 스킵 방지**: 2단계 이하 스킵 시 경고 → 두 번 확인, 진행률 localStorage 저장(새로고침 복원)
- **🏆 벤치마킹 대시보드 고도화**: `/api/protected/kpi/benchmark` → 8개 지표 + 백분위 + 타 병원 평균
- **DB 누계**: 24개 마이그레이션, 57+ 테이블, 5개 신규 테이블(recall_rules/tasks, push_subscriptions, notification_preferences, 카카오 설정은 hospitals.settings JSON)

## 🎯 v3.2 "Retention Edition" (2026-04-21)
- **📞 환자 리콜 자동화**: 룰북 기반 매일 자동 대상자 생성 → 오늘의 리콜 큐 → 한 번에 실행
  - 기본 룰 3종 (스케일링 6개월 · 임플란트 1년 · 상담 미결정 7일)
  - 우선순위·채널(전화/SMS/카톡)·스크립트 템플릿 커스텀
  - 예약 전환율 실시간 추적, 월간 리콜 KPI 대시보드
  - API: `/api/protected/recall/rules|generate|tasks|summary`
- **📱 PWA 설치 지원**: manifest.webmanifest + service worker + 설치 프롬프트
  - 홈 화면 앱 아이콘 (안드로이드/iOS), 오프라인 자산 캐싱, 바로가기 3종 (대시보드·리콜·환자)
  - 앱처럼 2초 안에 실행, 네트워크 끊겨도 로그인 화면 로드
- **🔔 브라우저 알림**: 일일 브리핑 리마인더 (매일 9시), 리콜/컴플레인 실시간 알림
  - Web Push 구독 테이블 + 개인 알림 설정 (`notification_preferences`)
  - 서비스 워커 기반 푸시 + 로컬 알림 fallback
- **DB 추가**: migrations/0024 — recall_rules, recall_tasks, push_subscriptions, notification_preferences

## 🎯 v3.1 "Aha Moment Edition" (2026-04-21)
- **✨ 원클릭 샘플 데이터 주입**: 가입 직후 3개월치 실제 데이터(환자40/상담28/콜60/KPI60일/리뷰15/퍼널10단계 분포) 즉시 체험 — API `POST /api/protected/onboarding/seed-sample`, 기존 데이터 있으면 자동 차단
- **🎓 3분 웰컴 투어**: 가입 직후 자동 오버레이로 5개 핵심 기능 소개(퍼널·KPI·상담·HR·보안), 샘플 배너 포커스 유도
- **📖 스토리텔링 랜딩**: "월 6천만 → 연 120억" 원장 스토리, 2.1배 성장/40% 광고비 절감/62% 전환율 실적 배지, 데모 원클릭 로그인
- **🛡️ 신뢰 배지 바**: JWT/PBKDF2/병원별 데이터 격리/언제든 데이터 내보내기 표시 — 로그인 화면 하단 상시 노출
- **⚡ 초기 로딩 76% 개선**: 11.84초 → 2.82초 (preload hint, boot-loader, resource hints, skeleton UI)
- **🎨 SEO/OG 태그**: 소셜 공유 시 의미 있는 프리뷰 표시
- **🧹 프로젝트 대청소**: 907MB → 309MB (-66%), 임시 파일 전량 제거, core dump 615MB 삭제

## 기술 스택
- **Backend**: Hono (TypeScript) on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite) - 18개 마이그레이션, 57개 테이블
- **Storage**: Cloudflare R2 (파일/이미지/이력서)
- **Auth**: JWT (PBKDF2 + Web Crypto API) + Rate Limiting
- **Frontend**: Vanilla JS 모듈 시스템 + CSS (CDN 없이 경량 SPA)
- **Font**: Noto Sans KR (Google Fonts)
- **Bundle**: 31개 모듈 → Terser minified (665KB / gzip 136KB)
- **Security**: XSS/CSRF/IDOR 방지, CSP, HSTS, Input Sanitization

## 데모 계정
- **이메일**: fin2@test.com
- **비밀번호**: pfm2026!

## 현재 완료된 기능 ✅

### 1. 인증 시스템
- 병원 등록 / 로그인/로그아웃 (JWT 7일)
- 초대 코드 직원 가입
- 비밀번호 변경
- Rate Limiting (5회 실패 → 5분 잠금)
- 병원별 데이터 격리 (multi-tenant)

### 2. 대시보드 + 일일 브리핑
- 8개 통계 카드, 9개 퀵 메뉴
- 일일 브리핑 통합 (어제 실적, 월누적, 상담전환율, 출근현황, 알림)
- 월간 리포트 생성

### 3. 진료보드
- 실시간 체어별 환자 배치
- 원장 근무표 연동
- 드래그앤드롭 환자 이동

### 4. 환자 관리
- **환자 DB**: 등록, 검색, 필터, 주소정보
- **환자 통계**: 지역/유입경로/진료과목별 분석
- **Patient Funnel**: 10단계 퍼널 관리
- **상담 기록**: 상담사별 기록, 전환율 분석
- **상담 분석**: 대시보드
- **컴플레인**: 기록 + 통계
- **예약 관리**: 예약/취소/이행률 + 통계
- **대기시간**: 일별 기록 + 통계

### 5. 콜 관리
- 인바운드/아웃바운드 기록
- 콜 통계 분석

### 6. 진료 관리
- **수가표**: 카테고리별 진료 항목, 가격 관리
- **설명자료**: R2 파일 업로드, 프레젠테이션 모드
- **비용 안내**: 시술별 가격대
- **케이스 사진**: Before/During/After
- **상담 스크립트**: 상황-멘트-반론-대응

### 7. 분석/KPI
- **KPI 대시보드**: 월간 목표 vs 실적 (요일별 가중치 적용)
- **KPI 통계**: 기간/요일별 분석
- **일간 기록**: 32개 항목 일일 입력
- **목표 설정**: 매출목표, 신환목표, 보험비율

### 8. 마케팅
- **유입 분석**: 채널별 ROI, 월간 실적
- **유입 히트맵**: 시/도·시/군/구별 환자 분포 시각화 🆕
- **리뷰 통합 관리**: 네이버/구글/카카오 리뷰, 자동 감성분석(긍정/부정/중립), 대시보드, 답변관리 🆕
- **후기 관리**: 플랫폼별 별점/답글
- **만족도 설문**: 설문 생성→발송→응답 수집→NPS 분석

### 9. HR
- **HR 대시보드**: 직원현황, 출석률
- **직원 관리**: CRUD, 권한(admin/manager/staff)
- **성과 게이미피케이션**: 미션관리, 포인트/뱃지, 랭킹 🆕
- **채용 (PF Hire)**: 공고→지원→서류→면접→평가→채용
- **연차 관리**: 연차 잔여일, 신청/승인
- **온보딩**: 신규직원 태스크 관리

### 10. 병원 운영
- 공지사항, 일정관리, 회의록, 체크리스트
- 물품구매/수리정비 칸반보드
- 주차권 관리 + 통계

### 11. 커뮤니티
- 자유게시판, 칭찬하기, 실수노트
- 댓글, 좋아요, 익명
- **📝 피드백 노트** 🆕 v3.6: 상급자 기록/피드백 → 하급자 확인+본인응답 양방향 시스템

### 12. 설정
- 병원 정보 (운영시간, 진료과목 등)
- 층별 공간관리 (체어, 수술실 등)
- 스태프 프리셋, 초대 코드 관리

## 네비게이션 구조
```
대시보드 (+ 일일 브리핑)
├── 📡 진료보드
├── 👥 환자 관리
│   ├── 환자 DB / 환자 통계 / 환자 퍼널
│   ├── 상담 기록 / 상담 분석
│   ├── 컴플레인 기록 / 통계
│   ├── 예약 관리 / 통계
│   └── 대기시간 / 통계
├── 📞 콜 관리
│   └── 인바운드 / 아웃바운드 / 통계
├── 🏥 진료 관리
│   └── 수가표 / 설명자료 / 비용안내 / 케이스사진 / 스크립트
├── 📊 분석/KPI
│   └── KPI 대시보드 / 통계 / 일간기록 / 목표설정
├── 📈 마케팅
│   └── 유입분석 / 히트맵 / 리뷰관리 / 후기 / 설문
├── 💼 HR
│   └── HR대시보드 / 직원관리 / 게이미피케이션 / 채용 / 연차
├── 🏢 병원 운영
│   └── 공지 / 일정 / 회의록 / 체크리스트 / 물품구매 / 주차
├── 💬 커뮤니티
│   └── 자유게시판 / 칭찬 / 실수노트
└── ⚙️ 설정
```

## 주요 API 엔드포인트 (22개 라우트 모듈)

| 라우트 경로 | 모듈 | 주요 기능 |
|-------------|------|-----------|
| `/api/auth` | auth | 로그인, 회원가입, 초대가입 |
| `/api/protected/dashboard` | dashboard | 대시보드, 리포트 |
| `/api/protected/briefing` | briefing | 일일 브리핑 |
| `/api/protected/patients` | patients | 환자 CRUD, 통계, 검색 |
| `/api/protected/consult-records` | consult | 상담기록, 분석, 직원별 |
| `/api/protected/kpi` | kpi | KPI 대시보드, 일간기록, 목표, 통계 |
| `/api/protected/calls` | calls | 콜 기록, 통계 |
| `/api/protected/complaints` | complaints | 컴플레인, 통계 |
| `/api/protected/fee` | fee | 수가 카테고리, 항목 |
| `/api/protected/funnel` | funnel | Patient Funnel |
| `/api/protected/hire` | hire | 채용 전체 |
| `/api/protected/hr` | hr | HR 대시보드, 직원관리 |
| `/api/protected/leave` | leave | 연차 잔여, 신청 |
| `/api/protected/meetings` | meetings | 회의록 |
| `/api/protected/hospital` | hospital | 병원설정 |
| `/api/protected/surveys` | surveys | 설문 CRUD, 발송, 분석 |
| `/api/protected/gamification` | gamification | 미션, 포인트, 랭킹 |
| `/api/protected/review-mgmt` | review-mgmt | 리뷰 CRUD, 감성분석 대시보드 |
| `/api/protected` (materials) | materials | 설명자료, 비용, 케이스, 스크립트 |
| `/api/protected` (community) | community | 게시판, 칸반, 체크리스트, 이벤트 |
| `/api/protected` (clinical) | clinical | 진료보드, 체어, 원장 |
| `/api/protected` (operations) | operations | 예약, 대기시간, 주차 |
| `/api/protected/onboarding` | onboarding | 온보딩 위저드, 샘플 주입, 인사이트 🆕 v3.4 |
| `/api/protected/recall` | recall | 환자 리콜 자동화 🆕 v3.2 |
| `/api/protected/kakao` | kakao | 카카오 알림톡 🆕 v3.3 |
| `/api/protected/reports` | reports | 월간 보고서, 엑셀 내보내기 🆕 v3.3 |
| `/api/protected/insights` | insights | 주간 인사이트 브리핑 🆕 v3.5 |
| `/api/protected/feedback` | feedback | 피드백 노트 (양방향) 🆕 v3.6 |

## 로컬 실행
```bash
npm install
npm run build
npx wrangler d1 migrations apply pfm-production --local
npx wrangler d1 execute pfm-production --local --file=./seed.sql
pm2 start ecosystem.config.cjs
# http://localhost:3000
```

## 배포
- **플랫폼**: Cloudflare Pages
- **상태**: 🟢 운영 중 (v3.6 Team Edition)
- **최종 업데이트**: 2026-04-21

## 최근 운영 이력
- **2026-04-21**: 🧹 대청소 - core dump 615MB + 임시 seed/fix SQL 일괄 제거 (907MB → 309MB, 66% 감량), 데모계정 재생성, 서비스 재기동, API 전수 헬스체크 (13/15 200 OK, 나머지는 루트 없음/정상)
- **2026-03-29**: v2.1 만족도 설문 발송 시스템 완성 (Aligo SMS 연동, 템플릿, 모바일 UX)
- **2026-03-29**: v2.0 개선사항 #1~#20 반영 완료

## 개선안 요약
자세한 내용은 [PROJECT_STATUS.md](./PROJECT_STATUS.md) 참조

### 서비스적 (매출 직결)
1. 환자 리콜 자동화 시스템
2. 상담 전환율 실시간 추적 + 코칭
3. 환자 여정 퍼널 10단계 시각화
4. LMS 교육 활성화
5. 스마트 알림 (카카오알림톡)
6. 병원 벤치마킹

### 기능적 (기술)
1. 프론트엔드 코드 분할 (Code Splitting)
2. 인라인 스타일 → CSS 클래스 마이그레이션
3. API 응답 캐싱 (KV)
4. PWA + 모바일 최적화
5. 실시간 업데이트 (SSE)
6. 감사 로그 (Audit Trail)
