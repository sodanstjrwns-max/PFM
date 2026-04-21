# Patient Funnel Manager (PF Manager)

## 프로젝트 개요
- **이름**: Patient Funnel Manager
- **목표**: 병의원 통합 관리 플랫폼 - 진료관리, 환자관리, 마케팅, HR, 운영, 커뮤니티를 한 곳에서
- **대상**: 치과, 내과, 피부과 등 병의원 원장 및 스태프
- **버전**: v3.1 "Aha Moment Edition" (샘플 데이터 주입, 스토리텔링 랜딩, 성능 76% 개선)

## 🎯 v3.1 신규 기능 (2026-04-21)
- **✨ 원클릭 샘플 데이터 주입**: 가입 직후 3개월치 실제 데이터(환자40/상담28/콜60/KPI60일/리뷰15/퍼널10) 즉시 체험
- **📖 스토리텔링 랜딩**: "월 6천만 → 연 120억" 원장 스토리, 2.1배 성장/40% 광고비 절감/62% 전환율 실적 배지
- **🛡️ 신뢰 배지 바**: JWT/PBKDF2/병원별 데이터 격리/언제든 데이터 내보내기 표시
- **⚡ 초기 로딩 76% 개선**: 11.84초 → 2.82초 (preload hint, boot-loader, resource hints)
- **🎨 SEO/OG 태그**: 소셜 공유 시 의미 있는 프리뷰 표시
- **🧹 프로젝트 대청소**: 907MB → 309MB (-66%), 임시 파일 전량 제거

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
- **상태**: 🟢 운영 중 (v3.0)
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
