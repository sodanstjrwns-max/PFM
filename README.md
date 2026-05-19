# Patient Funnel OS

> 페이션트 퍼널 운영체제 — PFM(분석/AI) + Patient Chat(메신저/케이스) 통합 플랫폼
> 서울비디치과 + 페이션트 퍼널(PF) 6,000명 대표원장 교육의 노하우를 시스템화한 치과 경영 솔루션.

## 🔀 v5.5.0 — Patient Chat 통합 (Phase A + B + C + D + E 완료)

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
- **Latest Build**: https://20976dbb.patient-funnel-manager.pages.dev (v5.5.0 Phase E — R2 파일 + AI 스레드 요약/액션/위험)
- **Demo Login**: admin@demo.pf / demo1234

## 📊 시스템 현황 (서울비디치과 데모 데이터)
- 환자 200명, 소개 관계 139건, 누적 소개 매출 5.76억원
- 🌟 전도사 4명 (TOP: 전태현 18명, 김지호 17명)
- 💎 팬 11명 / 💗 충성 7명 / 😊 만족 36명 / 👤 일반 142명

## 🎯 24개 핵심 API 헬스체크: ✅ 23/24 (96%)

## 📦 Tech Stack
- **Backend**: Hono + TypeScript + Cloudflare Workers
- **Database**: D1 (SQLite, 30 마이그레이션)
- **3D Visualization**: Three.js r149 + 3d-force-graph 1.73 (CDN)
- **Frontend**: Vanilla JS + Tailwind CSS + Glassmorphism UI
- **Cache**: Service Worker pfm-v4.8.1

## 🔥 Last Updated: 2026-05-02
