#!/usr/bin/env python3
"""빠진 테이블 개별 재시도 (제약 수정 반영)."""
import subprocess, random, uuid
from datetime import datetime, timedelta

HID = 'af4542c2-e55b-41cf-8d5d-805f8294a3d3'
USERS = [
    ('515e829a-2a40-48f7-b49e-fef2cabfd23f', '데모 원장'),
    ('test-hyg-001', '김수민'),
    ('test-desk-001', '이지영'),
]
ADMIN = USERS[0][0]
TODAY = datetime(2026, 4, 21)

def uid(p='x'): return f"{p}-{uuid.uuid4().hex[:16]}"
def d(o=0): return (TODAY + timedelta(days=o)).strftime('%Y-%m-%d')
def dt(o=0, h=9, m=0): return (TODAY + timedelta(days=o)).replace(hour=h, minute=m).strftime('%Y-%m-%d %H:%M:%S')
def esc(s): return s.replace("'", "''")

random.seed(42)
sql = []

# ─── 1) events (event_type 제약 준수) ───
events_data = [
    ("임직원 전체 워크샵", "1박 2일 경주", "other", 14, 15, "#ef4444"),
    ("치과의사협회 학술대회 강연", "김원장 연자", "education", 20, 20, "#f59e0b"),
    ("신입 직원 입사일", "박OO 데스크", "other", 5, 5, "#0ea5e9"),
    ("원내 임플란트 세미나", "노벨바이오케어 초청", "education", 8, 8, "#6366f1"),
    ("정기 장비 점검", "X-ray 유닛체어", "maintenance", -3, -3, "#64748b"),
    ("어버이날 휴진", "5/8 오후", "vacation", 17, 17, "#dc2626"),
    ("원장님 학회 출장", "2일간", "other", 24, 25, "#f59e0b"),
    ("건강검진일", "전 직원", "other", 30, 30, "#10b981"),
    ("5월 월간회의", "월말 전체 미팅", "meeting", 40, 40, "#0f766e"),
    ("새 장비 도입 미팅", "파노라마 신기종", "meeting", 12, 12, "#0f766e"),
    ("VIP 환자 케이스 컨퍼런스", "외부 전문가 초청", "education", 21, 21, "#6366f1"),
    ("봄 이벤트 촬영", "원내 포토", "other", -7, -7, "#ec4899"),
    ("노동절 휴진", "5/1 휴진", "vacation", 10, 10, "#dc2626"),
    ("상담 롤플레이 교육", "상담사 대상", "education", 3, 3, "#6366f1"),
    ("재무 결산 미팅", "4월 마감", "meeting", 9, 9, "#0f766e"),
]
for title, desc_, etype, sd, ed, color in events_data:
    eid = uid('ev')
    sql.append(
        f"INSERT INTO events (id, hospital_id, title, description, event_type, start_date, end_date, all_day, color, created_by) "
        f"VALUES ('{eid}', '{HID}', '{esc(title)}', '{esc(desc_)}', '{etype}', '{d(sd)}', '{d(ed)}', 1, '{color}', '{ADMIN}')"
    )

# ─── 2) leave_requests (leave_type 제약 준수: annual/sick/half_am/half_pm/special/compensation) ───
leave_data = [
    ('test-hyg-001', 'annual', -40, -38, 3, '가족 여행', 'approved'),
    ('test-desk-001', 'sick', -15, -15, 1, '몸살', 'approved'),
    ('test-hyg-001', 'annual', -10, -10, 1, '개인 사유', 'approved'),
    ('test-desk-001', 'half_pm', -5, -5, 0.5, '병원 방문(오후)', 'approved'),
    ('test-hyg-001', 'annual', 7, 9, 3, '친구 결혼식 참석', 'pending'),
    ('test-desk-001', 'annual', 14, 16, 3, '5월 연차', 'pending'),
    ('test-hyg-001', 'half_am', 3, 3, 0.5, '은행 업무', 'pending'),
    ('test-desk-001', 'sick', -25, -25, 1, '치과 치료', 'approved'),
    ('test-hyg-001', 'annual', -55, -53, 3, '제주도 여행', 'approved'),
    ('test-desk-001', 'annual', 21, 21, 1, '가족 행사', 'pending'),
    ('test-hyg-001', 'sick', -3, -3, 1, '감기', 'approved'),
    ('test-desk-001', 'half_am', 10, 10, 0.5, '학부모 상담(오전)', 'pending'),
    ('test-hyg-001', 'special', -80, -78, 3, '경조사(결혼)', 'approved'),
    ('test-desk-001', 'compensation', -20, -20, 1, '연장근무 보상휴가', 'approved'),
]
for u, lt, sd, ed, days, reason, status in leave_data:
    lid = uid('lv')
    ab = f"'{ADMIN}'" if status == 'approved' else 'NULL'
    aa = f"'{dt(sd-1, 18, 30)}'" if status == 'approved' else 'NULL'
    sql.append(
        f"INSERT INTO leave_requests (id, hospital_id, user_id, leave_type, start_date, end_date, days, reason, status, approved_by, approved_at) "
        f"VALUES ('{lid}', '{HID}', '{u}', '{lt}', '{d(sd)}', '{d(ed)}', {days}, '{esc(reason)}', '{status}', {ab}, {aa})"
    )

# ─── 3) staff_supplies ───
items = [
    ('uniform', '상의 스크럽', 'M', '네이비'),('uniform', '상의 스크럽', 'L', '네이비'),
    ('uniform', '하의 스크럽', 'M', '네이비'),('shoes', '진료실 슬리퍼', '235', '화이트'),
    ('shoes', '진료실 슬리퍼', '245', '화이트'),('glove', '라텍스 글러브 무파우더', 'S', ''),
    ('glove', '라텍스 글러브 무파우더', 'M', ''),('mask', 'KF94 마스크', '', '화이트'),
    ('mask', '일회용 덴탈마스크', '', '블루'),('other', '명찰 홀더', '', ''),
    ('uniform', '상의 스크럽 (신규)', 'S', '민트'),('other', '진료실용 볼펜 2다스', '', '블랙'),
    ('shoes', '크록스 진료실용', '240', '블랙'),('glove', '니트릴 글러브', 'M', '블루'),
    ('uniform', '하의 스크럽', 'L', '네이비'),('mask', 'KF94 마스크 컬러', '', '블랙'),
    ('other', '환자용 담요 세탁', '', ''),('shoes', '진료실 슬리퍼 (여름용)', '235', '민트'),
    ('glove', '라텍스 글러브 무파우더', 'L', ''),('other', '수술실용 모자', '', '네이비'),
]
for it, name, sz, col in items:
    sid = uid('sp')
    user = random.choice(USERS)[0]
    qty = random.choice([1, 1, 1, 2, 2, 3])
    status = random.choices(['requested', 'approved', 'ordered', 'delivered'], weights=[3, 2, 2, 3])[0]
    od = f"'{d(-random.randint(3, 10))}'" if status in ('ordered', 'delivered') else 'NULL'
    dd = f"'{d(-random.randint(0, 2))}'" if status == 'delivered' else 'NULL'
    ab = f"'{ADMIN}'" if status != 'requested' else 'NULL'
    sql.append(
        f"INSERT INTO staff_supplies (id, hospital_id, user_id, item_type, item_name, size, color, quantity, notes, status, requested_by, approved_by, order_date, delivery_date) "
        f"VALUES ('{sid}', '{HID}', '{user}', '{it}', '{esc(name)}', '{sz}', '{col}', {qty}, '', '{status}', '{user}', {ab}, {od}, {dd})"
    )

# ─── 4) 채용 - 한 트랜잭션 안에서 posting→applicant→interview 순 ───
postings = [
    ("치과위생사 정규직 모집", "hygienist", "full_time", "2년차 이상 치과위생사 모집합니다. 임플란트 어시스트 경험자 우대.", "치과위생사 면허 필수, 임플란트/보철 보조 2년 이상", "4대보험, 인센티브, 명절상여, 자율연차", 280, 350, "open", 30),
    ("진료실 스탭 (파트타임)", "assistant", "part_time", "주 3회 오후 진료 보조", "성실/꼼꼼, 경력무관", "교통비, 식대", 120, 150, "open", 14),
    ("상담 실장", "manager", "full_time", "상담 총괄 및 상담팀 관리", "상담 경력 5년 이상, 리더십 경험", "인센티브, 복지 플러스", 400, 500, "open", 45),
    ("데스크 매니저", "desk", "full_time", "데스크 총괄 업무", "데스크 2년 이상, 친절한 응대", "4대보험, 복지", 250, 320, "closed", -10),
]
posting_ids = []
for title, pos, emp, desc_, req, ben, smin, smax, status, ddays in postings:
    jid = uid('jp')
    posting_ids.append(jid)
    sql.append(
        f"INSERT INTO job_postings (id, hospital_id, title, position_type, employment_type, description, requirements, benefits, salary_min, salary_max, status, created_by, deadline) "
        f"VALUES ('{jid}', '{HID}', '{esc(title)}', '{pos}', '{emp}', '{esc(desc_)}', '{esc(req)}', '{esc(ben)}', {smin}, {smax}, '{status}', '{ADMIN}', '{d(ddays)}')"
    )

applicants = [
    ("김민지", "mj.kim@example.com", "010-1234-5678"),("박하늘", "haneul@example.com", "010-2345-6789"),
    ("이수정", "sj.lee@example.com", "010-3456-7890"),("최영은", "ye.choi@example.com", "010-4567-8901"),
    ("정지훈", "jihun@example.com", "010-5678-9012"),("윤서연", "sy.yoon@example.com", "010-6789-0123"),
    ("한예진", "yj.han@example.com", "010-7890-1234"),("송민준", "mj.song@example.com", "010-8901-2345"),
    ("김도영", "dy.kim@example.com", "010-9012-3456"),("이채은", "ce.lee@example.com", "010-0123-4567"),
    ("박서진", "sj.park@example.com", "010-1111-2222"),("최민서", "ms.choi@example.com", "010-3333-4444"),
]
statuses = ['applied', 'reviewing', 'interview', 'hired', 'rejected']
weights = [4, 3, 3, 1, 2]
applicant_ids = []
for name, email, phone in applicants:
    aid = uid('ap')
    applicant_ids.append(aid)
    jp = random.choice(posting_ids[:3])
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
        f"VALUES ('{aid}', '{HID}', '{jp}', '{esc(name)}', '{email}', '{phone}', '{esc(cover)}', '{st}', {rating}, '{applied}')"
    )

for aid in applicant_ids[:6]:
    iid = uid('iv')
    sch = dt(random.randint(-20, 10), random.choice([10, 14, 16]), 0)
    dur = random.choice([30, 45, 60])
    st = random.choice(['scheduled', 'completed', 'completed'])
    fb = ''
    sc = 'NULL'
    if st == 'completed':
        fb = esc(random.choice([
            '응대 자연스럽고 임플란트 경험 풍부. 팀워크 좋을 듯.',
            '경험은 부족하나 성장 의지 높음. 2차 면접 진행 추천.',
            '전문성은 있으나 커뮤니케이션 훈련 필요.',
            '매우 인상 깊었음. 채용 강력 추천.',
        ]))
        sc = str(random.randint(70, 95))
    sql.append(
        f"INSERT INTO interviews (id, applicant_id, hospital_id, interviewer_id, scheduled_at, duration_min, interview_type, location, status, feedback, score) "
        f"VALUES ('{iid}', '{aid}', '{HID}', '{ADMIN}', '{sch}', {dur}, 'onsite', '원장실', '{st}', '{fb}', {sc})"
    )

for aid in applicant_ids[:4]:
    evid = uid('evl')
    criteria = '[{"name":"전문성","score":' + str(random.randint(15,20)) + ',"max":20},{"name":"커뮤니케이션","score":' + str(random.randint(13,20)) + ',"max":20},{"name":"팀워크","score":' + str(random.randint(14,20)) + ',"max":20},{"name":"성장의지","score":' + str(random.randint(15,20)) + ',"max":20},{"name":"인상","score":' + str(random.randint(14,20)) + ',"max":20}]'
    total = random.randint(75, 95)
    rec = random.choice(['hire', 'hire', 'neutral', 'pass'])
    comments = esc(random.choice(['적극 채용 추천합니다.', '팀 분위기에 잘 맞을 것 같습니다.', '경력 조금 더 쌓고 재지원 권유.', '전반적으로 양호합니다.']))
    sql.append(
        f"INSERT INTO evaluations (id, applicant_id, evaluator_id, criteria, total_score, max_score, comments, recommendation, hospital_id) "
        f"VALUES ('{evid}', '{aid}', '{ADMIN}', '{criteria}', {total}, 100, '{comments}', '{rec}', '{HID}')"
    )

# ─── 5) marketing_channels + marketing_records ───
r = subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'pfm-production', '--local',
                    '--command', f"SELECT id, name FROM marketing_channels WHERE hospital_id='{HID}'", '--json'],
                   cwd='/home/user/webapp', capture_output=True, text=True, timeout=30)
import json as _json
channels = []
try:
    channels = _json.loads(r.stdout)[0]['results']
except Exception: pass

if not channels:
    default_ch = [('네이버 플레이스', 'naver'), ('인스타그램', 'instagram'),
                  ('카카오 광고', 'kakao'), ('당근마켓', 'carrot'),
                  ('지인 소개', 'referral'), ('기타', 'other')]
    for name, key in default_ch:
        cid = uid('ch')
        channels.append({'id': cid, 'name': name})
        sql.append(
            f"INSERT INTO marketing_channels (id, hospital_id, name, channel_type) "
            f"VALUES ('{cid}', '{HID}', '{name}', '{key}')"
        )

for ch in channels:
    for m_off in range(6):
        month = (TODAY.replace(day=1) - timedelta(days=m_off*30)).strftime('%Y-%m')
        mrid = uid('mr')
        new_p = random.randint(5, 60)
        rev_p = random.randint(2, 30)
        is_paid = 'naver' in ch['name'].lower() or 'insta' in ch['name'].lower() or '광고' in ch['name']
        spend = random.randint(20, 500) * 10000 if is_paid else random.randint(0, 30) * 10000
        revenue = new_p * random.randint(50, 150) * 10000
        sql.append(
            f"INSERT INTO marketing_records (id, hospital_id, channel_id, record_month, new_patients, revisit_patients, ad_spend, revenue) "
            f"VALUES ('{mrid}', '{HID}', '{ch['id']}', '{month}', {new_p}, {rev_p}, {spend}, {revenue})"
        )

print(f"✓ 총 {len(sql)}개 SQL 생성")

CHUNK = 40
ok = 0
for i in range(0, len(sql), CHUNK):
    batch = sql[i:i+CHUNK]
    chunk_sql = ';\n'.join(s.rstrip(';') for s in batch) + ';'
    with open('/tmp/_fixup.sql', 'w') as f:
        f.write(chunk_sql)
    r = subprocess.run(
        ['npx', 'wrangler', 'd1', 'execute', 'pfm-production', '--local', '--file=/tmp/_fixup.sql'],
        cwd='/home/user/webapp', capture_output=True, text=True, timeout=120
    )
    if r.returncode == 0:
        ok += len(batch)
        print(f"  chunk {i//CHUNK+1}: ✓ ({len(batch)})")
    else:
        print(f"  chunk {i//CHUNK+1}: ✗ {r.stderr[-300:]}")
        # one by one
        for j, s in enumerate(batch):
            with open('/tmp/_one2.sql', 'w') as f:
                f.write(s + ';')
            r2 = subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'pfm-production', '--local', '--file=/tmp/_one2.sql'],
                                cwd='/home/user/webapp', capture_output=True, text=True, timeout=30)
            if r2.returncode == 0:
                ok += 1
            else:
                print(f"    ✗ stmt {i+j}: {r2.stderr[-150:].strip()}")

print(f"\n✅ Done: {ok}/{len(sql)}")
