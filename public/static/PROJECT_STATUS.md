# Patient Funnel Manager - Project Status Document
# 프로젝트 상태 보존 문서
> 작성일: 2026-03-26 | 버전: v2.2 | 최종 커밋: 236b1cc

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | Patient Funnel Manager (PFM) |
| **경로** | `/home/user/webapp/` |
| **목적** | 병의원 통합 관리 플랫폼 (진료보드, 상담관리, 채용, 커뮤니티, 운영, 마케팅) |
| **대상** | 치과 원장 및 스태프 (서울비디치과 기반) |
| **기술스택** | Hono (TypeScript) + Cloudflare Workers/Pages + D1 (SQLite) + R2 |
| **프론트엔드** | Vanilla JS + CSS SPA (CDN 미사용, 경량) |
| **인증** | JWT (PBKDF2 + Web Crypto API, 7일 만료) |
| **코드 총량** | 5,894줄 (index.tsx 965 + app.js 3,177 + style.css 1,121 + schema 446 + seed 185) |

---

## 2. 설정 파일 현황

### package.json
```json
{
  "name": "patient-funnel-manager",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "wrangler pages dev dist --ip 0.0.0.0 --port 3000",
    "deploy": "npm run build && wrangler pages deploy dist"
  },
  "dependencies": { "hono": "^4.7.0" },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250313.0",
    "@hono/vite-cloudflare-pages": "^0.4.2",
    "vite": "^6.2.0",
    "wrangler": "^3.114.0",
    "typescript": "^5.7.0"
  }
}
```

### wrangler.jsonc
```jsonc
{
  "name": "patient-funnel-manager",
  "compatibility_date": "2024-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "pages_build_output_dir": "./dist",
  "d1_databases": [{ "binding": "DB", "database_name": "pfm-production", "database_id": "local-dev" }],
  "r2_buckets": [{ "binding": "R2", "bucket_name": "pfm-assets" }]
}
```

### ecosystem.config.cjs (PM2)
```javascript
module.exports = {
  apps: [{
    name: 'pfm',
    script: 'npx',
    args: 'wrangler pages dev dist --d1=pfm-production --r2=pfm-assets --local --ip 0.0.0.0 --port 3000',
    env: { NODE_ENV: 'development' },
    watch: false, instances: 1, exec_mode: 'fork'
  }]
}
```

### vite.config.ts
```typescript
import { defineConfig } from 'vite'
import pages from '@hono/vite-cloudflare-pages'
export default defineConfig({ plugins: [pages()], build: { outDir: 'dist' } })
```

---

## 3. 파일 구조

```
/home/user/webapp/
├── src/
│   └── index.tsx              # 백엔드 메인 (965줄) - Hono 라우트 전체
├── public/
│   └── static/
│       ├── app.js             # 프론트엔드 메인 (3,177줄) - SPA 전체
│       └── style.css          # CSS (1,121줄) - 디자인 시스템 전체
├── migrations/
│   └── 0001_schema.sql        # DB 스키마 (446줄) - 33개 테이블
├── seed.sql                   # 시드 데이터 (185줄) - 데모 데이터
├── dist/                      # Vite 빌드 결과물
├── .wrangler/                 # 로컬 D1/R2 데이터
├── ecosystem.config.cjs       # PM2 설정
├── wrangler.jsonc             # Cloudflare 설정
├── vite.config.ts             # Vite 설정
├── tsconfig.json              # TypeScript 설정
├── package.json               # 의존성
├── package-lock.json          # 잠금 파일
├── README.md                  # 프로젝트 문서
└── PROJECT_STATUS.md          # 이 문서
```

---

## 4. Git 커밋 히스토리 (전체)

```
236b1cc refactor: 진료보드 원장별 컬럼 구조로 전면 재설계        ← 최신
9debb23 feat: 진료보드 + 상담관리 모듈 완성
4c28fb8 fix: 칸반보드 CSS 추가 + HR 지원자 관리 칸반 스타일 적용
2913794 v2.0: PF Hire 채용 모듈 통합 완료
d533d4e feat: 전체 모듈 확장 - 커뮤니티, 칸반보드, 상담스크립트, 마케팅, 체크리스트, 일정관리
c0f75b6 feat: Patient Funnel Manager v1.0 MVP - 병의원 통합 관리 플랫폼
fc320c0 fix: String.raw 에서 script 닫는 태그 이슈 수정 - 버튼 클릭 작동 복구
95d3c13 docs: README v2.1 고도화 업데이트 내용 추가
83e2f2d v2.1: 서비스 전체 고도화 - 대시보드/모달/상세뷰 UI/UX 업그레이드
8a4e4d5 Patient Hire 완성: 모든 개선사항 반영
d3e9d9e Initial commit: Patient Hire - 병의원 전용 채용 관리 웹앱
```

---

## 5. DB 스키마 (33개 테이블)

### 5-1. 테이블 목록

| # | 영역 | 테이블명 | 설명 | 주요 컬럼 |
|---|------|----------|------|-----------|
| 1 | Core | `hospitals` | 병원 | id, name, phone, address, logo_url |
| 2 | Core | `users` | 사용자 | id, hospital_id, email, password_hash, name, role, **is_doctor**, is_active |
| 3 | Common | `categories` | 공통 카테고리 | id, hospital_id, module, name, icon, sort_order |
| 4 | 진료관리 | `materials` | 설명자료 | id, hospital_id, category_id, title, file_url, file_type |
| 5 | 진료관리 | `pricing` | 비용 안내 | id, hospital_id, category_id, name, price_min, price_max |
| 6 | 진료관리 | `cases` | 케이스 | id, hospital_id, category_id, patient_name, diagnosis |
| 7 | 진료관리 | `case_images` | 케이스 사진 | id, case_id, image_url, phase (before/during/after) |
| 8 | 진료관리 | `scripts` | 상담 스크립트 | id, hospital_id, category_id, title, situation, script, objection, response |
| 9 | 커뮤니티 | `posts` | 게시글 | id, hospital_id, board_type, title, content, is_anonymous, is_pinned |
| 10 | 커뮤니티 | `comments` | 댓글 | id, post_id, author_id, content |
| 11 | 커뮤니티 | `post_likes` | 좋아요 | id, post_id, user_id |
| 12 | 운영 | `kanban_boards` | 칸반 보드 | id, hospital_id, board_type (purchase/repair) |
| 13 | 운영 | `kanban_cards` | 칸반 카드 | id, board_id, title, description, status, priority, estimated_cost |
| 14 | 운영 | `checklists` | 체크리스트 | id, hospital_id, name, category, items(JSON) |
| 15 | 운영 | `checklist_logs` | 체크 기록 | id, checklist_id, user_id, log_date, completed_items(JSON) |
| 16 | 운영 | `events` | 일정 | id, hospital_id, title, event_type, start_date, end_date |
| 17 | 마케팅 | `marketing_channels` | 마케팅 채널 | id, hospital_id, name, channel_type |
| 18 | 마케팅 | `marketing_records` | 마케팅 실적 | id, channel_id, record_month, new_patients, returning_patients, ad_cost, revenue |
| 19 | 마케팅 | `reviews` | 후기 | id, hospital_id, platform, rating, content, reply |
| 20 | HR | `job_postings` | 채용 공고 | id, hospital_id, title, department, employment_type, status |
| 21 | HR | `applicants` | 지원자 | id, job_posting_id, name, email, phone, status, resume_url, rating |
| 22 | HR | `interviews` | 인터뷰 | id, applicant_id, interview_type, scheduled_at, status, score, feedback |
| 23 | HR | `evaluations` | 평가 | id, applicant_id, evaluator_id, scores(JSON), decision |
| 24 | HR | `onboarding_tasks` | 온보딩 | id, hospital_id, applicant_id, task_name, category, status |
| 25 | 진료보드 | `chairs` | 진료 의자 | id, hospital_id, chair_number, floor, room_name, is_active, sort_order |
| 26 | 진료보드 | `treatment_board` | 진료보드 | id, hospital_id, chair_id, board_date, patient_name, **assigned_doctor**, status, **sort_order** |
| 27 | 상담 | `consultations` | 상담 | id, hospital_id, patient_name, source_channel, treatment_type, status, estimated/agreed/paid_amount |
| 28 | 상담 | `consultation_notes` | 상담 노트 | id, consultation_id, author_id, note_type, content |
| 29 | LMS | `courses` | 교육 과정 | id, hospital_id, title, description (미구현) |
| 30 | LMS | `course_progress` | 수강 진행 | id, course_id, user_id, progress (미구현) |

### 5-2. 최근 스키마 변경 (v2.2)

```sql
-- users 테이블에 is_doctor 추가
is_doctor INTEGER DEFAULT 0    -- 1이면 원장/의사 (진료보드 컬럼으로 표시)

-- treatment_board에 sort_order 추가
sort_order INTEGER DEFAULT 0   -- 원장 컬럼 내 카드 순서 (위=우선)

-- treatment_board에 assigned_doctor 인덱스 추가
CREATE INDEX idx_treatment_board_doctor ON treatment_board(assigned_doctor, board_date);
```

---

## 6. 백엔드 API 전체 목록 (src/index.tsx, 965줄)

### 6-1. 인증 (비보호)
| Line | Method | Path | 설명 |
|------|--------|------|------|
| 80 | POST | `/api/auth/register` | 병원+사용자 등록, JWT 발급 |
| 94 | POST | `/api/auth/login` | 로그인, JWT 발급 |

### 6-2. 진료 관리
| Line | Method | Path | 설명 |
|------|--------|------|------|
| 106 | GET | `/api/protected/categories/:module` | 카테고리 목록 (module별) |
| 114 | GET | `/api/protected/materials` | 설명자료 목록 (?category, ?search) |
| 127 | POST | `/api/protected/materials` | 설명자료 등록 (multipart, R2 업로드) |
| 145 | DELETE | `/api/protected/materials/:id` | 설명자료 삭제 |
| 153 | GET | `/api/protected/pricing` | 비용 항목 목록 |
| 164 | POST | `/api/protected/pricing` | 비용 항목 등록 |
| 173 | PUT | `/api/protected/pricing/:id` | 비용 항목 수정 |
| 181 | DELETE | `/api/protected/pricing/:id` | 비용 항목 삭제 |
| 188 | GET | `/api/protected/cases` | 케이스 목록 |
| 199 | POST | `/api/protected/cases` | 케이스 등록 |
| 208 | GET | `/api/protected/cases/:id` | 케이스 상세 (이미지 포함) |
| 217 | DELETE | `/api/protected/cases/:id` | 케이스 삭제 |
| 226 | POST | `/api/protected/cases/:id/images` | 케이스 이미지 업로드 (R2) |
| 243 | DELETE | `/api/protected/case-images/:id` | 케이스 이미지 삭제 |
| 249 | GET | `/api/protected/files/*` | R2 파일 서빙 |

### 6-3. 상담 스크립트
| Line | Method | Path | 설명 |
|------|--------|------|------|
| 357 | GET | `/api/protected/scripts` | 스크립트 목록 |
| 368 | POST | `/api/protected/scripts` | 스크립트 등록 |
| 377 | DELETE | `/api/protected/scripts/:id` | 스크립트 삭제 |

### 6-4. 커뮤니티
| Line | Method | Path | 설명 |
|------|--------|------|------|
| 259 | GET | `/api/protected/posts` | 게시글 목록 (?board_type) |
| 270 | POST | `/api/protected/posts` | 게시글 등록 |
| 279 | DELETE | `/api/protected/posts/:id` | 게시글 삭제 |
| 286 | GET | `/api/protected/posts/:id/comments` | 댓글 목록 |
| 291 | POST | `/api/protected/posts/:id/comments` | 댓글 등록 |
| 300 | POST | `/api/protected/posts/:id/like` | 좋아요 토글 |

### 6-5. 운영 (칸반/체크/일정)
| Line | Method | Path | 설명 |
|------|--------|------|------|
| 316 | GET | `/api/protected/kanban/:boardType` | 칸반 보드 (purchase/repair) |
| 330 | POST | `/api/protected/kanban/:boardType/cards` | 칸반 카드 등록 |
| 342 | PUT | `/api/protected/kanban/cards/:id` | 칸반 카드 수정 |
| 350 | DELETE | `/api/protected/kanban/cards/:id` | 칸반 카드 삭제 |
| 432 | GET | `/api/protected/checklists` | 체크리스트 목록 |
| 438 | POST | `/api/protected/checklists` | 체크리스트 등록 |
| 447 | POST | `/api/protected/checklists/:id/complete` | 체크 완료 기록 |
| 455 | GET | `/api/protected/checklists/:id/logs` | 체크 기록 조회 |
| 461 | GET | `/api/protected/events` | 일정 목록 |
| 472 | POST | `/api/protected/events` | 일정 등록 |
| 481 | DELETE | `/api/protected/events/:id` | 일정 삭제 |

### 6-6. 마케팅
| Line | Method | Path | 설명 |
|------|--------|------|------|
| 384 | GET | `/api/protected/marketing/channels` | 마케팅 채널 목록 |
| 390 | POST | `/api/protected/marketing/channels` | 마케팅 채널 등록 |
| 398 | GET | `/api/protected/marketing/records` | 마케팅 실적 목록 |
| 409 | POST | `/api/protected/marketing/records` | 마케팅 실적 등록 |
| 417 | GET | `/api/protected/reviews` | 후기 목록 |
| 423 | POST | `/api/protected/reviews` | 후기 등록 |

### 6-7. 대시보드
| Line | Method | Path | 설명 |
|------|--------|------|------|
| 488 | GET | `/api/protected/dashboard` | 전체 통계 (materials, pricing, cases, caseImages, posts, pendingTasks, openJobs, activeApplicants) |

### 6-8. HR (PF Hire)
| Line | Method | Path | 설명 |
|------|--------|------|------|
| 528 | GET | `/api/protected/hire/postings` | 채용 공고 목록 |
| 539 | POST | `/api/protected/hire/postings` | 채용 공고 등록 |
| 548 | PUT | `/api/protected/hire/postings/:id` | 채용 공고 수정 |
| 565 | DELETE | `/api/protected/hire/postings/:id` | 채용 공고 삭제 |
| 572 | GET | `/api/protected/hire/postings/:id/applicants` | 공고별 지원자 |
| 579 | GET | `/api/protected/hire/applicants` | 지원자 전체 목록 |
| 590 | POST | `/api/protected/hire/applicants` | 지원자 등록 |
| 599 | PUT | `/api/protected/hire/applicants/:id` | 지원자 수정 |
| 613 | DELETE | `/api/protected/hire/applicants/:id` | 지원자 삭제 |
| 620 | POST | `/api/protected/hire/applicants/:id/resume` | 이력서 업로드 (R2) |
| 635 | GET | `/api/protected/hire/applicants/:id/interviews` | 지원자 인터뷰 목록 |
| 640 | POST | `/api/protected/hire/interviews` | 인터뷰 등록 |
| 649 | PUT | `/api/protected/hire/interviews/:id` | 인터뷰 수정 |
| 662 | GET | `/api/protected/hire/applicants/:id/evaluations` | 지원자 평가 목록 |
| 667 | POST | `/api/protected/hire/evaluations` | 평가 등록 |
| 677 | GET | `/api/protected/hire/onboarding` | 온보딩 태스크 목록 |
| 688 | POST | `/api/protected/hire/onboarding` | 온보딩 태스크 등록 |
| 697 | PUT | `/api/protected/hire/onboarding/:id` | 온보딩 상태 변경 |

### 6-9. 진료보드
| Line | Method | Path | 설명 |
|------|--------|------|------|
| 708 | GET | `/api/protected/chairs` | 진료실(의자) 목록 |
| 714 | POST | `/api/protected/chairs` | 진료실 등록 |
| 723 | DELETE | `/api/protected/chairs/:id` | 진료실 삭제 |
| **730** | **GET** | **`/api/protected/doctors`** | **원장/의사 목록 (is_doctor=1)** |
| 737 | GET | `/api/protected/treatment-board` | 진료보드 (?date, sort_order 포함) |
| 753 | POST | `/api/protected/treatment-board` | 환자 등록 |
| 770 | PUT | `/api/protected/treatment-board/:id` | 상태/원장/의자 변경 |
| **790** | **PUT** | **`/api/protected/treatment-board-reorder`** | **카드 순서 일괄 변경 (배치)** |
| 802 | DELETE | `/api/protected/treatment-board/:id` | 환자 삭제 |
| 809 | GET | `/api/protected/treatment-board/stats` | 진료 통계 |

### 6-10. 상담 관리
| Line | Method | Path | 설명 |
|------|--------|------|------|
| 822 | GET | `/api/protected/consultations` | 상담 목록 |
| 839 | POST | `/api/protected/consultations` | 상담 등록 |
| 853 | PUT | `/api/protected/consultations/:id` | 상담 수정 |
| 869 | DELETE | `/api/protected/consultations/:id` | 상담 삭제 |
| 876 | GET | `/api/protected/consultations/:id/notes` | 상담 노트 목록 |
| 887 | POST | `/api/protected/consultations/:id/notes` | 상담 노트 등록 |
| 897 | GET | `/api/protected/consultations/stats/conversion` | 전환율 분석 통계 |

### 6-11. Fallback
| Line | Method | Path | 설명 |
|------|--------|------|------|
| 939 | GET | `*` | SPA fallback (HTML 반환) |

---

## 7. 프론트엔드 함수 전체 목록 (app.js, 3,177줄)

### 7-1. 코어
| Line | 함수명 | 설명 |
|------|--------|------|
| 52 | `api(path, opts)` | API 호출 (JWT 자동 첨부) |
| 66 | `apiForm(path, formData)` | multipart 폼 API 호출 |
| 78 | `toast(msg, type)` | 토스트 메시지 |
| 89 | `navigate(page)` | SPA 라우팅 |
| 95 | `getStoredAuth()` | 저장된 인증 정보 |
| 104 | `saveAuth(token, user)` | 인증 정보 저장 |
| 111 | `logout()` | 로그아웃 |
| 120 | `renderAuth()` | 로그인/회원가입 UI |
| 212 | `getNavConfig()` | 네비게이션 설정 |
| 283 | `renderApp()` | 앱 전체 렌더링 |
| 342 | `renderSidebar(nav)` | 사이드바 렌더링 |
| 385 | `renderPage()` | 페이지 라우터 (switch) |

### 7-2. 대시보드
| Line | 함수명 | 설명 |
|------|--------|------|
| 445 | `renderDashboard(body)` | 대시보드 (통계카드 + 퀵메뉴) |

### 7-3. 진료 관리
| Line | 함수명 | 설명 |
|------|--------|------|
| 565 | `renderMaterials(body, actions)` | 설명자료 목록 |
| 629 | `openAddMaterialModal(cats, onSuccess)` | 설명자료 등록 모달 |
| 706 | `renderPricing(body, actions)` | 비용 안내 |
| 763 | `openAddPricingModal(cats, onSuccess)` | 비용 등록 모달 |
| 823 | `renderCases(body, actions)` | 케이스 사진 |
| 874 | `openAddCaseModal(cats, onSuccess)` | 케이스 등록 모달 |
| 938 | `openCaseDetail(caseId)` | 케이스 상세 |
| 1006 | `openAddCaseImageModal(caseId, onSuccess)` | 이미지 업로드 모달 |

### 7-4. 커뮤니티
| Line | 함수명 | 설명 |
|------|--------|------|
| 1070 | `renderCommunity(body, actions, boardType)` | 커뮤니티 게시판 |
| 1145 | `openPostDetail(postId, boardType, reload)` | 게시글 상세 |

### 7-5. 공통 칸반 엔진
| Line | 함수명 | 설명 |
|------|--------|------|
| 1205 | `initKanbanDnD(container, onDrop)` | **드래그&드롭 엔진 (공용)** |
| 1244 | `renderKanban(body, actions, boardType)` | 물품구매/수리 칸반보드 |
| 1341 | `openKanbanCardModal(cardId, cards, boardType, reload)` | 칸반 카드 상세 |

### 7-6. 스크립트/체크/캘린더/마케팅/후기
| Line | 함수명 | 설명 |
|------|--------|------|
| 1377 | `renderScripts(body, actions)` | 상담 스크립트 |
| 1455 | `renderChecklists(body, actions)` | 체크리스트 |
| 1520 | `renderCalendar(body, actions)` | 일정 캘린더 |
| 1600 | `renderMarketing(body, actions)` | 마케팅 유입 분석 |
| 1678 | `renderReviews(body, actions)` | 후기 관리 |

### 7-7. HR (PF Hire)
| Line | 함수명 | 설명 |
|------|--------|------|
| 1743 | `renderHirePostings(body, actions)` | 채용 공고 |
| 1858 | `openPostingDetail(postingId, postings, reload)` | 공고 상세 |
| 1907 | `renderHireApplicants(body, actions)` | 지원자 관리 |
| 2036 | `openApplicantDetail(applicantId, applicants, reload)` | 지원자 상세 |
| 2109 | `renderHireInterviews(body, actions)` | 인터뷰 |
| 2209 | `openInterviewDetail(iv, reload)` | 인터뷰 상세 |
| 2247 | `renderHireOnboarding(body, actions)` | 온보딩 |

### 7-8. 진료보드 (v2.2 재설계)
| Line | 함수명 | 설명 |
|------|--------|------|
| **2360** | **`renderTreatmentBoard(body, actions)`** | **원장별 컬럼 진료보드** |
| 2382 | `loadBoard()` | 보드 데이터 로드 |
| 2422 | `renderCard(item)` | 환자 카드 렌더링 |
| **2616** | **`openTreatmentDetail(itemId, items, reload, doctors, chairs)`** | **환자 상세/원장 변경** |

### 7-9. 상담 관리
| Line | 함수명 | 설명 |
|------|--------|------|
| 2694 | `renderConsultationPipeline(body, actions)` | 상담 파이프라인 칸반 |
| 2834 | `openConsultDetail(consultId, consultations, reload)` | 상담 상세 |
| 2957 | `renderConsultationStats(body, actions)` | 전환율 분석 대시보드 |

### 7-10. 설정/유틸
| Line | 함수명 | 설명 |
|------|--------|------|
| 3056 | `renderSettings(body)` | 설정 페이지 |
| 3086 | `openPresentation(urls, startIdx)` | 프레젠테이션 모드 |
| 3116 | `renderCatTabs(containerId, cats, selectedId, onSelect)` | 카테고리 탭 |
| 3130 | `showModal()` / `closeModal()` | 모달 열기/닫기 |
| 3137 | `formatPrice(min, max)` | 가격 포맷팅 |
| 3144 | `esc(s)` | HTML 이스케이프 |
| 3151 | `debounce(fn, ms)` | 디바운스 |
| 3156 | `timeAgo(dateStr)` | 상대 시간 |

---

## 8. 진료보드 핵심 설계 (v2.2 재설계)

### 8-1. 컬럼 구조 (Before → After)

**Before (v2.1):** 상태 기반 6단계
```
대기 → 도착 → 자리안내 → 진료중 → 원장필요 → 완료
```

**After (v2.2):** 원장별 컬럼
```
[📋 진료실 대기] → [문석준 원장] → [김수현 원장] → [✅ 완료]
   (미배정)         (sort_order순)    (sort_order순)   (sort=99)
```

### 8-2. 카드 순서 = 원장 이동 우선순위
- `sort_order` 값이 작을수록 상단 (먼저 가야 함)
- 상단: 🔔 원장호출 / 진료중 → 하단: 대기/도착
- 완료된 카드: sort_order=99

### 8-3. 드래그&드롭 동작
- **컬럼 간 이동**: 원장 배정 변경 (assigned_doctor 업데이트)
- **컬럼 내 순서**: 우선순위 변경 (sort_order 일괄 업데이트)
- **API**: `PUT /api/protected/treatment-board-reorder` (배치)

### 8-4. 현재 시드 데이터

**문석준 원장 (u-admin):**
| 순서 | 환자 | 상태 | 진료내용 |
|------|------|------|----------|
| 1 | 최유나 | 🔔 원장호출 | 신경치료 (응급) |
| 2 | 박서준 | 🦷 진료중 | 임플란트 1차 |
| 3 | 강민우 | 🚶 도착 | 라미네이트+브릿지 |
| 4 | 김학권 | 🕐 대기 | 임플란트 상담 |
| 99 | 윤명한 | ✅ 완료 | 정기검진 |

**김수현 원장 (u-mgr):**
| 순서 | 환자 | 상태 | 진료내용 |
|------|------|------|----------|
| 1 | 이동희 | 🦷 진료중 | 발치 |
| 2 | 정윤서 | 🚶 도착 | 교정 점검 |
| 3 | 이승민 | 🕐 대기 | 사랑니 발치 |

**대기 (미배정):**
| 순서 | 환자 | 상태 | 진료내용 |
|------|------|------|----------|
| 1 | 맹선영 | 💺 자리안내 | 교정 상담 (신환) |
| 2 | 한지민 | 🕐 대기 | 크라운 인상 (소개) |
| 3 | 오서진 | 🚶 도착 | 충치치료 |

---

## 9. 상담 관리 설계

### 9-1. 파이프라인 (8단계)
```
문의 → 예약 → 내원 → 상담중 → 동의 → 수납 → 진료 → 완료
(inquiry) (reserved) (visited) (consulting) (agreed) (payment) (treatment) (completed)
                                                              + 이탈(lost)
```

### 9-2. 유입 채널
walk_in, phone, naver, instagram, youtube, referral, blog, kakao

### 9-3. 현재 시드 데이터 (10건)
- 전환율: 50% (동의/내원)
- 수납률: 80% (수납/동의)
- 총 예상금액: 5,650만원 / 동의금액: 2,760만원 / 수납금액: 1,460만원

### 9-4. 전환율 분석 대시보드
- 월별 선택기
- 전체 통계 패널 (상담수, 동의수, 수납수, 이탈수, 전환율, 수납률)
- 유입경로별 전환율 차트
- 진료유형별 전환율 차트
- 퍼널 시각화 (총 상담 → 내원 → 동의 → 수납 → 완료)

---

## 10. 데이터 현황 (시드 기준)

| 모듈 | 데이터 수 | 비고 |
|------|-----------|------|
| 병원 | 1 | 서울비디치과 |
| 사용자 | 4 | 문석준(admin), 김수현(manager), 박지은/이하늘(staff) |
| 카테고리 | ~40 | 설명자료10, 비용10, 케이스10, 스크립트5, 채용5 |
| 스크립트 | 2 | 임플란트, 교정 |
| 체크리스트 | 3 | 개원전, 마감, 감염관리 |
| 마케팅 채널 | 6 | 네이버, 구글, 인스타, 유튜브, 카카오, 블로그 |
| 채용 공고 | 2 | 치과위생사, 진료코디네이터 |
| 지원자 | 4 | 각종 상태 |
| 진료보드 | 11 | 문석준5, 김수현3, 대기3 |
| 진료실(의자) | 7 | 2F 2개, 3F 3개, 4F 2개 |
| 상담 | 10 | 다양한 상태/채널/유형 |
| 상담 노트 | 6 | 상담별 메모/반론/치료계획 |
| **데이터 없음** | - | materials, pricing, cases, events, reviews, posts, onboarding |

---

## 11. CSS 디자인 시스템

### 11-1. 색상 변수
```css
--primary: #0f766e;        --primary-light: #14b8a6;    --primary-dark: #0d5f59;
--secondary: #6366f1;      --secondary-light: #818cf8;
--accent: #f59e0b;         --success: #22c55e;          --warning: #f59e0b;
--danger: #ef4444;         --info: #3b82f6;
--bg-main: #f8fafc;        --bg-card: #ffffff;
--bg-sidebar: #0f172a;     --bg-sidebar-hover: #1e293b;
--text-primary: #1e293b;   --text-secondary: #64748b;
```

### 11-2. 레이아웃
```css
--sidebar-width: 260px;    --header-height: 60px;
--radius-sm: 6px;          --radius-md: 10px;          --radius-lg: 16px;
```

### 11-3. 반응형 (768px 이하)
- 사이드바: 숨김 → 햄버거로 토글
- 대시보드 그리드: 2컬럼
- 폼: 1컬럼
- 칸반 컬럼: min-width 200px

### 11-4. 애니메이션
- `@keyframes slideIn` - 모달 진입
- `@keyframes spin` - 로딩 스피너
- `@keyframes pulse` - 원장호출 깜빡임

---

## 12. 접속 정보

| 항목 | 값 |
|------|------|
| **샌드박스 URL** | https://3000-iuvrp0m93fbco7sqya61k-8f57ffe2.sandbox.novita.ai |
| **포트** | 3000 |
| **PM2 앱명** | pfm |
| **데모 계정** | admin@seoulbd.com / admin123 |
| **추가 계정** | manager@seoulbd.com / manager1 |
| **스태프** | hygienist1@seoulbd.com / staff123 |
| **스태프** | assistant1@seoulbd.com / staff123 |

---

## 13. 실행 명령어 정리

```bash
# 빌드
cd /home/user/webapp && npm run build

# DB 초기화 (완전 리셋)
cd /home/user/webapp && rm -rf .wrangler/state/v3/d1 && npm run build
cd /home/user/webapp && npx wrangler d1 migrations apply pfm-production --local
cd /home/user/webapp && npx wrangler d1 execute pfm-production --local --file=./seed.sql

# 서버 시작
cd /home/user/webapp && fuser -k 3000/tcp 2>/dev/null || true
cd /home/user/webapp && pm2 delete all 2>/dev/null || true
cd /home/user/webapp && pm2 start ecosystem.config.cjs

# 테스트
curl http://localhost:3000

# 로그 확인
pm2 logs pfm --nostream

# Git
cd /home/user/webapp && git add -A && git commit -m "메시지"
```

---

## 14. 진행 중이던 작업 (디버그/최적화 풀패키지)

### 14-1. 완료된 항목
- [x] 전체 API 헬스체크 (모든 엔드포인트 200 확인)
- [x] 데이터 존재 여부 전수 확인
- [x] CSS 클래스 사용 여부 검증
- [x] 진료보드 원장별 컬럼 재설계 완료
- [x] 드래그&드롭 원장 배정 + 순서 변경 동작 확인

### 14-2. 진행 중 / 미완료 항목
- [ ] **대시보드 고도화**: 진료보드/상담관리 요약 데이터 추가 (API 수정 시작됨)
- [ ] **CSS 반응형 강화**: @media 쿼리 1개 → 다양한 브레이크포인트
- [ ] **코드 최적화**: 중복 제거, 에러 핸들링 개선, UX 개선
- [ ] **누락 CSS**: .check-item, .del-prc, .edit-prc 등 보완
- [ ] **전체 UI 점검**: 각 페이지 실제 렌더링 스크린샷 확인
- [ ] **성능 최적화**: 불필요한 API 호출 제거, 캐싱
- [ ] **모바일 최적화**: 터치 이벤트, 모바일 칸반

### 14-3. 향후 개발 예정
- [ ] 환자 관리(CRM) - 환자 등록, 방문 이력
- [ ] 직원 관리 - 스태프 계정 CRUD, 권한
- [ ] LMS 교육 - 과정 등록, 진행률 (DB 준비 완료)
- [ ] 프레젠테이션 도구 - 드로잉/펜
- [ ] 알림 시스템 - 리마인더
- [ ] 다크 모드
- [ ] Cloudflare Pages 프로덕션 배포

---

## 15. 네비게이션 구조 (app.js getNavConfig)

```
대시보드 (dashboard)
├── 진료보드 (treatment_board)
├── 상담
│   ├── 상담 파이프라인 (consultation_pipeline)
│   └── 전환율 분석 (consultation_stats)
├── 진료 관리
│   ├── 설명자료 (materials)
│   ├── 비용 안내 (pricing)
│   ├── 케이스 사진 (cases)
│   └── 상담 스크립트 (scripts)
├── 커뮤니티
│   ├── 공지사항 (notice)
│   ├── 자유게시판 (free)
│   ├── 칭찬하기 (praise)
│   └── 실수노트 (mistake)
├── HR
│   ├── 채용 공고 (hire_postings)
│   ├── 지원자 관리 (hire_applicants)
│   ├── 인터뷰 (hire_interviews)
│   └── 온보딩 (hire_onboarding)
├── 병원 운영
│   ├── 물품 구매 (purchase_kanban)
│   ├── 수리/정비 (repair_kanban)
│   ├── 체크리스트 (checklists)
│   └── 일정 관리 (calendar)
└── 설정 (settings)
```

---

> **이 문서는 프로젝트 복원, 인수인계, 또는 작업 재개 시 컨텍스트 참조용입니다.**
> **마지막 업데이트: 2026-03-26 | 커밋: 236b1cc**
