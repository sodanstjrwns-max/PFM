#!/usr/bin/env python3
"""
seed-remaining.py — 남은 빈 메뉴 완전 주입
- attendance: 60일 x 3명 출근기록 (present/late/vacation 믹스)
- onboarding_tasks: 지원자별 온보딩 체크리스트
- pricing: 진료 가격표 (18종)
- kpi_targets: 최근 6개월 월별 목표
- gamification_progress: 3명 x 20미션 진행률
- courses + course_progress: 필수/선택 교육 8개 + 3명 수강
- review_management: (이미 15개 있음, skip)
"""
import subprocess, uuid, random
from datetime import datetime, timedelta

random.seed(42)
HID = 'af4542c2-e55b-41cf-8d5d-805f8294a3d3'
USERS = [
    ('515e829a-2a40-48f7-b49e-fef2cabfd23f', '데모 원장', 'admin'),
    ('test-hyg-001', '김수민', 'staff'),
    ('test-desk-001', '이지영', 'staff'),
]
ADMIN_ID = USERS[0][0]

def rid(prefix):
    return f"{prefix}-{uuid.uuid4().hex[:16]}"

def esc(s):
    return str(s).replace("'", "''") if s is not None else ''

sqls = []

# ============================================================
# 1. attendance — 최근 60일 x 3명 = 180개
# ============================================================
today = datetime.now().date()
for i in range(60):
    d = today - timedelta(days=i)
    weekday = d.weekday()  # 0=월, 6=일
    for uid, uname, _ in USERS:
        # 일요일 90% 휴진
        if weekday == 6 and random.random() < 0.9:
            status = 'holiday'
            check_in = None
            check_out = None
            note = '정기 휴진'
        elif random.random() < 0.04:  # 4% 휴가
            status = 'vacation'
            check_in = None
            check_out = None
            note = random.choice(['연차 사용', '경조사', '병가'])
        elif random.random() < 0.08:  # 8% 지각
            status = 'late'
            mm = random.randint(5, 25)
            check_in = f"09:{mm:02d}"
            check_out = f"18:{random.randint(30,59):02d}"
            note = random.choice(['지하철 지연', '차량 정체', ''])
        elif random.random() < 0.03:  # 3% 반차
            status = 'half_day'
            check_in = random.choice(['09:00', '14:00'])
            check_out = random.choice(['13:00', '18:30'])
            note = '오전/오후 반차'
        else:
            status = 'present'
            check_in = f"08:{random.randint(40,59):02d}"
            check_out = f"18:{random.randint(30,59):02d}"
            note = ''
        
        aid = rid('att')
        date_str = d.strftime('%Y-%m-%d')
        ci = f"'{check_in}'" if check_in else 'NULL'
        co = f"'{check_out}'" if check_out else 'NULL'
        sqls.append(
            f"INSERT INTO attendance (id,hospital_id,user_id,date,check_in,check_out,status,note) "
            f"VALUES ('{aid}','{HID}','{uid}','{date_str}',{ci},{co},'{status}','{esc(note)}');"
        )

# ============================================================
# 2. onboarding_tasks — 12개 (지원자 이수정=hired 대상)
# ============================================================
hired_applicant = 'ap-e89deaa0bb22412c'  # 이수정 (hired)
onboarding_tasks = [
    ('documents', '근로계약서 서명', '인사팀에서 계약서 전달 후 서명 받기', 'test-desk-001', 'completed', 3),
    ('documents', '개인정보 동의서 제출', '주민등록초본/통장사본/이력서 원본', 'test-desk-001', 'completed', 2),
    ('documents', '4대보험 가입 신청', '건강/국민/고용/산재 가입 처리', 'test-desk-001', 'completed', 5),
    ('access', '사원증 발급', '사진 촬영 후 카드키 발급', 'test-desk-001', 'completed', 1),
    ('access', 'KakaoWork 계정 생성', '회사 계정으로 초대', ADMIN_ID, 'completed', 1),
    ('access', '진료 프로그램 계정 세팅', '두번에 권한 부여, 치카치카 접속 테스트', 'test-hyg-001', 'in_progress', 0),
    ('equipment', '유니폼 3세트 지급', '상의 M/하의 28 - 지급 완료', 'test-desk-001', 'completed', 7),
    ('equipment', '개인 사물함 배정', '탈의실 12번', 'test-desk-001', 'completed', 1),
    ('training', '병원 소개 오리엔테이션', '병원 철학/환자경험 설계 1시간', ADMIN_ID, 'in_progress', 3),
    ('training', '감염관리 프로토콜 교육', '소독·멸균·에어샤워 실습', 'test-hyg-001', 'pending', 7),
    ('training', '상담 스크립트 롤플레이', '초진/재진/환불 시나리오 3회', 'test-desk-001', 'pending', 10),
    ('general', '멘토 매칭 + 첫 티타임', '김수민 선생님과 30분 티타임', ADMIN_ID, 'pending', 5),
]
for cat, title, desc, assignee, status, days_offset in onboarding_tasks:
    tid = rid('ob')
    due = (today + timedelta(days=days_offset)).strftime('%Y-%m-%d')
    completed = f"'{(today - timedelta(days=random.randint(0,5))).strftime('%Y-%m-%d %H:%M:%S')}'" if status == 'completed' else 'NULL'
    sqls.append(
        f"INSERT INTO onboarding_tasks (id,hospital_id,applicant_id,title,description,category,assigned_to,status,due_date,completed_at) "
        f"VALUES ('{tid}','{HID}','{hired_applicant}','{esc(title)}','{esc(desc)}','{cat}','{assignee}','{status}','{due}',{completed});"
    )

# ============================================================
# 3. pricing — 18종 진료 가격표
# ============================================================
pricing_rows = [
    ('cat-mat-01', '임플란트 (일반)', 120, 180, '티타늄 픽스처 + 크라운 포함'),
    ('cat-mat-01', '임플란트 (스트라우만)', 180, 250, '스위스 프리미엄 픽스처'),
    ('cat-mat-01', '임플란트 (오스템 TS III)', 100, 140, '국산 오스템 프리미엄'),
    ('cat-mat-01', '상악동 거상술', 80, 150, '골이식 포함'),
    ('cat-mat-01', '올온포 (All-on-4)', 1800, 2500, '무치악 고정성 보철 풀세트'),
    ('cat-mat-02', '투명교정 (인비절라인)', 450, 650, '전체치열 24-36개월 기준'),
    ('cat-mat-02', '투명교정 (클리피씨)', 300, 450, '국산 투명교정'),
    ('cat-mat-02', '설측교정', 650, 900, '치아 안쪽 부착 방식'),
    ('cat-mat-02', '부분교정', 150, 300, '앞니 6-8개 부분 배열'),
    ('cat-mat-03', '지르코니아 크라운', 45, 70, '심미+강도 겸비'),
    ('cat-mat-03', '골드 크라운', 55, 90, '금 함량 58% 기준'),
    ('cat-mat-03', 'PFM 크라운', 25, 40, '메탈세라믹'),
    ('cat-mat-04', '라미네이트', 60, 90, '치아당 가격'),
    ('cat-mat-04', '올세라믹 (이맥스)', 55, 85, 'E-max 프레스'),
    ('cat-mat-04', '치아미백 (오피스)', 25, 45, '진료실 1회 시술'),
    ('cat-mat-04', '치아미백 (홈)', 15, 25, '개인 트레이 제작 포함'),
    ('cat-mat-04', '잇몸 성형', 30, 80, '레이저 잇몸라인 정리'),
    ('cat-mat-04', '심미 보철 풀세트', 500, 800, '상악 전치부 6-8개 기준'),
]
for idx, (cat_id, name, pmin, pmax, desc) in enumerate(pricing_rows):
    pid = rid('pr')
    sqls.append(
        f"INSERT INTO pricing (id,hospital_id,category_id,procedure_name,price_min,price_max,price_unit,description,sort_order,is_active) "
        f"VALUES ('{pid}','{HID}','{cat_id}','{esc(name)}',{pmin},{pmax},'만원','{esc(desc)}',{idx*10},1);"
    )

# ============================================================
# 4. kpi_targets — 최근 6개월 월별 목표
# ============================================================
# 기존 1개 있음 → 현재월 포함 앞뒤 6개월 덮어쓰기 (id 고정 대신 새로 추가)
for i in range(6):
    target_date = (today.replace(day=1) - timedelta(days=i*30)).replace(day=1)
    ym = target_date.strftime('%Y-%m')
    target_revenue = random.choice([18000, 20000, 22000, 24000, 25000]) * 10000  # 1.8억 ~ 2.5억
    insurance = round(random.uniform(11.5, 14.5), 1)
    new_wd = random.randint(22, 30)
    new_we = random.randint(15, 25)
    hours = random.randint(240, 280)
    weekdays = random.randint(20, 23)
    weekend = random.randint(8, 11)
    note = random.choice([
        '임플란트 캠페인 집중 월',
        '신환 유입 확대 목표',
        '재진 전환율 80% 목표',
        '월말 결산 미팅 예정',
        '여름 방학 교정 시즌',
        '명절 연휴 반영'
    ])
    kid = rid('kpi')
    sqls.append(
        f"INSERT OR REPLACE INTO kpi_targets (id,hospital_id,year_month,target_revenue,insurance_ratio,target_new_patients_weekday,target_new_patients_weekend,total_hours,weekdays,weekend_days,notes,created_by) "
        f"VALUES ('{kid}','{HID}','{ym}',{target_revenue},{insurance},{new_wd},{new_we},{hours},{weekdays},{weekend},'{esc(note)}','{ADMIN_ID}');"
    )

# ============================================================
# 5. gamification_progress — 3명 x 20미션 = 60건
# ============================================================
missions_q = subprocess.run(
    ['npx', 'wrangler', 'd1', 'execute', 'pfm-production', '--local',
     f"--command=SELECT id, target_value, period, points FROM gamification_missions WHERE hospital_id='{HID}';",
     '--json'],
    capture_output=True, text=True, cwd='/home/user/webapp'
)
import json, re
# wrangler json 출력에서 JSON 부분만 추출
m = re.search(r'\[\s*\{', missions_q.stdout)
missions_data = []
if m:
    try:
        j = json.loads(missions_q.stdout[m.start():])
        missions_data = j[0]['results']
    except Exception as e:
        print(f"  미션 파싱 실패: {e}")

print(f"  미션 {len(missions_data)}개 로드")

# 현재 주/월 period_key
current_week_key = f"{today.isocalendar()[0]}-W{today.isocalendar()[1]:02d}"
current_month_key = today.strftime('%Y-%m')

for m in missions_data:
    mission_id = m['id']
    target = m['target_value']
    period = m.get('period', 'weekly')
    points = m.get('points', 100)
    period_key = current_week_key if period == 'weekly' else current_month_key
    
    for uid, uname, _ in USERS:
        # 80% 확률로 진행 중, 40% 완료
        progress_pct = random.choice([0.2, 0.4, 0.6, 0.8, 1.0, 1.0, 1.2])
        current = min(int(target * progress_pct), target)
        completed = 1 if current >= target else 0
        earned = points if completed else 0
        pid = rid('gp')
        sqls.append(
            f"INSERT OR REPLACE INTO gamification_progress (id,hospital_id,user_id,mission_id,period_key,current_value,completed,points_earned) "
            f"VALUES ('{pid}','{HID}','{uid}','{mission_id}','{period_key}',{current},{completed},{earned});"
        )

# ============================================================
# 6. courses — 8개 교육
# ============================================================
courses = [
    ('onboarding', '병원 소개 & 원장 철학', '서울비디 환자경험 설계 원리', 1),
    ('onboarding', '감염관리 프로토콜 A-Z', '멸균/소독/에어샤워 실무', 1),
    ('onboarding', '상담 스크립트 기본기', '초진/재진/환불 시나리오', 1),
    ('clinical', '임플란트 어시스트 표준', '오스템/스트라우만 시스템별 세팅', 0),
    ('clinical', '투명교정 어태치먼트 실무', '인비절라인 케이스 관리', 0),
    ('service', '환자 전화 응대 3단계', 'Empathy → Solution → Follow-up', 1),
    ('service', '불만 환자 응대 롤플레이', '컴플레인 5단계 대응법', 0),
    ('general', '페이션트 퍼널 10단계 이해', '인지→내원→전환→충성→추천 전 여정', 1),
]
course_ids = []
for idx, (cat, title, desc, req) in enumerate(courses):
    cid = rid('course')
    course_ids.append(cid)
    sqls.append(
        f"INSERT INTO courses (id,hospital_id,title,description,category,is_required,sort_order) "
        f"VALUES ('{cid}','{HID}','{esc(title)}','{esc(desc)}','{cat}',{req},{idx*10});"
    )

# course_progress — 3명 x 8과정 = 24건
for cid in course_ids:
    for uid, uname, _ in USERS:
        r = random.random()
        if r < 0.5:
            status = 'completed'
            score = random.randint(85, 100)
            completed_at = f"'{(today - timedelta(days=random.randint(3,30))).strftime('%Y-%m-%d %H:%M:%S')}'"
        elif r < 0.8:
            status = 'in_progress'
            score = 0
            completed_at = 'NULL'
        else:
            status = 'not_started'
            score = 0
            completed_at = 'NULL'
        pid = rid('cp')
        sqls.append(
            f"INSERT OR REPLACE INTO course_progress (id,course_id,user_id,hospital_id,status,score,completed_at) "
            f"VALUES ('{pid}','{cid}','{uid}','{HID}','{status}',{score},{completed_at});"
        )

# ============================================================
# 실행
# ============================================================
print(f"\n총 {len(sqls)}개 SQL 준비")

# 청크로 쪼개서 실행 (D1 쿼리 크기 제한)
CHUNK = 60
total_success = 0
total_fail = 0
for i in range(0, len(sqls), CHUNK):
    chunk = sqls[i:i+CHUNK]
    script = '\n'.join(chunk)
    result = subprocess.run(
        ['npx', 'wrangler', 'd1', 'execute', 'pfm-production', '--local', f'--command={script}'],
        capture_output=True, text=True, cwd='/home/user/webapp'
    )
    if 'commands executed successfully' in result.stdout or 'command executed successfully' in result.stdout:
        m = re.search(r'(\d+) commands? executed successfully', result.stdout)
        succ = int(m.group(1)) if m else len(chunk)
        total_success += succ
        print(f"  청크 {i//CHUNK+1}: {succ}/{len(chunk)} ✅")
    else:
        total_fail += len(chunk)
        print(f"  청크 {i//CHUNK+1}: ❌")
        err_preview = (result.stderr or result.stdout)[-400:]
        print(f"    {err_preview}")

print(f"\n최종: {total_success} 성공 / {total_fail} 실패 / 총 {len(sqls)}")
