# Patient Funnel Manager (PF Manager)

## 프로젝트 개요
- **이름**: Patient Funnel Manager
- **목표**: 병의원 통합 관리 플랫폼 - 환자 설명자료, 비용 안내, 케이스 사진 관리를 한 곳에서
- **대상**: 치과, 내과, 피부과 등 병의원 원장 및 스태프
- **참고**: [Dental Connect](https://dentalconnet.com)의 기능을 발전시킨 플랫폼

## 기술 스택
- **Backend**: Hono (TypeScript) on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (파일/이미지)
- **Auth**: JWT (PBKDF2 + Web Crypto API)
- **Frontend**: Vanilla JS + CSS (CDN 없이 경량)
- **Font**: Noto Sans KR (Google Fonts)

## 현재 완료된 기능 ✅

### 인증 시스템
- 병원 등록 (회원가입) - 병원명, 이름, 이메일, 비밀번호
- 로그인/로그아웃 - JWT 토큰 기반 7일 유효
- 병원별 데이터 격리 (multi-tenant)

### 대시보드
- 통계 카드 (설명자료, 비용항목, 케이스, 이미지 수)
- 빠른 메뉴 (각 모듈 바로가기)

### 사이드바 네비게이션
- 접을 수 있는 그룹 메뉴 (진료 관리 > 하위메뉴)
- 확장 가능한 구조 (새 모듈 추가 용이)
- 모바일 반응형 (햄버거 메뉴)

### 모듈 1: 설명자료 관리
- 카테고리별 필터링 (임플란트, 충치, 교정 등 10개)
- 자료 검색 (제목/설명 기반)
- 파일 업로드 (이미지/동영상/PDF → R2 저장)
- 카드형 그리드 뷰
- 프레젠테이션 모드 (전체화면 + 키보드 네비게이션)

### 모듈 2: 비용 안내
- 카테고리별 시술 비용 테이블
- 시술명, 최소/최대 비용, 설명 관리
- CRUD (추가, 수정, 삭제)
- 병원별 독립 비용 설정

### 모듈 3: 케이스 사진
- 카테고리별 케이스 카드 뷰
- Before/During/After 사진 타입 구분
- 환자 정보 (나이, 성별, 치료기간)
- 사진 업로드 및 프레젠테이션 모드
- 케이스 상세 보기 모달

### 설정
- 병원 정보 확인
- 계정 관리 (로그아웃)

## URI 구조

### 페이지 (SPA)
| URL | 설명 |
|-----|------|
| `/` | 메인 SPA (로그인/대시보드) |
| `/static/style.css` | CSS |
| `/static/app.js` | Frontend JS |

### API 엔드포인트
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/auth/register` | 병원 등록 |
| POST | `/api/auth/login` | 로그인 |
| GET | `/api/protected/dashboard` | 대시보드 통계 |
| GET | `/api/protected/categories/:module` | 카테고리 목록 |
| GET | `/api/protected/materials` | 설명자료 목록 |
| POST | `/api/protected/materials` | 설명자료 추가 (FormData) |
| DELETE | `/api/protected/materials/:id` | 설명자료 삭제 |
| GET | `/api/protected/pricing` | 비용 항목 목록 |
| POST | `/api/protected/pricing` | 비용 항목 추가 |
| PUT | `/api/protected/pricing/:id` | 비용 항목 수정 |
| DELETE | `/api/protected/pricing/:id` | 비용 항목 삭제 |
| GET | `/api/protected/cases` | 케이스 목록 |
| POST | `/api/protected/cases` | 케이스 등록 |
| GET | `/api/protected/cases/:id` | 케이스 상세 |
| DELETE | `/api/protected/cases/:id` | 케이스 삭제 |
| POST | `/api/protected/cases/:id/images` | 케이스 사진 추가 |
| DELETE | `/api/protected/case-images/:id` | 케이스 사진 삭제 |
| GET | `/api/protected/files/*` | R2 파일 서빙 |

## DB 스키마
- **hospitals**: 병원 정보 (id, name, phone, address, logo_url)
- **users**: 사용자 (id, hospital_id, email, password_hash, name, role)
- **categories**: 카테고리 (module별, 글로벌/병원전용)
- **materials**: 설명자료 (파일 URL, 타입, 카테고리)
- **pricing**: 비용 항목 (시술명, 가격 범위)
- **cases**: 케이스 (환자정보, 치료기간)
- **case_images**: 케이스 이미지 (before/during/after)

## 데모 계정
- **이메일**: admin@seoulbd.com
- **비밀번호**: admin123
- **병원**: 서울비디치과

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
2. **채용 관리** - 기존 Patient Hire 기능 통합
3. **직원 관리** - 스태프 계정, 권한 관리
4. **마케팅** - 광고 ROI, 유입 경로 분석
5. **프레젠테이션 도구** - 드로잉/펜 도구, 주석 기능
6. **Q&A 게시판** - 병원 간 지식 공유
7. **알림 시스템** - 업데이트, 리마인더

## 배포
- **플랫폼**: Cloudflare Pages
- **상태**: 🟢 개발 중 (v1.0 MVP)
- **최종 업데이트**: 2026-03-26
