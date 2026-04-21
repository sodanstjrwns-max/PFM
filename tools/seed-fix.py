#!/usr/bin/env python3
"""누락된 events/job_postings/applicants 보충."""
import subprocess
import random
import uuid
from datetime import datetime, timedelta

HID = 'af4542c2-e55b-41cf-8d5d-805f8294a3d3'
ADMIN = '515e829a-2a40-48f7-b49e-fef2cabfd23f'
TODAY = datetime(2026, 4, 21)

def uid(p='x'): return f"{p}-{uuid.uuid4().hex[:16]}"
def d(off=0): return (TODAY + timedelta(days=off)).strftime('%Y-%m-%d')
def esc(s): return s.replace("'", "''")

random.seed(7)
sql = []

# event_type 허용값: meeting, vacation, maintenance, education, interview, other
extra_events = [
    ("임직원 전체 워크샵", "1박 2일 경주", "other", 14, 15, "#ef4444"),
    ("치과의사협회 학술대회", "김원장 강연", "education", 20, 20, "#f59e0b"),
    ("신입 입사일 - 박OO 데스크", "환영식", "other", 5, 5, "#0ea5e9"),
    ("원내 임플란트 세미나", "노벨바이오케어", "education", 8, 8, "#6366f1"),
    ("X-ray 유닛 정기점검", "업체 방문", "maintenance", -3, -3, "#64748b"),
    ("어버이날 휴진", "5/8 오후", "vacation", 17, 17, "#dc2626"),
    ("원장님 학회 출장", "2일간", "other", 24, 25, "#f59e0b"),
    ("5월 월간회의", "월말 전체", "meeting", 40, 40, "#0f766e"),
    ("새 장비 도입 미팅", "파노라마 신기종", "meeting", 12, 12, "#0f766e"),
    ("VIP 환자 케이스 컨퍼런스", "외부 전문가", "education", 21, 21, "#6366f1"),
    ("봄 이벤트 포토 촬영", "원내 콘텐츠", "other", -7, -7, "#ec4899"),
    ("노동절 휴진", "5/1", "vacation", 10, 10, "#dc2626"),
    ("상담 롤플레이 교육", "상담사", "education", 3, 3, "#6366f1"),
    ("재무 결산 미팅", "4월 마감", "meeting", 9, 9, "#0f766e"),
    ("신규 면접 - 김민지", "치과위생사", "interview", 2, 2, "#a855f7"),
    ("신규 면접 - 박하늘", "치과위생사", "interview", 4, 4, "#a855f7"),
    ("건강검진일", "전 직원", "other", 30, 30, "#10b981"),
    ("연말 송년회", "예약", "other", 60, 60, "#db2777"),
]
for t, desc, et, sd, ed, col in extra_events:
    eid = uid('ev')
    sql.append(
        f"INSERT INTO events (id, hospital_id, title, description, event_type, start_date, end_date, all_day, color, created_by) "
        f"VALUES ('{eid}', '{HID}', '{esc(t)}', '{esc(desc)}', '{et}', '{d(sd)}', '{d(ed)}', 1, '{col}', '{ADMIN}')"
    )

# 기존 job_posting_id 조회 후, 부족하면 추가 공고
r = subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'pfm-production', '--local',
                    '--command', f"SELECT id FROM job_postings WHERE hospital_id='{HID}'", '--json'],
                   cwd='/home/user/webapp', capture_output=True, text=True, timeout=30)
import json as _json
existing_jobs = [r_['id'] for r_ in _json.loads(r.stdout)[0]['results']]
print(f"기존 공고: {len(existing_jobs)}개")

# 누락된 지원자 2명 보충
r2 = subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'pfm-production', '--local',
                     '--command', f"SELECT COUNT(*) c FROM applicants WHERE hospital_id='{HID}'", '--json'],
                    cwd='/home/user/webapp', capture_output=True, text=True, timeout=30)
existing_app_count = _json.loads(r2.stdout)[0]['results'][0]['c']
print(f"기존 지원자: {existing_app_count}명")

extra_applicants = [
    ("박서진", "sj.park@example.com", "010-1111-2222", "3년차 치과위생사, 임플란트 전문"),
    ("최민서", "ms.choi@example.com", "010-3333-4444", "데스크 5년차, 상담 전환율 자신 있습니다"),
    ("홍지우", "jw.hong@example.com", "010-5555-6666", "신입입니다. 열정 하나는 최고!"),
    ("임소연", "sy.lim@example.com", "010-7777-8888", "치과위생사 2년차, 소아 케어 경험 풍부"),
]
for name, email, phone, cover in extra_applicants:
    aid = uid('ap')
    jp = random.choice(existing_jobs) if existing_jobs else None
    if not jp: continue
    st = random.choice(['applied', 'reviewing', 'interview'])
    rating = random.randint(0, 4)
    applied = (TODAY - timedelta(days=random.randint(1, 20))).strftime('%Y-%m-%d %H:%M:%S')
    sql.append(
        f"INSERT INTO applicants (id, hospital_id, job_posting_id, name, email, phone, cover_letter, status, rating, applied_at) "
        f"VALUES ('{aid}', '{HID}', '{jp}', '{esc(name)}', '{email}', '{phone}', '{esc(cover)}', '{st}', {rating}, '{applied}')"
    )

# 공고도 하나 추가
extra_posting = uid('jp')
sql.append(
    f"INSERT INTO job_postings (id, hospital_id, title, position_type, employment_type, description, requirements, benefits, salary_min, salary_max, status, created_by, deadline) "
    f"VALUES ('{extra_posting}', '{HID}', '데스크 매니저', 'desk', 'full_time', '데스크 총괄 업무', '데스크 2년 이상', '4대보험', 250, 320, 'open', '{ADMIN}', '{d(45)}')"
)

print(f"✓ {len(sql)}개 SQL 준비")

# 실행
with open('/tmp/_fix.sql', 'w') as f:
    f.write(';\n'.join(s.rstrip(';') for s in sql) + ';')
r = subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'pfm-production', '--local', '--file=/tmp/_fix.sql'],
                   cwd='/home/user/webapp', capture_output=True, text=True, timeout=120)
if r.returncode == 0:
    print(f"✅ {len(sql)}개 전부 성공")
else:
    # 한 줄씩 재시도
    ok = 0
    for i, s in enumerate(sql):
        with open('/tmp/_one.sql', 'w') as f:
            f.write(s + ';')
        r2 = subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'pfm-production', '--local', '--file=/tmp/_one.sql'],
                            cwd='/home/user/webapp', capture_output=True, text=True, timeout=30)
        if r2.returncode == 0:
            ok += 1
        else:
            print(f"  ✗ {i}: {r2.stderr[-150:]}")
    print(f"✅ {ok}/{len(sql)}")
