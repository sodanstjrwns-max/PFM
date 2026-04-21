#!/usr/bin/env python3
"""피드백노트(feedback_notes) + 답글(feedback_note_replies) 대량 주입.
모든 방향(admin→staff, manager→staff, staff→manager, peer→peer) 커버."""
import subprocess
import random
import uuid
from datetime import datetime, timedelta

HID = 'af4542c2-e55b-41cf-8d5d-805f8294a3d3'
USERS = [
    ('515e829a-2a40-48f7-b49e-fef2cabfd23f', '데모 원장', 'admin', 'clinical'),
    ('test-hyg-001', '김수민', 'hygienist', 'clinical'),
    ('test-desk-001', '이지영', 'desk', 'desk'),
]
ADMIN = USERS[0][0]
TODAY = datetime(2026, 4, 21)

def uid(p='fb'): return f"{p}-{uuid.uuid4().hex[:12]}"
def esc(s): return s.replace("'", "''")

random.seed(11)

# ─────────────────────────────────────────────
# 피드백노트 시나리오 (자연스러운 실제 케이스)
# 각 항목: (author_idx, target_idx, category, severity, title, description, feedback, visibility, acknowledged, status, response, days_ago, replies)
# ─────────────────────────────────────────────

NOTES = [
    # 원장 → 김수민 (진료보조, 긍정적 코칭)
    (0, 1, 'clinical', 'minor',
     '임플란트 어시스트 훌륭했어요',
     '오늘 오전 45번 치아 임플란트 케이스, 미러 포지션이랑 석션 타이밍 완벽했어요. 환자분도 편안해하시더라고요.',
     '계속 유지해주시고, 신입 스탭 들어오면 김수민 쌤이 롤모델이 되어주시면 좋겠어요.',
     'target', 1, 'acknowledged', '감사합니다 원장님! 처음엔 긴장했는데 칭찬 받으니 힘이 나네요. 신입 들어오면 적극 가르쳐드릴게요.',
     2, [
         ('데모 원장', '👍 기대할게요'),
     ]),

    # 원장 → 이지영 (데스크, 상담 관련 개선)
    (0, 2, 'communication', 'moderate',
     '상담 첫 인사 톤 조금만 더 부드럽게',
     '오늘 오전 신환 2분 응대하실 때 업무톤이 조금 딱딱하게 들렸어요. 환자분 표정도 살짝 긴장되어 보였습니다.',
     '첫 5초가 중요해요. 눈 맞추고 한 박자 쉬었다가 "안녕하세요 서울비디치과입니다 😊" 이렇게 하면 분위기가 달라져요. 내일부터 한번 해봐요.',
     'target', 1, 'acknowledged', '확인했습니다. 오늘 계속 의식하고 연습해볼게요. 내일 오전 상담부터 적용해보겠습니다!',
     3, [
         ('데모 원장', '좋아요. 한 주 해보고 같이 피드백 나눠봐요'),
         ('이지영', '넵! 녹음해서 셀프체크도 해볼게요'),
     ]),

    # 원장 → 김수민 (체크리스트 누락, moderate)
    (0, 1, 'process', 'moderate',
     '멸균 파우치 날짜 스탬프 누락 건',
     '4/18 오후 멸균 배출분 중 2개에 날짜 표기 누락. 다행히 발견 당일 전량 재멸균 처리 완료.',
     '감염관리 관점에서 critical 이슈예요. 멸균 SOP에 "포장 직후 스탬프" 단계를 명시하고, 이번주 내 전 직원 공유 부탁드려요.',
     'managers', 1, 'resolved', '죄송합니다 원장님. SOP 문서 초안 작성해서 내일 회의 때 공유드리겠습니다. 재발 방지 위해 제 자리에 스탬프 세트 상시 비치해두었습니다.',
     3, [
         ('데모 원장', '빠른 대응 감사해요. SOP 승인되면 벽에 붙여두죠'),
     ]),

    # 김수민 → 원장 (역방향, 건의/피드백)
    (1, 0, 'environment', 'minor',
     '3번 체어 라이트 각도 개선 제안',
     '3번 체어 라이트가 위치상 구치부 보실 때 그림자가 생깁니다. 여러 선생님이 불편해하세요.',
     '설치 업체 불러서 암(arm) 각도 조정하시거나, 보조 라이트 하나 추가하시면 좋을 것 같습니다. 비용은 10만원 이하라고 해요.',
     'target', 1, 'acknowledged', '좋은 지적이에요! 제가 미처 몰랐네요. 내일 업체 바로 불러서 조정할게요. 보조라이트도 필요하면 바로 구매 올립시다.',
     5, []),

    # 원장 → 이지영 (긍정 피드백)
    (0, 2, 'patient_service', 'minor',
     '오늘 VIP 환자 응대 센스 👏',
     '김○○ 원장님 사모님 내원하셨을 때, 대기시간 안내 + 차 준비 + 아이 동반 배려까지 완벽했어요.',
     '그 환자분이 퇴실하시면서 저에게 "데스크 분이 너무 친절하세요"라고 하시더군요. 이런 작은 차이가 소개를 만드는 거예요. 최고예요!',
     'public', 1, 'acknowledged', '헤헤 감사합니다 🙈 손자분까지 오셔서 걱정했는데 다행히 잘 풀렸네요!',
     1, [
         ('김수민', '이지영 쌤 진짜 센스 있으세요 👍'),
         ('데모 원장', '이런 케이스 녹음해서 교육자료로 쓰면 좋겠어요'),
     ]),

    # 원장 → 김수민 (운영 개선)
    (0, 1, 'process', 'minor',
     '차트 정리 시간 단축 아이디어',
     '진료 후 차트 정리하는 데 평균 8분 걸리는 것 같아요. 분당 차팅 시간을 줄일 수 있을까 고민해봅시다.',
     '템플릿 5개 정도 만들어서 공용 사용하면 어떨까요? 김수민 쌤이 초안 잡아주시면 원장이 검토할게요.',
     'target', 1, 'open', '',
     1, []),

    # 이지영 → 원장 (건의)
    (2, 0, 'environment', 'minor',
     '데스크 전화기 잡음 심해졌어요',
     '어제부터 1번 전화기에서 지지직거리는 소리가 심해서 환자분들이 불편해하세요.',
     '업체 문의하니 수화기 교체가 필요하다고 합니다. 예약해도 될까요?',
     'target', 1, 'resolved', '오케이 바로 진행하세요. 영수증 올려주시면 경비 처리할게요.',
     4, [
         ('이지영', '감사합니다! 오늘 오후에 업체 연락하겠습니다'),
     ]),

    # 원장 → 이지영 (상담 전환)
    (0, 2, 'conversion', 'moderate',
     '임플란트 상담 전환율 개선 필요',
     '3월 임플란트 상담 전환율이 42%. 2월 대비 8%p 하락. 상담실에서 "비용 부담" 얘기 나오면 바로 마무리되는 패턴이 보입니다.',
     '비용 이야기 나왔을 때 "할부 상품 먼저 안내 → 가치 재설명 → 결정 압박 없이" 순으로 스크립트를 바꿔봅시다. 다음주 교육 진행할게요.',
     'managers', 1, 'acknowledged', '네 확인했습니다. 저도 데이터 봤을 때 아쉬웠어요. 할부 안내 멘트 초안 만들어둘게요.',
     7, [
         ('데모 원장', '월요일 17:30 미팅 잡았어요. 롤플레이도 같이 해봐요'),
     ]),

    # 김수민 → 이지영 (동료간)
    (1, 2, 'communication', 'minor',
     '환자 차트 전달 타이밍',
     '오늘 오후 보철 환자분 차트가 진료실에 늦게 도착해서 5분 정도 대기 생겼어요. 환자분이 시계 자주 보셨습니다.',
     '데스크에서 호출 받으시면 바로 전달 부탁드려요. 바쁘실 땐 저한테 말씀주시면 제가 가지러 갈게요!',
     'target', 1, 'acknowledged', '아 죄송해요! 그때 전화 응대 중이었는데 한박자 늦었네요. 앞으로는 다른 분께 부탁드릴게요.',
     2, [
         ('김수민', '괜찮습니다~ 서로 챙겨요 😊'),
     ]),

    # 원장 → 김수민 (진료 꼼꼼함)
    (0, 1, 'clinical', 'minor',
     '석션 소리 환자 민감도',
     '오늘 오전 7번 환자분이 석션 소리에 많이 놀라셨어요. 미리 "이제 물 빨아들일게요" 한마디 해주시면 좋겠어요.',
     '특히 어르신이나 예민한 분들께는 행동 전 한 템포 안내. 작은 차이지만 환자 만족도에 큰 영향.',
     'target', 1, 'acknowledged', '확인했습니다! 내일부터 의식적으로 적용할게요. 고마워요 원장님.',
     5, []),

    # 원장 → 이지영 (급여/복지 관련 - severe visibility managers)
    (0, 2, 'other', 'severe',
     '예약 노쇼 대응 과잉 문제',
     '오늘 노쇼 환자 한 분께 전화하실 때 말투가 강하셨다고 환자 측 민원 들어왔습니다. 녹취 확인 결과 "오늘 안 오시면 불이익"이라는 표현.',
     '노쇼는 스트레스 이슈지만, 환자 대응 가이드라인 벗어나면 안됩니다. 다음주 미팅 때 따로 얘기합시다.',
     'managers', 0, 'open', '',
     0, []),

    # 이지영 → 김수민 (동료 칭찬)
    (2, 1, 'teamwork', 'minor',
     '어제 급하게 도와주셔서 감사',
     '어제 15시 예약 취소 생기면서 제가 혼자 3명 상담 연달아 하게 됐을 때, 음료 챙겨주시고 중간중간 환자 안내 도와주신 거 감사합니다.',
     '정말 든든했어요. 다음엔 제가 갚을게요 💛',
     'public', 1, 'acknowledged', '별 거 아니에요~ 저도 이지영 쌤한테 많이 도움 받고 있어서 당연한 거예요!',
     6, [
         ('데모 원장', '이런 팀워크 최고입니다 👏'),
     ]),

    # 원장 → 김수민 (세미나 참여 권유)
    (0, 1, 'development', 'minor',
     '5월 임플란트 세미나 참석 추천',
     '5월 15일 노벨바이오케어 세미나, 김수민 쌤 관심 있으실 것 같아서요.',
     '참가비는 병원에서 지원하겠습니다. 다녀오신 후 전 직원 공유 부탁드려요.',
     'target', 1, 'acknowledged', '와 감사합니다 원장님! 꼭 참석할게요. 자료 잘 정리해서 돌아와서 공유드리겠습니다.',
     8, []),

    # 김수민 → 원장 (프로세스 건의)
    (1, 0, 'process', 'minor',
     '신환 체크인 동선 개선 제안',
     '신환분들이 처음 오실 때 접수 → 문진표 → 진료실 안내 동선이 복잡한 것 같습니다.',
     '태블릿으로 문진표 받게 하면 대기시간도 줄고 이후 상담 준비도 빨라질 것 같아요. 참고자료 첨부합니다.',
     'target', 1, 'open', '',
     10, [
         ('데모 원장', '좋은 아이디어! 비용 알아보고 5월 중 도입 검토할게요'),
     ]),

    # 원장 → 이지영 (우수 상담 케이스)
    (0, 2, 'conversion', 'minor',
     '이번주 전악 임플란트 상담 성공',
     '4/17 상담하신 김○○ 환자분, 1,200만원 케이스 현장 계약. 할부 안내 + 가족 상의 시간 드린 게 주효했어요.',
     '다른 상담에도 이 방식 적용해봅시다. 녹취 공유 가능하면 다른 상담사들한테도 도움될 것 같아요.',
     'managers', 1, 'acknowledged', '감사합니다! 녹취 동의 받아뒀어요. 이번주 내로 공유 파일 준비하겠습니다 😊',
     4, [
         ('데모 원장', '💪'),
     ]),
]

sql = []

for author_idx, target_idx, category, severity, title, desc, fb, visibility, ack, status, resp, days_ago, replies in NOTES:
    a = USERS[author_idx]
    t = USERS[target_idx]
    nid = uid('fb')
    created = (TODAY - timedelta(days=days_ago, hours=random.randint(1,8))).strftime('%Y-%m-%d %H:%M:%S')
    incident = (TODAY - timedelta(days=days_ago)).strftime('%Y-%m-%d')
    
    ack_at = f"'{created}'" if ack else 'NULL'
    resp_at = f"'{created}'" if resp else 'NULL'
    resp_sql = f"'{esc(resp)}'" if resp else 'NULL'
    resolved_at = f"'{created}'" if status == 'resolved' else 'NULL'
    resolved_by = f"'{a[0]}'" if status == 'resolved' else 'NULL'
    
    sql.append(
        f"INSERT INTO feedback_notes (id, hospital_id, author_id, author_name, author_role, "
        f"target_user_id, target_user_name, target_team, incident_date, category, severity, "
        f"title, description, feedback, visibility, acknowledged, acknowledged_at, "
        f"target_response, target_responded_at, status, resolved_at, resolved_by, created_at, updated_at) "
        f"VALUES ('{nid}', '{HID}', '{a[0]}', '{a[1]}', '{a[2]}', "
        f"'{t[0]}', '{t[1]}', '{t[3]}', '{incident}', '{category}', '{severity}', "
        f"'{esc(title)}', '{esc(desc)}', '{esc(fb)}', '{visibility}', {ack}, {ack_at}, "
        f"{resp_sql}, {resp_at}, '{status}', {resolved_at}, {resolved_by}, '{created}', '{created}')"
    )
    
    # 댓글 (feedback_note_replies)
    for reply_author_name, reply_body in replies:
        # 이름으로 user 찾기
        ruser = next((u for u in USERS if u[1] == reply_author_name), USERS[0])
        rid = uid('fr')
        rcreated = (TODAY - timedelta(days=days_ago-1, hours=random.randint(1,20))).strftime('%Y-%m-%d %H:%M:%S')
        sql.append(
            f"INSERT INTO feedback_note_replies (id, note_id, hospital_id, author_id, author_name, author_role, body, is_internal, created_at) "
            f"VALUES ('{rid}', '{nid}', '{HID}', '{ruser[0]}', '{ruser[1]}', '{ruser[2]}', '{esc(reply_body)}', 0, '{rcreated}')"
        )

print(f"✓ {len(sql)}개 SQL 생성")

with open('/tmp/_fb.sql', 'w') as f:
    f.write(';\n'.join(s.rstrip(';') for s in sql) + ';')
r = subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'pfm-production', '--local', '--file=/tmp/_fb.sql'],
                   cwd='/home/user/webapp', capture_output=True, text=True, timeout=120)
if r.returncode == 0:
    print(f"✅ 전부 성공 ({len(sql)}개)")
else:
    print(f"⚠️ 일부 실패: {r.stderr[-300:]}")
