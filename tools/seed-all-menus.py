#!/usr/bin/env python3
"""모든 메뉴의 비어있는 테이블에 자연스러운 데모 데이터 대량 주입."""
import subprocess
import random
import uuid
from datetime import datetime, timedelta

HOSPITAL_ID = 'af4542c2-e55b-41cf-8d5d-805f8294a3d3'
USERS = [
    ('515e829a-2a40-48f7-b49e-fef2cabfd23f', '데모 원장', 'admin'),
    ('test-hyg-001', '김수민', 'hygienist'),
    ('test-desk-001', '이지영', 'desk'),
]
ADMIN = USERS[0][0]
TODAY = datetime(2026, 4, 21)


def uid(prefix='x'):
    return f"{prefix}-{uuid.uuid4().hex[:16]}"


def d(days_offset=0):
    return (TODAY + timedelta(days=days_offset)).strftime('%Y-%m-%d')


def dt(days_offset=0, hour=9, minute=0):
    return (TODAY + timedelta(days=days_offset)).replace(hour=hour, minute=minute).strftime('%Y-%m-%d %H:%M:%S')


def esc(s):
    return s.replace("'", "''")


sql = []


# ─────────────────────────────────────────────
# 1) 실수노트 (posts with board_type='mistake') + 댓글
# ─────────────────────────────────────────────
mistake_posts = [
    ("라텍스 글러브 박스 재고 0에서 발견", "월요일 아침에 글러브 박스 재고가 0인 걸 뒤늦게 발견했습니다. 다행히 원장님 집에 예비분 있어서 커버했지만, 다음부턴 매주 금요일 재고 체크 루틴 만들어야겠어요. 개선안: 카반보드에 '금요일 재고 점검' 반복 태스크 추가."),
    ("환자 예약 시간 10분 실수", "3번 체어 14:00 예약을 14:10로 오기재. 환자분 오시고 나서야 알아챔. 다행히 환자분이 괜찮다고 이해해주셨지만, 다음부턴 예약 등록 후 환자분께도 문자로 재확인 발송하는 걸로 프로세스 개선."),
    ("보철물 인상재 혼합비 실수", "실리콘 인상재 base:catalyst 비율을 잘못 섞어서 경화 안 됨. 재채득 진행. 재채득 시 환자분 불편함 방지 위해 앞으로 색깔 가이드 프린트해서 자리 옆에 붙여두기로 함."),
    ("소독 스프레이 떨어진 줄 모르고 진료 세팅", "3번 체어 세팅할 때 이미 비어있던 소독 스프레이로 닦음. 체어 재세팅. 앞으로 세팅 시작 전 무게감 체크(흔들어보기) 습관화."),
    ("환자분 성함 착오", "동명이인 환자 2분 계셔서 차트 번호로 구분해야 하는데 순간 실수. 즉시 사과드리고 재확인. 앞으로 차트번호+생년월일 double check."),
    ("임플란트 보증서 양식 구버전 출력", "올해 1월 양식 바뀌었는데 구버전 PDF로 출력함. 환자분께 양해 구하고 재발송. 공용 드라이브에서 'v2026-01' 접미사 확인 필수."),
    ("카드결제 금액 확인 놓침", "보험 청구액과 환자 자부담액 섞어서 결제. 환자분께 환불 + 재결제 처리. 결제 전 금액 화면을 환자분께 돌려보여드리기 철칙."),
    ("진료실 가림막 커튼 고장 늦게 신고", "커튼 레일이 일부 빠진 상태로 3일간 방치. 환자 프라이버시 문제로 연결될 수 있었음. 앞으로 아침 세팅 시 '시설 점검 체크리스트' 필수."),
    ("멸균 파우치 날짜 표기 누락", "멸균 후 유효기간 표기 안 한 파우치 발견. 전량 재멸균 처리. 멸균 루틴에 '날짜 스탬프' 단계 공식화."),
    ("초진 안내문 페이지 누락", "초진 안내문 3페이지 중 2페이지만 드림. 환자분 다음 내원 시 재설명 필요. 앞으로 안내문 드리기 전 페이지 수 카운트."),
]
mistake_comment_pool = [
    '공유 감사해요. 저도 지난주에 비슷한 일 있었어요',
    '개선안 좋네요 👍 체크리스트에 추가하겠습니다',
    '솔직하게 적어주셔서 배워갑니다',
    '이런 공유 덕분에 팀이 성장해요 💪',
    '저도 다음 주에 확인해볼게요',
    '원장님 승인 받고 프로세스 업데이트할게요',
    '오늘 회의 때 같이 다뤄볼까요?',
    '비슷한 케이스 저장해두면 신입 교육에 좋겠어요',
    '고생하셨어요. 다음엔 제가 백업할게요',
    '이실직고 인증 👏👏',
]

mistake_post_ids = []
for i, (title, content) in enumerate(mistake_posts):
    pid = uid('po')
    mistake_post_ids.append(pid)
    author_id = random.choice(USERS)[0]
    created = (TODAY - timedelta(days=random.randint(2, 60))).strftime('%Y-%m-%d %H:%M:%S')
    # mistake 글은 대부분 익명
    is_anon = 1 if random.random() < 0.6 else 0
    view = random.randint(15, 90)
    like = random.randint(1, 4)
    sql.append(
        f"INSERT INTO posts (id, hospital_id, board_type, author_id, title, content, is_pinned, is_anonymous, like_count, view_count, created_at, updated_at) "
        f"VALUES ('{pid}', '{HOSPITAL_ID}', 'mistake', '{author_id}', '{esc(title)}', '{esc(content)}', 0, {is_anon}, {like}, {view}, '{created}', '{created}')"
    )
    # 댓글 2~5개
    for _ in range(random.randint(2, 5)):
        cid = uid('cm')
        author = random.choice(USERS)[0]
        comment = random.choice(mistake_comment_pool).replace("'", "''")
        off = random.randint(30, 60 * 48)
        sql.append(
            f"INSERT INTO comments (id, post_id, author_id, content, created_at, hospital_id) "
            f"VALUES ('{cid}', '{pid}', '{author}', '{comment}', datetime('{created}', '+{off} minutes'), '{HOSPITAL_ID}')"
        )

# ─────────────────────────────────────────────
# 2) 회의록 (meetings + meeting_minutes)
# ─────────────────────────────────────────────
meetings_data = [
    ("주간 전체 회의", "월요일 정기 주간 미팅", "9:00", "10:00", "회의실"),
    ("신환 상담 전환율 리뷰", "4월 상담 전환율 분석 및 개선안", "17:30", "18:30", "원장실"),
    ("스탭 교육 - 임플란트 어시스트", "신입 스탭 대상 어시스트 교육", "18:30", "20:00", "2층 진료실"),
    ("분기 KPI 점검 회의", "Q1 목표 대비 성과 리뷰", "14:00", "16:00", "회의실"),
    ("환자 컴플레인 리뷰", "이번 달 컴플레인 케이스 3건 리뷰", "17:00", "18:00", "원장실"),
    ("페이션트 퍼널 재설계 워크샵", "10단계 퍼널 체크포인트 정비", "10:00", "13:00", "회의실"),
    ("마케팅 채널 결산", "월별 광고비 vs 신환 유입 분석", "16:00", "17:30", "원장실"),
    ("직원 복지 간담회", "복지 개선안 청취", "17:30", "18:30", "2층 대기실"),
]
meeting_contents = [
    "이번 주 신환 문의 23건 중 예약 전환 15건. 전환율 65%. 상담 부재 시간대(수요일 16시) 커버 방안 논의.",
    "임플란트 케이스 재진 체계화 필요. 김수민 선생님 주도로 SOP 초안 작성 예정. 5월 1주차 공유.",
    "환자 동선 불편 사항 공유: 2층→3층 이동 시 안내 부족. 데스크에서 엘리베이터 앞까지 에스코트하는 롤플레이 실시.",
    "Q1 신환 유입 목표 280명 대비 실적 305명 달성(+9%). 구강검진 패키지 반응 좋음. 5월도 유지.",
    "컴플레인 3건 모두 '대기시간 길다'였음. 체어 가동률 체크 후 예약 간격 10분 확대 테스트.",
    "10단계 퍼널 중 '진단 후 상담' 단계 이탈률 28%. 상담실 이동 동선과 상담사 배정 재검토.",
    "네이버 광고 ROAS 4.2, 인스타 1.8. 네이버 비중 상향 결정.",
    "점심시간 1시간 보장 요청, 금요일 조기퇴근제 파일럿 논의.",
]
meeting_decisions = [
    "수요일 16:00 백업 상담사 배정 (이지영)",
    "임플란트 어시스트 SOP 5월 1주차 배포",
    "신환 에스코트 롤플레이 금주 금요일 실시",
    "5월 목표 신환 320명으로 상향",
    "예약 간격 10분 확대 5월 1일부터 적용",
    "상담실 동선 재배치 안 다음주 원장 승인",
    "네이버 광고 예산 30% 증액",
    "금요일 조기퇴근 5월 둘째주부터 파일럿",
]

for i, (title, desc, st, et, loc) in enumerate(meetings_data):
    mid = uid('mt')
    m_date = d(-i*3 - 2)
    sql.append(
        f"INSERT INTO meetings (id, hospital_id, title, description, meeting_date, start_time, end_time, location, status, visibility, created_by) "
        f"VALUES ('{mid}', '{HOSPITAL_ID}', '{esc(title)}', '{esc(desc)}', '{m_date}', '{st}', '{et}', '{loc}', 'completed', 'all', '{ADMIN}')"
    )
    mnid = uid('mn')
    content = meeting_contents[i]
    decision = meeting_decisions[i]
    sql.append(
        f"INSERT INTO meeting_minutes (id, meeting_id, content, decisions, action_items, written_by, hospital_id) "
        f"VALUES ('{mnid}', '{mid}', '{esc(content)}', '{esc(decision)}', '[]', '{ADMIN}', '{HOSPITAL_ID}')"
    )

# ─────────────────────────────────────────────
# 3) 일정 관리 (events)
# ─────────────────────────────────────────────
events_data = [
    ("임직원 전체 워크샵", "1박 2일 경주", "workshop", 14, 15, "#ef4444"),
    ("치과의사협회 학술대회", "김원장 강연", "external", 20, 20, "#f59e0b"),
    ("신입 직원 입사일", "박OO 데스크", "hr", 5, 5, "#0ea5e9"),
    ("원내 임플란트 세미나", "노벨바이오케어 초청", "education", 8, 8, "#6366f1"),
    ("정기 장비 점검", "X-ray 유닛 체어", "maintenance", -3, -3, "#64748b"),
    ("어버이날 휴진", "5/8 오후", "holiday", 17, 17, "#dc2626"),
    ("원장님 학회 출장", "2일간", "external", 24, 25, "#f59e0b"),
    ("건강검진일", "전 직원", "hr", 30, 30, "#10b981"),
    ("5월 월간회의", "월말 전체", "meeting", 40, 40, "#0f766e"),
    ("새 장비 도입 미팅", "파노라마 신기종", "meeting", 12, 12, "#0f766e"),
    ("VIP 환자 케이스 컨퍼런스", "외부 전문가 초청", "education", 21, 21, "#6366f1"),
    ("봄 이벤트 촬영", "원내 포토", "marketing", -7, -7, "#ec4899"),
    ("노동절 휴진", "5/1", "holiday", 10, 10, "#dc2626"),
    ("상담 롤플레이 교육", "상담사 대상", "education", 3, 3, "#6366f1"),
    ("재무 결산 미팅", "4월 마감", "meeting", 9, 9, "#0f766e"),
]
for title, desc, etype, sd, ed, color in events_data:
    eid = uid('ev')
    sql.append(
        f"INSERT INTO events (id, hospital_id, title, description, event_type, start_date, end_date, all_day, color, created_by) "
        f"VALUES ('{eid}', '{HOSPITAL_ID}', '{esc(title)}', '{esc(desc)}', '{etype}', '{d(sd)}', '{d(ed)}', 1, '{color}', '{ADMIN}')"
    )

# ─────────────────────────────────────────────
# 4) 휴가 신청 (leave_requests)
# ─────────────────────────────────────────────
leave_data = [
    ('test-hyg-001', 'annual', -40, -38, 3, '가족 여행', 'approved'),
    ('test-desk-001', 'sick', -15, -15, 1, '몸살', 'approved'),
    ('test-hyg-001', 'annual', -10, -10, 1, '개인 사유', 'approved'),
    ('test-desk-001', 'half', -5, -5, 0.5, '병원 방문(오후)', 'approved'),
    ('test-hyg-001', 'annual', 7, 9, 3, '친구 결혼식 참석', 'pending'),
    ('test-desk-001', 'annual', 14, 16, 3, '5월 연차', 'pending'),
    ('test-hyg-001', 'half', 3, 3, 0.5, '은행 업무', 'pending'),
    ('test-desk-001', 'sick', -25, -25, 1, '치과 치료', 'approved'),
    ('test-hyg-001', 'annual', -55, -53, 3, '제주도 여행', 'approved'),
    ('test-desk-001', 'annual', 21, 21, 1, '가족 행사', 'pending'),
    ('test-hyg-001', 'sick', -3, -3, 1, '감기', 'approved'),
    ('test-desk-001', 'half', 10, 10, 0.5, '학부모 상담(오전)', 'pending'),
]
for uid_, lt, sd, ed, days, reason, status in leave_data:
    lid = uid('lv')
    approved = f"'{ADMIN}'" if status == 'approved' else 'NULL'
    approved_at = f"'{dt(sd-1, 18, 30)}'" if status == 'approved' else 'NULL'
    sql.append(
        f"INSERT INTO leave_requests (id, hospital_id, user_id, leave_type, start_date, end_date, days, reason, status, approved_by, approved_at) "
        f"VALUES ('{lid}', '{HOSPITAL_ID}', '{uid_}', '{lt}', '{d(sd)}', '{d(ed)}', {days}, '{esc(reason)}', '{status}', {approved}, {approved_at})"
    )

# ─────────────────────────────────────────────
# 5) 개인 소모품 신청 (staff_supplies)
# ─────────────────────────────────────────────
supply_items = [
    ('uniform', '상의 스크럽', 'M', '네이비'),
    ('uniform', '상의 스크럽', 'L', '네이비'),
    ('uniform', '하의 스크럽', 'M', '네이비'),
    ('shoes', '진료실 슬리퍼', '235', '화이트'),
    ('shoes', '진료실 슬리퍼', '245', '화이트'),
    ('glove', '라텍스 글러브 무파우더', 'S', ''),
    ('glove', '라텍스 글러브 무파우더', 'M', ''),
    ('mask', 'KF94 마스크', '', '화이트'),
    ('mask', '일회용 덴탈마스크', '', '블루'),
    ('other', '명찰 홀더', '', ''),
    ('uniform', '상의 스크럽 (신규)', 'S', '민트'),
    ('other', '진료실용 볼펜 2다스', '', '블랙'),
    ('shoes', '크록스 진료실용', '240', '블랙'),
    ('glove', '니트릴 글러브', 'M', '블루'),
    ('uniform', '하의 스크럽', 'L', '네이비'),
    ('mask', 'KF94 마스크 컬러', '', '블랙'),
    ('other', '환자용 담요 세탁', '', ''),
    ('shoes', '진료실 슬리퍼 (여름용)', '235', '민트'),
    ('glove', '라텍스 글러브 무파우더', 'L', ''),
    ('other', '수술실용 모자', '', '네이비'),
]
for i, (it, name, sz, col) in enumerate(supply_items):
    sid = uid('sp')
    user = random.choice(USERS)[0]
    qty = random.choice([1, 1, 1, 2, 2, 3])
    status = random.choices(['requested', 'approved', 'ordered', 'delivered'], weights=[3, 2, 2, 3])[0]
    order_date = f"'{d(-random.randint(3, 10))}'" if status in ('ordered', 'delivered') else 'NULL'
    delivery = f"'{d(-random.randint(0, 2))}'" if status == 'delivered' else 'NULL'
    approved = f"'{ADMIN}'" if status != 'requested' else 'NULL'
    sql.append(
        f"INSERT INTO staff_supplies (id, hospital_id, user_id, item_type, item_name, size, color, quantity, notes, status, requested_by, approved_by, order_date, delivery_date) "
        f"VALUES ('{sid}', '{HOSPITAL_ID}', '{user}', '{it}', '{esc(name)}', '{sz}', '{col}', {qty}, '', '{status}', '{user}', {approved}, {order_date}, {delivery})"
    )

# ─────────────────────────────────────────────
# 6) 채용 (job_postings + applicants + interviews + evaluations)
# ─────────────────────────────────────────────
job_postings = [
    ("치과위생사 정규직 모집", "hygienist", "full_time", "2년차 이상 치과위생사 모집합니다. 임플란트 어시스트 경험자 우대.", "치과위생사 면허 필수, 임플란트/보철 보조 2년 이상", "4대보험, 인센티브, 명절상여, 자율연차", 280, 350, "open", 30),
    ("진료실 스탭 (파트타임)", "assistant", "part_time", "주 3회 오후 진료 보조", "성실/꼼꼼, 경력무관", "교통비, 식대", 120, 150, "open", 14),
    ("상담 실장", "manager", "full_time", "상담 총괄 및 상담팀 관리", "상담 경력 5년 이상, 리더십 경험", "인센티브, 복지 플러스", 400, 500, "open", 45),
    ("데스크 매니저", "desk", "full_time", "데스크 총괄 업무", "데스크 2년 이상, 친절한 응대", "4대보험, 복지", 250, 320, "closed", -10),
]
posting_ids = []
for title, pos, emp, desc_, req, ben, smin, smax, status, days_to_deadline in job_postings:
    jid = uid('jp')
    posting_ids.append(jid)
    sql.append(
        f"INSERT INTO job_postings (id, hospital_id, title, position_type, employment_type, description, requirements, benefits, salary_min, salary_max, status, created_by, deadline) "
        f"VALUES ('{jid}', '{HOSPITAL_ID}', '{esc(title)}', '{pos}', '{emp}', '{esc(desc_)}', '{esc(req)}', '{esc(ben)}', {smin}, {smax}, '{status}', '{ADMIN}', '{d(days_to_deadline)}')"
    )

applicant_names = [
    ("김민지", "mj.kim@example.com", "010-1234-5678"),
    ("박하늘", "haneul@example.com", "010-2345-6789"),
    ("이수정", "sj.lee@example.com", "010-3456-7890"),
    ("최영은", "ye.choi@example.com", "010-4567-8901"),
    ("정지훈", "jihun@example.com", "010-5678-9012"),
    ("윤서연", "sy.yoon@example.com", "010-6789-0123"),
    ("한예진", "yj.han@example.com", "010-7890-1234"),
    ("송민준", "mj.song@example.com", "010-8901-2345"),
    ("김도영", "dy.kim@example.com", "010-9012-3456"),
    ("이채은", "ce.lee@example.com", "010-0123-4567"),
    ("박서진", "sj.park@example.com", "010-1111-2222"),
    ("최민서", "ms.choi@example.com", "010-3333-4444"),
]
applicant_ids = []
statuses = ['applied', 'reviewing', 'interview', 'hired', 'rejected']
weights =  [4,          3,           3,           1,         2]
for i, (name, email, phone) in enumerate(applicant_names):
    aid = uid('ap')
    applicant_ids.append(aid)
    jp = random.choice(posting_ids[:3])  # open 공고만
    st = random.choices(statuses, weights=weights)[0]
    rating = random.randint(2, 5) if st != 'applied' else 0
    cover = random.choice([
        '안녕하세요. 3년차 치과위생사 김민지입니다. 임플란트와 보철 어시스트 경험이 있으며, 환자 응대에 자신 있습니다.',
        '꼼꼼함과 성실함을 바탕으로 팀에 기여하겠습니다.',
        '성장 기회를 찾고 있습니다. 잘 부탁드립니다.',
        '이전 근무지에서 월 평균 상담 전환율 58% 기록했습니다.',
    ])
    applied = (TODAY - timedelta(days=random.randint(3, 40))).strftime('%Y-%m-%d %H:%M:%S')
    sql.append(
        f"INSERT INTO applicants (id, hospital_id, job_posting_id, name, email, phone, cover_letter, status, rating, applied_at) "
        f"VALUES ('{aid}', '{HOSPITAL_ID}', '{jp}', '{esc(name)}', '{email}', '{phone}', '{esc(cover)}', '{st}', {rating}, '{applied}')"
    )

# interviews (일부 지원자)
for i, aid in enumerate(applicant_ids[:6]):
    iid = uid('iv')
    sch = dt(random.randint(-20, 10), random.choice([10, 14, 16]), 0)
    dur = random.choice([30, 45, 60])
    st = random.choice(['scheduled', 'completed', 'completed'])
    feedback = ''
    score = 'NULL'
    if st == 'completed':
        feedback = esc(random.choice([
            '응대 자연스럽고 임플란트 경험 풍부. 팀워크 좋을 듯.',
            '경험은 부족하나 성장 의지 높음. 2차 면접 진행 추천.',
            '전문성은 있으나 커뮤니케이션 훈련 필요.',
            '매우 인상 깊었음. 채용 강력 추천.',
        ]))
        score = str(random.randint(70, 95))
    sql.append(
        f"INSERT INTO interviews (id, applicant_id, hospital_id, interviewer_id, scheduled_at, duration_min, interview_type, location, status, feedback, score) "
        f"VALUES ('{iid}', '{aid}', '{HOSPITAL_ID}', '{ADMIN}', '{sch}', {dur}, 'onsite', '원장실', '{st}', '{feedback}', {score})"
    )

# evaluations (completed interview들에 대해)
for aid in applicant_ids[:4]:
    evid = uid('ev')
    criteria = '[{"name":"전문성","score":' + str(random.randint(15,20)) + ',"max":20},{"name":"커뮤니케이션","score":' + str(random.randint(13,20)) + ',"max":20},{"name":"팀워크","score":' + str(random.randint(14,20)) + ',"max":20},{"name":"성장의지","score":' + str(random.randint(15,20)) + ',"max":20},{"name":"인상","score":' + str(random.randint(14,20)) + ',"max":20}]'
    total = random.randint(75, 95)
    rec = random.choice(['hire', 'hire', 'neutral', 'pass'])
    comments = esc(random.choice(['적극 채용 추천합니다.', '팀 분위기에 잘 맞을 것 같습니다.', '경력 조금 더 쌓고 재지원 권유.', '전반적으로 양호합니다.']))
    sql.append(
        f"INSERT INTO evaluations (id, applicant_id, evaluator_id, criteria, total_score, max_score, comments, recommendation, hospital_id) "
        f"VALUES ('{evid}', '{aid}', '{ADMIN}', '{criteria}', {total}, 100, '{comments}', '{rec}', '{HOSPITAL_ID}')"
    )

# ─────────────────────────────────────────────
# 7) 마케팅 기록 (marketing_records) - 채널 먼저 확인/생성
# ─────────────────────────────────────────────
# marketing_channels 확인
r = subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'pfm-production', '--local',
                    '--command', f"SELECT id, name FROM marketing_channels WHERE hospital_id='{HOSPITAL_ID}'",
                    '--json'],
                   cwd='/home/user/webapp', capture_output=True, text=True, timeout=30)
import json as _json
channels = []
try:
    data = _json.loads(r.stdout)
    channels = data[0]['results']
except Exception:
    pass

if not channels:
    # 채널 생성
    default_channels = [('네이버 플레이스', 'naver'), ('인스타그램', 'instagram'),
                        ('카카오 광고', 'kakao'), ('당근마켓', 'carrot'),
                        ('지인 소개', 'referral'), ('기타', 'other')]
    for name, key in default_channels:
        cid = uid('ch')
        channels.append({'id': cid, 'name': name})
        sql.append(
            f"INSERT INTO marketing_channels (id, hospital_id, name, channel_type) "
            f"VALUES ('{cid}', '{HOSPITAL_ID}', '{name}', '{key}')"
        )

# 최근 6개월간 채널별 기록
for ch in channels:
    for m_offset in range(6):
        month = (TODAY.replace(day=1) - timedelta(days=m_offset*30)).strftime('%Y-%m')
        mrid = uid('mr')
        new_p = random.randint(5, 60)
        rev_p = random.randint(2, 30)
        spend = random.randint(20, 500) * 10000 if 'naver' in ch['name'].lower() or 'insta' in ch['name'].lower() or '광고' in ch['name'] else random.randint(0, 30) * 10000
        revenue = new_p * random.randint(50, 150) * 10000
        sql.append(
            f"INSERT INTO marketing_records (id, hospital_id, channel_id, record_month, new_patients, revisit_patients, ad_spend, revenue) "
            f"VALUES ('{mrid}', '{HOSPITAL_ID}', '{ch['id']}', '{month}', {new_p}, {rev_p}, {spend}, {revenue})"
        )

# ─────────────────────────────────────────────
# 8) 예약 이행률 / 대기 시간 / 주차권 기록 (일별)
# ─────────────────────────────────────────────
for day_off in range(-60, 0):
    dow = (TODAY + timedelta(days=day_off)).strftime('%a')
    dow_kr = {'Mon':'월','Tue':'화','Wed':'수','Thu':'목','Fri':'금','Sat':'토','Sun':'일'}[dow]
    if dow_kr == '일': continue  # 일요일 휴진
    date = d(day_off)

    rid = uid('rs')
    cancel = random.randint(0, 6)
    dentweb_cancel = random.randint(0, 3)
    fulfill = round(random.uniform(82, 97), 1)
    sql.append(
        f"INSERT INTO reservation_records (id, hospital_id, record_date, day_of_week, cancel_count, dentweb_cancel_count, fulfillment_rate, created_by) "
        f"VALUES ('{rid}', '{HOSPITAL_ID}', '{date}', '{dow_kr}', {cancel}, {dentweb_cancel}, {fulfill}, '{ADMIN}')"
    )

    wid = uid('wt')
    avg_wait = round(random.uniform(5, 25), 1)
    total_wait = round(avg_wait * random.randint(15, 50), 1)
    sql.append(
        f"INSERT INTO wait_time_records (id, hospital_id, record_date, day_of_week, total_wait_minutes, avg_wait_minutes, created_by) "
        f"VALUES ('{wid}', '{HOSPITAL_ID}', '{date}', '{dow_kr}', {total_wait}, {avg_wait}, '{ADMIN}')"
    )

    pid = uid('pk')
    tickets = random.randint(8, 45)
    sql.append(
        f"INSERT INTO parking_records (id, hospital_id, record_date, day_of_week, ticket_count, created_by) "
        f"VALUES ('{pid}', '{HOSPITAL_ID}', '{date}', '{dow_kr}', {tickets}, '{ADMIN}')"
    )

# ─────────────────────────────────────────────
# 9) 게이미피케이션 미션 (gamification_missions)
# ─────────────────────────────────────────────
missions = [
    ("주간 상담 5건 달성", "주당 신환 상담을 5건 이상 진행", "consultation", "weekly", 5, 100, "💬", "all", 1),
    ("이번 달 설명자료 3회 업로드", "환자 교육 자료 업로드", "materials", "monthly", 3, 200, "📚", "hygienist", 2),
    ("리뷰 응답률 80% 달성", "네이버/구글 리뷰 응답", "review", "monthly", 80, 300, "⭐", "desk", 3),
    ("콜백 100% 이행", "예약 전 해피콜 전부 완료", "calls", "weekly", 100, 150, "📞", "desk", 4),
    ("칭찬글 2개 작성", "동료에게 칭찬 2회 이상", "praise", "monthly", 2, 80, "💛", "all", 5),
    ("실수노트 공유 1회", "이실직고 1회 이상", "mistake", "monthly", 1, 120, "🛡️", "all", 6),
    ("신환 예약 전환 60%", "상담→예약 전환율", "conversion", "monthly", 60, 400, "🎯", "manager", 7),
    ("체크리스트 100% 완수", "주간 체크리스트 완수", "checklist", "weekly", 100, 100, "✅", "all", 8),
    ("환자 만족도 4.5+ 유지", "이번 달 NPS", "satisfaction", "monthly", 90, 500, "🏆", "all", 9),
    ("월 3회 팀 미팅 참석", "정기 미팅 참석", "meeting", "monthly", 3, 80, "🤝", "all", 10),
]
for title, desc, mt, period, target, points, icon, role, order in missions:
    gid = uid('gm')
    sql.append(
        f"INSERT INTO gamification_missions (id, hospital_id, title, description, mission_type, period, target_value, points, badge_icon, target_role, sort_order, is_active, created_by) "
        f"VALUES ('{gid}', '{HOSPITAL_ID}', '{esc(title)}', '{esc(desc)}', '{mt}', '{period}', {target}, {points}, '{icon}', '{role}', {order}, 1, '{ADMIN}')"
    )


print(f"✓ 총 {len(sql)}개 SQL 생성")

# 청크로 실행
CHUNK = 60
total_ok = 0
failed = []
for i in range(0, len(sql), CHUNK):
    batch = sql[i:i+CHUNK]
    # 각 문장 끝에 세미콜론 보장
    chunk_sql = ';\n'.join(s.rstrip(';') for s in batch) + ';'
    with open('/tmp/_menuseed.sql', 'w') as f:
        f.write(chunk_sql)
    r = subprocess.run(
        ['npx', 'wrangler', 'd1', 'execute', 'pfm-production', '--local', '--file=/tmp/_menuseed.sql'],
        cwd='/home/user/webapp',
        capture_output=True, text=True, timeout=120
    )
    if r.returncode == 0:
        total_ok += len(batch)
        print(f"  chunk {i//CHUNK + 1}/{(len(sql)-1)//CHUNK + 1}: ✓ ({len(batch)} stmts)")
    else:
        err = r.stderr[-400:]
        failed.append((i, err))
        print(f"  chunk {i//CHUNK + 1}: ✗ {err}")
        # 실패한 청크는 한 줄씩 재시도
        for j, s in enumerate(batch):
            with open('/tmp/_one.sql', 'w') as f:
                f.write(s + ';')
            r2 = subprocess.run(
                ['npx', 'wrangler', 'd1', 'execute', 'pfm-production', '--local', '--file=/tmp/_one.sql'],
                cwd='/home/user/webapp', capture_output=True, text=True, timeout=30
            )
            if r2.returncode == 0:
                total_ok += 1
            else:
                print(f"    ✗ stmt {i+j}: {r2.stderr[-200:]}")
                break

print(f"\n✅ Done: {total_ok}/{len(sql)}")
