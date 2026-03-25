# Patient Hire - 병의원 채용 관리 시스템

## 프로젝트 개요
- **이름**: Patient Hire
- **목표**: 병의원에 특화된 올인원 채용 관리 도구. 지원자 접수부터 면접, 합격, 온보딩까지 전 과정을 한 화면에서 관리합니다.
- **대상**: 치과, 내과, 정형외과 등 병의원 원장 및 채용 담당자
- **기술**: Hono + Vanilla JS + localStorage (외부 의존성 없이 Google Fonts만 사용)

## URLs
- **Sandbox**: https://3000-iuvrp0m93fbco7sqya61k-8f57ffe2.sandbox.novita.ai

## 완성된 기능

### 핵심 기능
- **칸반 보드**: 5단계(서류검토, 1차면접, 2차면접, 최종합격, 불합격) 드래그앤드롭
- **지원자 목록**: 검색/필터/정렬/페이지네이션 + CSV 내보내기
- **채용 현황**: 4개 요약 카드 + 전환율 퍼널 + 단계별/직종별/경로별 차트 + 활동 로그

### Phase 1 개선사항 (즉시 적용)
1. **중복 지원자 방지** - 연락처 기반 중복 체크 + 팝업 안내
2. **D-Day 뱃지** - 칸반 카드에 가장 가까운 면접까지 D-3 등 표시
3. **칸반 정렬** - 최신순/오래된순/이름순/면접임박순/평가점수순 드롭다운
4. **면접 일정 삭제** - 면접 일정별 삭제 버튼
5. **전화 바로 걸기** - 연락처 tel: 링크
6. **JSON 백업/복원** - 데이터 전체 백업 다운로드 및 복원

### Phase 2 개선사항 (효율성)
7. **전환율 퍼널 차트** - 단계별 전환율 시각화 (예: 전체 27%)
8. **채용공고 분류** - Position 필드 추가, 필터 및 공고별 통계
9. **일괄 단계 변경** - 체크박스 선택 후 일괄 단계 이동
10. **경로별 ROI 차트** - 지원경로별 지원수/합격수/합격률
11. **다크 모드** - 토글 버튼으로 다크/라이트 전환

### Phase 3 개선사항 (차별화)
12. **면허번호 검증** - 직종별 패턴 검증 (치위YYYY-NNNNN 등)
13. **타임라인 뷰** - 지원자별 전형 이동 히스토리 시각화
14. **알림 문구 템플릿** - 단계별 SMS/이메일 템플릿 자동 생성 + 복사
15. **평가 점수 자동합산** - 5개 항목 평균 + 동일 직종 순위 비교
16. **통합 검색** - 이름+연락처+메모+면허번호 동시 검색

### 기타 기능
- **지원자 등록 모달** - 10개 필드 (이름, 연락처, 직종, 경력, 면허번호, 전문과목 등)
- **지원자 상세 모달** - 기본정보, 단계변경, 면접일정, AI질문, 평가, 온보딩
- **AI 면접 질문 생성** - Claude sonnet-4 API로 직종/경력 맞춤 질문 5개
- **온보딩 체크리스트** - 최종합격자 12개 항목 진행률 관리
- **샘플 데이터** - 6명 (김지은, 박수연, 이미래, 정다은, 최유나, 한소희)
- **반응형 디자인** - 모바일(<768px) / 태블릿(768-1200px) / 데스크탑(>1200px)
- **키보드 단축키** - ESC(모달 닫기), Ctrl+N(등록 모달)
- **정렬 가능한 테이블** - 열 클릭으로 오름차순/내림차순 정렬
- **마우스 휠 가로 스크롤** - 칸반 보드 편리한 탐색
- **Favicon** - SVG 인라인 파비콘

## 데이터 구조

### localStorage 키
- `patientHire_applicants` - 지원자 배열
- `patientHire_activityLog` - 활동 로그 (최대 200건)
- `patientHire_apiKey` - Claude API 키
- `patientHire_theme` - 다크모드 설정

### 지원자 객체
```json
{
  "id": "uuid",
  "name": "이름",
  "phone": "010-0000-0000",
  "role": "치과위생사",
  "career": "3-5년",
  "licenseNumber": "치위2019-12345",
  "specialties": ["치과"],
  "salary": "350만원",
  "source": "치과잡",
  "position": "치과위생사 3월 채용",
  "memo": "메모",
  "startDate": "2026-04-01",
  "stage": "서류검토",
  "registeredAt": "ISO날짜",
  "interviewSchedules": [{"type":"1차면접","date":"2026-04-01","time":"14:00","interviewer":"김원장","method":"대면"}],
  "evaluation": {"expertise":4,"communication":5,"service":4,"teamwork":3,"attitude":5,"comment":"메모"},
  "aiQuestions": ["질문1","질문2"],
  "onboarding": {"합격 통보 완료":true},
  "history": [{"from":"서류검토","to":"1차면접","time":"ISO날짜"}]
}
```

## 사용 가이드

1. **지원자 등록**: 헤더의 `+ 지원자 등록` 버튼 또는 `Ctrl+N`
2. **단계 이동**: 칸반 카드를 드래그하거나 상세 모달에서 단계 버튼 클릭
3. **면접 일정**: 상세 모달에서 날짜/시간/면접관/방식 입력 후 추가
4. **AI 질문 생성**: 상세 모달에서 Claude API Key 입력 후 생성 버튼
5. **평가 입력**: 상세 모달에서 별점(5항목) + 종합의견 입력
6. **온보딩**: 최종합격 단계에서 12개 체크항목 관리
7. **데이터 백업**: 헤더 💾 버튼으로 JSON 백업, 📂으로 복원
8. **다크 모드**: 헤더 🌙 버튼

## 배포

### 기술 스택
- **Backend**: Hono (Cloudflare Workers)
- **Frontend**: Vanilla JS + Inline CSS
- **Font**: Noto Sans KR (Google Fonts)
- **저장소**: localStorage (서버 불필요)
- **AI**: Claude sonnet-4 API (선택사항)

### 로컬 실행
```bash
npm install
npm run build
npm run preview
```

### Cloudflare Pages 배포
```bash
npm run build
npx wrangler pages deploy dist
```

- **플랫폼**: Cloudflare Pages
- **상태**: ✅ Active
- **마지막 업데이트**: 2026-03-25
