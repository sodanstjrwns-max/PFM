#!/usr/bin/env python3
"""
seed-feedback-proper.py
피드백노트 = 관리자가 잘못한 직원에게 "너 이거 잘못했다" 남기는 지적 기록
- 양방향 X, 감사/칭찬/제안 X
- 관리자(admin) → 스태프(staff) 단방향만
- 구체적 상황 + 시간 + 증거 + 개선 지시 형태
"""
import subprocess, uuid, random
from datetime import datetime, timedelta

random.seed(42)
HID = 'af4542c2-e55b-41cf-8d5d-805f8294a3d3'
ADMIN_ID = '515e829a-2a40-48f7-b49e-fef2cabfd23f'
ADMIN_NAME = '데모 원장'
HYG_ID = 'test-hyg-001'  # 김수민 (hygienist)
DESK_ID = 'test-desk-001'  # 이지영 (desk)

def rid(p):
    return f"{p}-{uuid.uuid4().hex[:16]}"

def esc(s):
    return str(s).replace("'", "''") if s is not None else ''

# 1단계: 기존 피드백 전부 삭제 (잘못된 데이터)
print("1단계: 기존 피드백 삭제")
result = subprocess.run(
    ['npx', 'wrangler', 'd1', 'execute', 'pfm-production', '--local',
     f"--command=DELETE FROM feedback_note_replies WHERE hospital_id='{HID}'; DELETE FROM feedback_notes WHERE hospital_id='{HID}';"],
    capture_output=True, text=True, cwd='/home/user/webapp'
)
print(f"  삭제 완료")

# 2단계: 관리자 → 직원 지적 피드백 (18건)
# 각 건마다: 구체 시간 + 현장 상황 + 환자/팀 영향 + 개선 지시
# category: clinical(진료), hygiene(위생), communication(응대), process(프로세스), 
#            attendance(근태), conversion(상담전환), teamwork(협업), documentation(기록)
# severity: minor(주의), moderate(경고), severe(심각)

feedbacks = [
    # ===== 김수민 (위생사) — 임상/위생 중심 지적 =====
    {
        'target_id': HYG_ID, 'target_name': '김수민', 'target_team': 'clinical',
        'incident_days_ago': 2, 'category': 'hygiene', 'severity': 'severe',
        'title': '소독 사이클 미확인 상태에서 환자 입장 유도',
        'description': '4월 19일 오전 10:15경, 2진료실 소독기 녹색 LED 확인 없이 3번째 환자(이○○님) 입장시킴. 뒤늦게 사이클 미완료 확인하여 환자 재대기 요청. 환자 불만 표출.',
        'feedback': '환자 입장 전 소독기 LED 녹색 확인은 필수 절차임. 재발 시 진료실 입장 체크리스트 재교육 진행. 오늘부터 2주간 입장 전 확인 사진 카톡방 업로드 요망.',
        'status': 'acknowledged', 'days_ago_ack': 1,
    },
    {
        'target_id': HYG_ID, 'target_name': '김수민', 'target_team': 'clinical',
        'incident_days_ago': 5, 'category': 'hygiene', 'severity': 'moderate',
        'title': '멸균 파우치 유효기간 표기 누락',
        'description': '4월 16일 재고 점검 중 멸균 파우치 12개에서 멸균 날짜 스탬프 누락 확인. 본인 담당 세팅분.',
        'feedback': '멸균 직후 날짜 스탬프는 감염관리 기본. 해당 파우치 전량 재멸균 후 본인이 재스탬프. 다음주 금요일까지 멸균 프로토콜 체크리스트 제출.',
        'status': 'resolved', 'days_ago_ack': 4, 'days_ago_resolved': 2,
    },
    {
        'target_id': HYG_ID, 'target_name': '김수민', 'target_team': 'clinical',
        'incident_days_ago': 8, 'category': 'clinical', 'severity': 'moderate',
        'title': '스케일링 후 환자 주의사항 미전달',
        'description': '4월 13일 오후 3시 박○○님(45세) 스케일링 후 주의사항 안내 생략. 당일 저녁 환자 전화로 시린 증상 호소. 확인 결과 설명 누락.',
        'feedback': '스케일링 후 시린 증상/출혈/음식물 주의 3가지는 반드시 구두 안내 + 안내문 교부. 본인이 직접 환자에게 전화해서 재안내 완료 요망. 완료 후 보고.',
        'status': 'resolved', 'days_ago_ack': 7, 'days_ago_resolved': 5,
    },
    {
        'target_id': HYG_ID, 'target_name': '김수민', 'target_team': 'clinical',
        'incident_days_ago': 12, 'category': 'documentation', 'severity': 'minor',
        'title': '차트 기록 누락 (P.I. 측정값)',
        'description': '4월 9일 정○○님 SRP 케이스, P.I./G.I. 측정값 차트 미기재. 다음 내원 시 비교 불가로 치료계획 재수립 필요.',
        'feedback': '구강검진 시 측정값은 즉시 차트 입력. 종료 전 기록 누락 없는지 본인 확인 후 퇴근하는 습관 들이길. 해당 환자는 다음 내원 시 재측정 필수.',
        'status': 'acknowledged', 'days_ago_ack': 10,
    },
    {
        'target_id': HYG_ID, 'target_name': '김수민', 'target_team': 'clinical',
        'incident_days_ago': 15, 'category': 'communication', 'severity': 'moderate',
        'title': '환자 앞에서 재료 찾느라 우왕좌왕',
        'description': '4월 6일 오전 11시 임플란트 2차 케이스 어시스트 중, 필요 재료 위치 몰라서 3분 이상 서랍 뒤적거림. 환자 누워서 불안해하는 모습 보임.',
        'feedback': '수술 전 셋업 때 본인 담당 트레이 재료 위치 사전 점검 필수. 이번주 내로 재료 배치도 다시 숙지하고 수석위생사에게 확인받을 것.',
        'status': 'resolved', 'days_ago_ack': 14, 'days_ago_resolved': 10,
    },
    {
        'target_id': HYG_ID, 'target_name': '김수민', 'target_team': 'clinical',
        'incident_days_ago': 20, 'category': 'attendance', 'severity': 'minor',
        'title': '4월 2째주 지각 2회',
        'description': '4월 7일(9:12), 4월 9일(9:18) 두 번 지각. 사전 연락 없었음. 해당 시간대 첫 환자 대기 발생.',
        'feedback': '지각 시 최소 8:30까지 카톡방 사전 공지 필수. 반복 시 근태 경고 처리. 이번 달 3회 초과 시 인사평가 반영.',
        'status': 'acknowledged', 'days_ago_ack': 18,
    },
    {
        'target_id': HYG_ID, 'target_name': '김수민', 'target_team': 'clinical',
        'incident_days_ago': 25, 'category': 'clinical', 'severity': 'severe',
        'title': '잘못된 재료 트레이 제공 (거의 사고)',
        'description': '4월 1일 오후 2시 3진료실, 교정 와이어 교체 케이스에 보철용 레진 트레이 세팅. 원장이 직전 확인으로 발견. 환자에게 사용되었다면 사고.',
        'feedback': '트레이 세팅 후 본인이 1차 체크, 원장/수석 2차 체크 필수 재확인. 이번 건은 본인의 이중확인 누락이 원인. 향후 1달간 트레이 세팅 체크 사진 카톡 업로드 요망.',
        'status': 'resolved', 'days_ago_ack': 24, 'days_ago_resolved': 20,
    },
    {
        'target_id': HYG_ID, 'target_name': '김수민', 'target_team': 'clinical',
        'incident_days_ago': 30, 'category': 'teamwork', 'severity': 'minor',
        'title': '교대 시간 인수인계 생략',
        'description': '3월 27일 오후 교대 시 진행 중이던 2케이스 상태 인수인계 없이 퇴근. 다음 담당자가 차트 보고 역추적.',
        'feedback': '교대 시 진행 케이스 + 대기 환자 + 특이사항 3가지는 반드시 구두 인수인계. 본인 담당분은 본인이 마무리까지 책임.',
        'status': 'open', 'days_ago_ack': None,
    },
    
    # ===== 이지영 (데스크) — 응대/상담/행정 중심 지적 =====
    {
        'target_id': DESK_ID, 'target_name': '이지영', 'target_team': 'front',
        'incident_days_ago': 1, 'category': 'communication', 'severity': 'severe',
        'title': '환자 컴플레인 통화 중 말 끊기',
        'description': '4월 20일 오후 4:30 환불 문의 전화 응대 중, 환자 설명 중간에 "그건 규정상 안 됩니다" 끊고 들어감. 환자 화남. 5분 후 재전화로 장시간 항의.',
        'feedback': '컴플레인 통화는 끝까지 경청 → 공감 → 해결안 제시 순서 절대 원칙. 해당 환자에게 본인이 직접 사과 전화 요망. 다음주 월요일까지 불만 응대 3단계 롤플레이 재이수.',
        'status': 'open', 'days_ago_ack': None,
    },
    {
        'target_id': DESK_ID, 'target_name': '이지영', 'target_team': 'front',
        'incident_days_ago': 3, 'category': 'conversion', 'severity': 'moderate',
        'title': '임플란트 상담 이탈 — 비용 설명 미숙',
        'description': '4월 18일 오전 김○○님(58세) 임플란트 상담, 비용 질문에 "원장님께 여쭤볼게요"만 반복. 환자 "그냥 다른 데 알아볼게요" 하고 퇴장. 상담 이탈.',
        'feedback': '가격 질문은 데스크에서 1차 답변 가능해야 함. 임플란트 가격표 암기 + 할인/보험 적용 조건 스크립트 재숙지. 이번주 내로 모의 상담 3회 진행 후 본인이 녹음하여 제출.',
        'status': 'acknowledged', 'days_ago_ack': 2,
    },
    {
        'target_id': DESK_ID, 'target_name': '이지영', 'target_team': 'front',
        'incident_days_ago': 7, 'category': 'process', 'severity': 'moderate',
        'title': '예약 중복 배정 (동일 시간대 3명)',
        'description': '4월 14일 오후 2시 슬롯에 신환 3명 중복 예약 확인. 2명은 30분 대기, 1명은 당일 취소. 확인 결과 본인이 전화 예약 시 캘린더 재확인 누락.',
        'feedback': '전화 예약 시 반드시 화면 캘린더 실시간 업데이트 후 확인 복창. 중복 발생한 환자 2명에게 사과 + 다음 내원 시 15분 대기시간 환급 쿠폰 발급.',
        'status': 'resolved', 'days_ago_ack': 6, 'days_ago_resolved': 4,
    },
    {
        'target_id': DESK_ID, 'target_name': '이지영', 'target_team': 'front',
        'incident_days_ago': 10, 'category': 'communication', 'severity': 'minor',
        'title': '수납 시 금액 설명 부족',
        'description': '4월 11일 오후 박○○님 수납 시 총 67만원 청구, 환자 "뭐가 이렇게 비싸요?" 질문에 명세 설명 없이 영수증만 건네줌.',
        'feedback': '수납 시 항목별 금액 구두 안내 필수 (진료비/재료비/보험 적용). 영수증은 마지막에 교부. 환자 질문 없어도 먼저 설명하는 습관.',
        'status': 'acknowledged', 'days_ago_ack': 9,
    },
    {
        'target_id': DESK_ID, 'target_name': '이지영', 'target_team': 'front',
        'incident_days_ago': 14, 'category': 'documentation', 'severity': 'moderate',
        'title': '신환 동의서 서명 누락',
        'description': '4월 7일 신환 4명 중 2명의 개인정보 동의서 서명 미수령 확인. 차트에는 접수 완료로 표기됨. 법적 문제 소지.',
        'feedback': '신환 접수 프로세스에서 동의서 서명은 차트 개설 전 필수 단계. 해당 2명 환자에게 다음 내원 시 즉시 서명 받기. 접수 체크리스트 다시 숙지.',
        'status': 'resolved', 'days_ago_ack': 13, 'days_ago_resolved': 10,
    },
    {
        'target_id': DESK_ID, 'target_name': '이지영', 'target_team': 'front',
        'incident_days_ago': 18, 'category': 'communication', 'severity': 'minor',
        'title': '환자 앞에서 다른 직원 험담',
        'description': '4월 3일 오후 대기실에서 김수민 선생님 관련 험담성 발언을 환자 2명이 들었다는 제보. 구체적으로 "그 선생님 자꾸 늦어요" 발언.',
        'feedback': '환자 공간에서는 동료 관련 부정적 발언 절대 금지. 내부 문제는 내부에서. 해당 발언이 리뷰/입소문 악영향 가능. 재발 시 서면 경고.',
        'status': 'acknowledged', 'days_ago_ack': 16,
    },
    {
        'target_id': DESK_ID, 'target_name': '이지영', 'target_team': 'front',
        'incident_days_ago': 22, 'category': 'conversion', 'severity': 'minor',
        'title': '재진 콜백 3건 미이행',
        'description': '3월 30일 재진 예정 환자 중 3명 콜백 미이행 확인. 2명은 타 병원 예약, 1명은 연락 두절. 재진 매출 손실 약 280만원 추정.',
        'feedback': '콜백 리스트는 당일 오전 10시 전 100% 완료 원칙. 부재 시 문자 + 카톡 2차 시도. 월말 콜백 이행률 리포트 제출.',
        'status': 'resolved', 'days_ago_ack': 20, 'days_ago_resolved': 15,
    },
    {
        'target_id': DESK_ID, 'target_name': '이지영', 'target_team': 'front',
        'incident_days_ago': 28, 'category': 'attendance', 'severity': 'minor',
        'title': '점심시간 복귀 지연 반복',
        'description': '3월 24일, 3월 26일 점심시간 종료 후 각 15분, 20분 지연 복귀. 오후 첫 환자 대기 발생.',
        'feedback': '점심시간은 1시간 엄수. 외부 약속은 저녁 시간 활용. 재발 시 근태 기록 반영.',
        'status': 'acknowledged', 'days_ago_ack': 26,
    },
    {
        'target_id': DESK_ID, 'target_name': '이지영', 'target_team': 'front',
        'incident_days_ago': 35, 'category': 'process', 'severity': 'moderate',
        'title': '카드 결제 후 영수증 미발행 반복',
        'description': '3월 17~19일 3일간 카드 결제 후 영수증 미발행 케이스 5건 확인. 월말 정산 시 금액 불일치 발생.',
        'feedback': '결제 후 영수증 발행은 예외 없는 필수 절차. 월말 정산 업무 본인이 직접 대조 작업 참여하여 원인 확인 요망.',
        'status': 'resolved', 'days_ago_ack': 33, 'days_ago_resolved': 28,
    },
    {
        'target_id': DESK_ID, 'target_name': '이지영', 'target_team': 'front',
        'incident_days_ago': 42, 'category': 'teamwork', 'severity': 'severe',
        'title': '진료실 요청 무응답 반복',
        'description': '3월 10일 오후 2진료실에서 추가 재료 요청 3회 카톡, 10분 이상 무응답. 결국 원장이 직접 자재실 방문. 환자 대기 연장.',
        'feedback': '진료실 요청은 최우선 대응. 본인 업무 중단하더라도 5분 내 응답 원칙. 이번 건은 환자 진료에 직접 영향 끼친 심각 사례로 분류. 다음 인사평가 반영 예정.',
        'status': 'resolved', 'days_ago_ack': 40, 'days_ago_resolved': 35,
    },
]

# SQL 생성
sqls = []
reply_sqls = []
today = datetime.now()

for fb in feedbacks:
    fid = rid('fb')
    incident = (today - timedelta(days=fb['incident_days_ago'])).strftime('%Y-%m-%d')
    created = today - timedelta(days=fb['incident_days_ago'] - 1)  # 사건 다음날 기록
    
    # acknowledged/resolved 타임스탬프
    ack_at = 'NULL'
    acknowledged = 0
    if fb['status'] in ('acknowledged', 'resolved') and fb.get('days_ago_ack') is not None:
        ack_dt = today - timedelta(days=fb['days_ago_ack'])
        ack_at = f"'{ack_dt.strftime('%Y-%m-%d %H:%M:%S')}'"
        acknowledged = 1
    
    resolved_at = 'NULL'
    resolved_by = 'NULL'
    if fb['status'] == 'resolved' and fb.get('days_ago_resolved') is not None:
        res_dt = today - timedelta(days=fb['days_ago_resolved'])
        resolved_at = f"'{res_dt.strftime('%Y-%m-%d %H:%M:%S')}'"
        resolved_by = f"'{ADMIN_ID}'"
    
    created_str = created.strftime('%Y-%m-%d %H:%M:%S')
    
    sqls.append(
        f"INSERT INTO feedback_notes (id,hospital_id,author_id,author_name,author_role,"
        f"target_user_id,target_user_name,target_team,incident_date,category,severity,"
        f"title,description,feedback,visibility,acknowledged,acknowledged_at,"
        f"status,resolved_at,resolved_by,created_at,updated_at) VALUES ("
        f"'{fid}','{HID}','{ADMIN_ID}','{ADMIN_NAME}','admin',"
        f"'{fb['target_id']}','{esc(fb['target_name'])}','{fb['target_team']}',"
        f"'{incident}','{fb['category']}','{fb['severity']}',"
        f"'{esc(fb['title'])}','{esc(fb['description'])}','{esc(fb['feedback'])}',"
        f"'target',{acknowledged},{ack_at},"
        f"'{fb['status']}',{resolved_at},{resolved_by},"
        f"'{created_str}','{created_str}');"
    )
    
    # acknowledged/resolved 건에 대해 직원 답글 1~2개 (수용/해명/약속)
    if fb['status'] in ('acknowledged', 'resolved'):
        reply_templates = {
            HYG_ID: [
                '확인했습니다. 말씀해주신대로 오늘부터 바로 체크하겠습니다.',
                '죄송합니다. 재발하지 않도록 체크리스트 다시 숙지하겠습니다.',
                '네, 해당 환자분께 직접 연락드려 안내 완료했습니다.',
                '지적하신 부분 인지했고, 이번주 금요일까지 보완 완료하겠습니다.',
                '앞으로 퇴근 전 차트 누락 여부 반드시 확인하겠습니다.',
            ],
            DESK_ID: [
                '확인했습니다. 해당 환자분께 사과 전화 드렸습니다.',
                '죄송합니다. 스크립트 재숙지하고 모의 상담 녹음본 이번주 내 제출하겠습니다.',
                '네, 영수증 미발행분 이번주 안으로 전부 재확인해서 정산 맞추겠습니다.',
                '동의서 누락 2건 내일 환자 내원 시 즉시 수령하겠습니다.',
                '앞으로는 환자 앞에서 말조심하겠습니다. 죄송합니다.',
            ],
        }
        reply_body = random.choice(reply_templates.get(fb['target_id'], ['확인했습니다.']))
        reply_id = rid('fbr')
        reply_dt = (ack_dt if fb.get('days_ago_ack') else today).strftime('%Y-%m-%d %H:%M:%S')
        reply_sqls.append(
            f"INSERT INTO feedback_note_replies (id,note_id,hospital_id,author_id,author_name,author_role,body,is_internal,created_at) "
            f"VALUES ('{reply_id}','{fid}','{HID}','{fb['target_id']}','{esc(fb['target_name'])}','staff','{esc(reply_body)}',0,'{reply_dt}');"
        )

all_sqls = sqls + reply_sqls
print(f"\n2단계: SQL {len(all_sqls)}개 준비 ({len(sqls)} notes + {len(reply_sqls)} replies)")

# 청크 실행
CHUNK = 30
total = 0
import re
for i in range(0, len(all_sqls), CHUNK):
    chunk = all_sqls[i:i+CHUNK]
    script = '\n'.join(chunk)
    result = subprocess.run(
        ['npx', 'wrangler', 'd1', 'execute', 'pfm-production', '--local', f'--command={script}'],
        capture_output=True, text=True, cwd='/home/user/webapp'
    )
    m = re.search(r'(\d+) commands? executed successfully', result.stdout)
    if m:
        cnt = int(m.group(1))
        total += cnt
        print(f"  청크 {i//CHUNK+1}: {cnt}/{len(chunk)} ✅")
    else:
        print(f"  청크 {i//CHUNK+1}: ❌ {(result.stderr or result.stdout)[-300:]}")

print(f"\n최종: {total}/{len(all_sqls)}")
