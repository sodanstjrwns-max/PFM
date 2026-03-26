# Patient Funnel Manager (PF Manager)

## 프로젝트 개요
- **이름**: Patient Funnel Manager
- **목표**: 병의원 통합 관리 플랫폼 - 진료관리, 커뮤니티, 채용(PF Hire), 운영, 마케팅을 한 곳에서
- **대상**: 치과, 내과, 피부과 등 병의원 원장 및 스태프
- **참고**: [Dental Connect](https://dentalconnet.com)의 기능을 발전시킨 플랫폼

## 기술 스택
- **Backend**: Hono (TypeScript) on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite) - 8개 모듈 33개 테이블
- **Storage**: Cloudflare R2 (파일/이미지/이력서)
- **Auth**: JWT (PBKDF2 + Web Crypto API)
- **Frontend**: Vanilla JS + CSS (CDN 없이 경량 SPA)
- **Font**: Noto Sans KR (Google Fonts)

## 현재 완료된 기능 ✅

### 1. 인증 시스템
- 병원 등록 (회원가입) / 로그인/로그아웃 (JWT 7일)
- 병원별 데이터 격리 (multi-tenant)

### 2. 대시보드
- 8개 통계 카드 (설명자료, 비용, 케이스, 이미지, 커뮤니티, 물품/수리, 채용공고, 지원자)
- 9개 빠른 메뉴 바로가기

### 3. 진료 관리
- **설명자료**: 카테고리별 필터링 (10개), 검색, 파일 업로드 (R2), 프레젠테이션 모드
- **비용 안내**: 카테고리별 시술 비용 테이블, CRUD, 병원별 독립
- **케이스 사진**: Before/During/After 구분, 환자 정보, 프레젠테이션 모드
- **상담 스크립트**: 카테고리별, 상황-멘트-반론-대응 구조

### 4. 커뮤니티
- **공지사항 / 자유게시판 / 칭찬하기 / 실수노트**
- 게시글 CRUD, 댓글, 좋아요, 익명 옵션, 고정 글

### 5. HR - PF Hire 채용 모듈 🆕
- **채용 공고**: 직군(7종)·고용형태(4종)별 공고 등록, 상태 관리 (draft→open→paused→closed)
- **지원자 관리**: 채용 파이프라인 (지원→서류검토→면접→평가→제안→채용), 평점, 메모
- **인터뷰**: 일정 등록 (대면/전화/화상), 피드백·점수 기록, 상태 관리
- **온보딩**: 신규 직원 온보딩 태스크 관리, 카테고리별 (서류/교육/장비/계정/일반), 진행률 표시

### 6. 병원 운영
- **물품 구매 / 수리·정비**: 칸반보드 (요청→승인→진행→완료), 우선순위, 비용 관리
- **체크리스트**: 개원전/마감/감염관리/커스텀, 일일 체크 기록
- **일정 관리**: 월별 캘린더, 일정 유형별 색상

### 7. 마케팅
- **유입 분석**: 채널별 월간 실적 (신환/재진/광고비/매출), ROI 계산
- **후기 관리**: 네이버/구글/카카오 플랫폼별, 별점, 답글

### 8. 설정
- 병원 정보 확인, 계정 관리

## 네비게이션 구조
```
대시보드
├── 진료 관리
│   ├── 설명자료
│   ├── 비용 안내
│   ├── 케이스 사진
│   └── 상담 스크립트
├── 커뮤니티
│   ├── 공지사항
│   ├── 자유게시판
│   ├── 칭찬하기
│   └── 실수노트
├── HR (PF Hire)
│   ├── 채용 공고
│   ├── 지원자 관리
│   ├── 인터뷰
│   └── 온보딩
├── 병원 운영
│   ├── 물품 구매
│   ├── 수리/정비
│   ├── 체크리스트
│   └── 일정 관리
├── 마케팅
│   ├── 유입 분석
│   └── 후기 관리
└── 설정
```

## API 엔드포인트

### 인증
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/auth/register` | 병원 등록 |
| POST | `/api/auth/login` | 로그인 |

### 진료 관리
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/protected/dashboard` | 대시보드 통계 |
| GET | `/api/protected/categories/:module` | 카테고리 목록 |
| GET/POST/DELETE | `/api/protected/materials` | 설명자료 CRUD |
| GET/POST/PUT/DELETE | `/api/protected/pricing` | 비용 항목 CRUD |
| GET/POST/DELETE | `/api/protected/cases` | 케이스 CRUD |
| POST/DELETE | `/api/protected/cases/:id/images` | 케이스 사진 |
| GET/POST/DELETE | `/api/protected/scripts` | 스크립트 CRUD |

### 커뮤니티
| Method | Path | 설명 |
|--------|------|------|
| GET/POST/DELETE | `/api/protected/posts` | 게시글 CRUD |
| GET/POST | `/api/protected/posts/:id/comments` | 댓글 |
| POST | `/api/protected/posts/:id/like` | 좋아요 |

### HR - PF Hire
| Method | Path | 설명 |
|--------|------|------|
| GET/POST | `/api/protected/hire/postings` | 채용 공고 |
| PUT/DELETE | `/api/protected/hire/postings/:id` | 공고 수정/삭제 |
| GET/POST | `/api/protected/hire/applicants` | 지원자 |
| PUT/DELETE | `/api/protected/hire/applicants/:id` | 지원자 수정/삭제 |
| POST | `/api/protected/hire/applicants/:id/resume` | 이력서 업로드 |
| GET/POST | `/api/protected/hire/interviews` | 인터뷰 |
| PUT | `/api/protected/hire/interviews/:id` | 인터뷰 수정 |
| GET/POST | `/api/protected/hire/evaluations` | 평가 |
| GET/POST | `/api/protected/hire/onboarding` | 온보딩 |
| PUT | `/api/protected/hire/onboarding/:id` | 온보딩 상태 변경 |

### 병원 운영
| Method | Path | 설명 |
|--------|------|------|
| GET/POST | `/api/protected/kanban/:boardType` | 칸반보드 |
| PUT/DELETE | `/api/protected/kanban/cards/:id` | 칸반 카드 |
| GET/POST | `/api/protected/checklists` | 체크리스트 |
| POST | `/api/protected/checklists/:id/complete` | 체크 기록 |
| GET/POST/DELETE | `/api/protected/events` | 일정 |

### 마케팅
| Method | Path | 설명 |
|--------|------|------|
| GET/POST | `/api/protected/marketing/channels` | 마케팅 채널 |
| GET/POST | `/api/protected/marketing/records` | 마케팅 실적 |
| GET/POST | `/api/protected/reviews` | 후기 관리 |

## DB 스키마 (33개 테이블)
| 영역 | 테이블 | 설명 |
|------|--------|------|
| Core | hospitals, users | 병원, 사용자 |
| Categories | categories | 공통 카테고리 (5개 모듈) |
| 진료관리 | materials, pricing, cases, case_images, scripts | 설명자료, 비용, 케이스, 스크립트 |
| 커뮤니티 | posts, comments, post_likes | 게시판 |
| 병원운영 | kanban_boards, kanban_cards, checklists, checklist_logs, events | 칸반, 체크리스트, 일정 |
| 마케팅 | marketing_channels, marketing_records, reviews | 마케팅 |
| HR (PF Hire) | job_postings, applicants, interviews, evaluations, onboarding_tasks | 채용 |
| LMS | courses, course_progress | 교육 과정 |

## 데모 계정
- **이메일**: admin@seoulbd.com
- **비밀번호**: admin123
- **병원**: 서울비디치과
- **추가 계정**: manager@seoulbd.com (관리자), hygienist1@seoulbd.com / assistant1@seoulbd.com (스태프)

## 로컬 실행
```bash
npm install
npm run build
npx wrangler d1 migrations apply pfm-production --local
npx wrangler d1 execute pfm-production --local --file=./seed.sql
pm2 start ecosystem.config.cjs
# http://localhost:3000
```

## 향후 개발 예정 🔮
1. **환자 관리(CRM)** - 환자 등록, 방문 이력, 만족도 조사
2. **직원 관리** - 스태프 계정 CRUD, 권한 관리
3. **LMS 교육** - 과정 등록, 진행률 추적 (DB 구조 완료)
4. **프레젠테이션 도구** - 드로잉/펜 도구, 주석 기능
5. **알림 시스템** - 업데이트, 리마인더
6. **다크 모드** - 테마 설정

## 배포
- **플랫폼**: Cloudflare Pages
- **상태**: 🟢 개발 중 (v2.0 PF Hire 통합)
- **최종 업데이트**: 2026-03-26
