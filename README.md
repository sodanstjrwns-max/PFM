# Patient Funnel OS

> 페이션트 퍼널 운영체제 — PFM(분석/AI) + Patient Chat(메신저/케이스) 통합 플랫폼
> 서울비디치과 + 페이션트 퍼널(PF) 6,000명 대표원장 교육의 노하우를 시스템화한 치과 경영 솔루션.

## 🔀 v5.5.0 (in progress) — Patient Chat 통합 (Phase A 완료)

PFM 의 분석/AI 두뇌에 페이션트 챗(v5.5.5) 의 원내 메신저 신경계를 흡수.
"환자 인지 → 상담 → 진료 → 회수 → 추천" 전 과정이 한 OS 안에서 흐름.

### Phase A — 토대 (✅ 완료)
- 마이그레이션 **0035**: 메신저 코어 13개 테이블 (channels / messages / message_reads / message_escalations / urgent_calls / quick_replies / scheduled_messages / messenger_audit_logs / messenger_notification_preferences / hospital_messenger_settings / user_sessions / trusted_devices / channel_members)
- 마이그레이션 **0036**: users 테이블에 TOTP(2FA) + messenger_role + presence 컬럼 추가, PFM role → 메신저 role 자동 매핑
- 신규 라이브러리: `src/lib/messenger-audit.ts` (의료 컴플라이언스 감사 로그), `src/lib/totp.ts` (Web Crypto 기반 2FA)
- KV 바인딩 설계 (Phase B 활성화 예약)

### Phase B — 메신저 코어 (다음)
- 채널/메시지/읽음/리액션 라우트 + 사이드바 메뉴 + 폴링 기반 실시간

### Phase C — 환자 통합 (그 다음)
- patient_threads ↔ PFM `patients` 테이블 연결, 5단계 온도 ↔ 10단계 퍼널 양방향 sync

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
- **Latest Build**: https://7a4c52d6.patient-funnel-manager.pages.dev
- **Demo Login**: fin2@test.com / test1234

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
