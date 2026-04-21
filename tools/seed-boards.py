#!/usr/bin/env python3
"""모든 게시판에 데모 데이터 대량 주입 (fin2@test.com 병원)"""
import random, hashlib, json
from datetime import datetime, timedelta

HID = 'af4542c2-e55b-41cf-8d5d-805f8294a3d3'
ADMIN = '515e829a-2a40-48f7-b49e-fef2cabfd23f'   # 데모 원장
HYG   = 'test-hyg-001'                             # 김수민
DESK  = 'test-desk-001'                            # 이지영
USERS = [ADMIN, HYG, DESK]
USER_NAMES = {ADMIN:'데모 원장', HYG:'김수민', DESK:'이지영'}

random.seed(42)

def uid(prefix, i):
    return f"{prefix}-{hashlib.md5(f'{prefix}{i}'.encode()).hexdigest()[:20]}"

def iso(d): return d.strftime('%Y-%m-%d')
def now(): return datetime.now().strftime('%Y-%m-%d %H:%M:%S')

today = datetime.now()
sql = []

# ─── 0. 기존 데모 데이터 먼저 삭제 (중복 방지) ─────────────
sql.append(f"DELETE FROM consultations WHERE hospital_id='{HID}';")
sql.append(f"DELETE FROM reviews WHERE hospital_id='{HID}';")
sql.append(f"DELETE FROM materials WHERE hospital_id='{HID}';")
sql.append(f"DELETE FROM scripts WHERE hospital_id='{HID}';")
sql.append(f"DELETE FROM posts WHERE hospital_id='{HID}';")
sql.append(f"DELETE FROM checklists WHERE hospital_id='{HID}';")
sql.append(f"DELETE FROM cases WHERE hospital_id='{HID}';")
sql.append(f"DELETE FROM consult_records WHERE hospital_id='{HID}';")
sql.append(f"DELETE FROM recall_tasks WHERE hospital_id='{HID}';")
sql.append(f"DELETE FROM surveys WHERE hospital_id='{HID}';")
sql.append(f"DELETE FROM kanban_cards WHERE hospital_id='{HID}';")
sql.append(f"DELETE FROM kanban_boards WHERE hospital_id='{HID}';")
sql.append(f"DELETE FROM fee_items WHERE hospital_id='{HID}';")
# fee_categories는 기존 것 있음 → 유지
sql.append(f"DELETE FROM praises WHERE 0=1;")  # table 없을 수 있음, 무시

# ─── 1. 상담 관리 (consultations) 30건 ────────────────────
NAMES = ['김민수','이서연','박준호','최수빈','정재훈','한지우','오예린','윤도현','임채원','강다은',
         '조민재','서유나','백승우','나혜린','문지훈','홍은서','송재민','안수아','구현우','류지영',
         '전하은','양도윤','배서윤','황민준','노아린','황태현','유예은','심재호','조윤서','김도영']
SRC = ['naver','instagram','referral','walk_in','phone','kakao','homepage','blog']
TRT = ['implant','ortho','prosth','esthetic','general','endo','perio']
STAT = ['inquiry','reserved','visited','consulting','agreed','payment','completed','lost']
for i in range(30):
    d = today - timedelta(days=random.randint(0, 45))
    st = random.choice(STAT)
    amt = random.choice([800000, 1500000, 2800000, 3500000, 4500000, 6000000, 12000000, 18000000])
    paid = amt if st in ['payment','completed'] else (amt*0.3 if st=='agreed' else 0)
    sql.append(f"""INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'{uid('con',i)}', '{HID}', '{NAMES[i]}', '010-{random.randint(1000,9999)}-{random.randint(1000,9999)}',
'{random.randint(20,65)}', '{random.choice(["male","female"])}', '{random.choice(SRC)}', '{random.choice(TRT)}', '{st}',
{amt}, {amt if st in ['agreed','payment','completed'] else 0}, {int(paid)},
'{iso(d)}', '{DESK}', '{random.choice(["urgent","high","normal","normal","normal"])}', '{iso(d)} 14:00:00');""")

# ─── 2. 리뷰 15건 (미응답 6, 응답 9) ───────────────────────
REVIEWS = [
    ('친절하게 설명해주셔서 감사합니다. 시설도 깨끗해요', 5),
    ('원장님이 아프지 않게 잘해주셔서 너무 좋았어요', 5),
    ('대기시간이 조금 길었지만 진료는 만족스러웠습니다', 4),
    ('스켈링 받았는데 아주 시원하고 깔끔합니다', 5),
    ('임플란트 상담받았는데 자세히 알려주셔서 결정했어요', 5),
    ('원장님 실력이 정말 좋으시네요. 추천합니다', 5),
    ('데스크 직원분이 너무 친절하세요', 5),
    ('주차가 좀 불편했어요', 3),
    ('치료 후 통증 관리도 잘 알려주셔서 편했습니다', 5),
    ('아이가 울지 않고 진료 받았어요', 5),
    ('진료실 분위기가 아늑하고 좋아요', 5),
    ('예약 시간이 잘 지켜져서 좋았어요', 4),
    ('비용이 좀 부담스러웠지만 만족합니다', 4),
    ('다시 방문하고 싶은 치과에요', 5),
    ('설명이 이해하기 쉽게 잘 해주셔요', 5),
]
for i, (c, r) in enumerate(REVIEWS):
    d = today - timedelta(days=random.randint(1, 60))
    reply = '감사합니다! 앞으로도 최선을 다하겠습니다 :)' if i >= 6 else ''
    sql.append(f"""INSERT INTO reviews (id, hospital_id, platform, reviewer_name, rating, content, reply, review_date, created_at) VALUES (
'{uid('rv',i)}','{HID}','{random.choice(["naver","google","kakao"])}','{NAMES[i%len(NAMES)]}',{r},'{c}','{reply}','{iso(d)}','{iso(d)} 10:00:00');""")

# ─── 3. 설명자료 (materials) 15건 ─────────────────────────
MATERIALS = [
    ('mat-impl','임플란트 수술 전 주의사항','수술 24시간 전부터 음주/흡연 금지. 당일 가벼운 식사 가능','pdf'),
    ('mat-impl','임플란트 식립 과정 안내','1단계 진단 → 2단계 임플란트 식립 → 3단계 보철 장착','pdf'),
    ('mat-impl','뼈이식이 필요한 경우','잇몸뼈가 부족한 경우 자가뼈/동종골을 이용합니다','pdf'),
    ('mat-cavi','충치 치료 단계별 안내','신경을 건드리지 않는 경미한 충치는 1회 내원으로 치료','image'),
    ('mat-cavi','신경치료 과정','3-4회 내원이 필요하며 통증 관리를 위해 진통제 처방','pdf'),
    ('mat-pros','크라운 치료 이해하기','신경치료 후 반드시 크라운이 필요한 이유','pdf'),
    ('mat-pros','라미네이트 vs 올세라믹','심미 크라운 재료별 장단점 비교표','pdf'),
    ('mat-orth','투명교정 vs 철사교정','투명교정은 탈착 가능, 철사교정은 효과 확실','pdf'),
    ('mat-peri','잇몸병 4단계','치은염 → 초기 치주염 → 중기 치주염 → 말기','image'),
    ('mat-extr','발치 후 주의사항','거즈 2시간 물고 있기, 침 삼키지 말기','pdf'),
    ('mat-extr','사랑니 발치 가이드','매복 사랑니는 CT 촬영 후 진료 결정','pdf'),
    ('mat-pedo','어린이 구강 검진 시기','첫 치아가 나면 6개월 이내 첫 방문 권장','image'),
    ('mat-hygi','올바른 칫솔질 방법','바스법: 45도 각도로 치아-잇몸 경계 진동','video'),
    ('mat-esth','치아 미백 과정','병원 미백 1회 + 가정용 키트 2주 병행','pdf'),
    ('mat-tmj','턱관절 장애 자가진단','입 벌릴 때 소리 + 통증 + 제한 중 2개 이상 시 진료','pdf'),
]
for i,(cat, title, desc, ftype) in enumerate(MATERIALS):
    d = today - timedelta(days=random.randint(5, 180))
    sql.append(f"""INSERT INTO materials (id,hospital_id,category_id,title,description,file_type,view_count,sort_order,created_at) VALUES (
'{uid('mt',i)}','{HID}','{cat}','{title}','{desc}','{ftype}',{random.randint(15,340)},{i},'{iso(d)} 09:00:00');""")

# ─── 4. 상담 스크립트 (scripts) 20건 ───────────────────────
SCRIPTS = [
    ('scr-impl','임플란트 가격 문의 대응','"임플란트 얼마예요?"','가격보다는 수명과 안전성 먼저 설명드려요. "저희 병원은 OOO 임플란트를 사용하고, 10년 보증을 해드립니다..."','비싸네요','네, 솔직히 비싸긴 하죠. 하지만 자연치아와 가장 비슷하게 쓸 수 있어요'),
    ('scr-impl','뼈이식 필요 설명','CT에서 뼈 부족 발견','"임플란트는 단단한 뼈에 고정되어야 오래 쓸 수 있어요..."','꼭 해야 하나요','필수는 아니지만, 뼈이식 없이 하면 임플란트 수명이 절반으로 줄어요'),
    ('scr-impl','즉시 심기 vs 2단계','발치 후 바로 심기 선호','"치아 뽑은 자리에 바로 심는 방법이 있지만..."','빨리 끝내고 싶어요','즉시식립은 조건이 맞을 때만 가능해요. CT 먼저 보겠습니다'),
    ('scr-cavi','신경치료 필요성 설명','"꼭 신경치료 해야 해요?"','신경이 이미 감염됐기 때문에 안 하면 농이 생겨요','통증이 없어요','지금은 없어도 갑자기 부을 수 있어요. 미리 치료가 안전해요'),
    ('scr-cavi','충치 예방 상담','스케일링 내원 환자','"충치는 생기기 전에 예방이 제일 중요해요..."','',''),
    ('scr-pros','크라운 vs 인레이 비교','큰 충치 치료 후','"충치가 큰 경우 인레이만으로 부족할 수 있어요..."','비용 차이는','크라운이 2배 비싸지만 수명이 3배 길어요'),
    ('scr-pros','라미네이트 상담','앞니 심미 개선','"라미네이트는 치아를 덜 깎고 자연스러워요..."','통증 있나요','마취하고 하니까 전혀 안 아파요'),
    ('scr-orth','성인 교정 상담','"30살인데 해도 돼요?"','교정은 나이 제한이 없어요. 치아뿌리가 건강하면 가능','기간은','성인은 평균 24개월, 발치여부에 따라 다릅니다'),
    ('scr-orth','투명교정 장단점','심미적 선호 환자','"투명교정은 탈착 가능한 게 장점이에요..."','확실해요','케이스에 따라 다르지만 경미한 경우 충분합니다'),
    ('scr-esth','미백 상담','변색된 앞니','"미백은 과산화수소로 치아 속 색소를 분해하는 방식..."','오래 가나요','6개월~1년 유지. 관리하면 더 오래갑니다'),
    ('scr-esth','치아 성형 상담','치아 모양 개선','"조금만 깎거나 레진으로 모양을 바꿀 수 있어요..."','',''),
    ('scr-obje','비싸다는 반응','가격 문의 후 망설임','"네, 비용 부담되시죠. 저희 무이자 할부 가능해요..."','무이자 최대','최대 24개월 카드 무이자 가능합니다'),
    ('scr-obje','생각해볼게요 응대','즉답 회피 환자','"네, 충분히 고민하세요. 다만 치료는 빠를수록..."','언제까지','이번주 안에 결정 주시면 예약 잡아드릴게요'),
    ('scr-obje','다른 병원과 비교','가격/시스템 비교 시도','"어디서 상담 받으셨는지 편하게 말씀 주세요..."','',''),
    ('scr-impl','임플란트 보증 안내','장기 보증 문의','"저희 병원은 10년 보증 제도가 있어요..."','조건은','정기검진 유지 시 10년 보증 적용됩니다'),
    ('scr-cavi','레진 vs 아말감','충치 치료 재료 선택','"레진은 색이 치아와 같고, 아말감은 보험 적용..."','',''),
    ('scr-pros','보철 관리법 설명','크라운 장착 후','"크라운은 깨지지 않게 단단한 것 피하세요..."','',''),
    ('scr-orth','교정 후 유지 장치','교정 완료 환자','"유지 장치를 안 끼면 다시 돌아갈 수 있어요..."','',''),
    ('scr-esth','라미네이트 후 관리','장착 후 주의','"얼음, 사탕 등은 피해주세요. 수명 단축 원인..."','',''),
    ('scr-obje','가족 상의 필요','결정권자 아님','"네, 가족분과 상의하세요. 저희가 자료 준비해드릴게요..."','',''),
]
for i,(cat,title,sit,stxt,obj,resp) in enumerate(SCRIPTS):
    # 작은 따옴표 escape
    def esc(s): return s.replace("'","''")
    sql.append(f"""INSERT INTO scripts (id,hospital_id,category_id,title,situation,script_text,objection,response,sort_order,created_at) VALUES (
'{uid('sc',i)}','{HID}','{cat}','{esc(title)}','{esc(sit)}','{esc(stxt)}','{esc(obj)}','{esc(resp)}',{i},'{iso(today - timedelta(days=random.randint(10,90)))} 11:00:00');""")

# ─── 5. 게시판 posts (공지 10, 자유 12, 칭찬 15, 실수 0 - feedback_notes가 담당) ──
NOTICES = [
    ('4월 신환 이벤트 안내','이번달 신환분 전원 파노라마 X-ray 무료 촬영',1),
    ('4/25 오후 휴진 안내','학회 참석으로 4월 25일 오후 진료가 휴진입니다',1),
    ('보험 파일 업데이트','5월부터 새로운 수가 적용됩니다. 교육 참고',1),
    ('직원 복지 개선 - 간식 코너 신설','3층 탕비실에 간식 비치합니다. 자율적으로!',0),
    ('4월 생일자 축하 이벤트','김수민 선생님 생일 축하드려요 🎉',0),
    ('신규 직원 온보딩 가이드','신입 입사 시 1주 온보딩 프로세스 확인해주세요',0),
    ('환자 만족도 설문 - 목표 NPS 70 달성','이번달 NPS 목표 72점 달성했어요! 고생하셨습니다',0),
    ('수기 기록 중단, 차트 필수 입력','5월부터 모든 기록은 차트에만 입력해주세요',1),
    ('감염관리 월례 점검 결과','4월 점검 전항목 PASS! 수고 많으셨습니다',0),
    ('야간 당직 변경 안내','다음주부터 야간 당직 스케줄이 변경됩니다. 확인',1),
]
FREE = [
    '오늘 점심 뭐 드실래요? 2층 새 파스타집 어때요',
    '감사하게도 환자분이 케이크 가져다 주셨어요 🎂',
    '진료실 에어컨 필터 청소는 누가 예약하셨나요?',
    '다들 마스크 어떤 거 쓰시는지 궁금해요',
    '오늘 아침 1번 체어 물 안 나와서 확인 부탁드려요',
    '점심 1시간 > 1시간 30분 변경되나요?',
    '연말 회식 장소 추천받아요',
    '임플란트 보증 양식 어디 있나요?',
    '데스크 프린터 토너 떨어졌어요',
    '3층 세미나실 월요일 몇시에 비어있나요?',
    '직원 명찰 분실했는데 재발급 절차?',
    '구강카메라 SD카드 어디 보관하나요?',
]
PRAISE = [
    ('김수민','오늘 까다로운 교정 환자 케어 최고였어요'),
    ('이지영','전화 예약 3건 연속 퍼펙트, 센스 👍'),
    ('김수민','어린이 환자 달래는 스킬이 대단해요'),
    ('이지영','컴플레인 한 환자 마음 돌린 거 진짜 고생했어요'),
    ('김수민','기구 세팅 빠르고 정확해서 진료가 매끄러워요'),
    ('이지영','퇴근 전 정리 항상 깔끔하게 해주셔서 감사'),
    ('김수민','오늘 수술 어시 완벽했어요'),
    ('이지영','환자분들 반응 좋다고 후기 여러 건 받았어요'),
    ('김수민','임플란트 환자 설명 잘해서 바로 결정 났어요'),
    ('이지영','보험 청구 실수 없이 정리 최고입니다'),
    ('김수민','멸균 체크리스트 빠짐없이 매일 감사'),
    ('이지영','친절한 응대가 우리 병원 브랜드'),
    ('김수민','교정 체어사이드 속도 빨라짐, 인정'),
    ('이지영','고령 환자 길 안내까지 최고'),
    ('김수민','학회 스터디 발표 준비 너무 잘했어요'),
]

pi = 0
for i,(t,c,pin) in enumerate(NOTICES):
    d = today - timedelta(days=random.randint(1, 25))
    sql.append(f"""INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,is_pinned,like_count,view_count,created_at) VALUES (
'{uid('po',pi)}','{HID}','notice','{ADMIN}','{t}','{c}',{pin},{random.randint(0,12)},{random.randint(10,80)},'{iso(d)} 09:30:00');"""); pi+=1
for i,c in enumerate(FREE):
    d = today - timedelta(days=random.randint(0, 15))
    u = random.choice(USERS)
    sql.append(f"""INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,like_count,view_count,created_at) VALUES (
'{uid('po',pi)}','{HID}','free','{u}','{c[:30]}','{c}',{random.randint(0,6)},{random.randint(5,40)},'{iso(d)} 14:00:00');"""); pi+=1
for i,(tgt,c) in enumerate(PRAISE):
    d = today - timedelta(days=random.randint(0, 30))
    u = random.choice([ADMIN, DESK])
    sql.append(f"""INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,target_name,like_count,view_count,created_at) VALUES (
'{uid('po',pi)}','{HID}','praise','{u}','{tgt} 칭찬합니다','{c}','{tgt}',{random.randint(3,15)},{random.randint(8,50)},'{iso(d)} 18:00:00');"""); pi+=1

# ─── 6. 체크리스트 8개 ─────────────────────────────────
CL = [
    ('아침 오픈 체크리스트','daily_open',['전체 기기 전원 ON','에어컨/환기 체크','진료실 청소 상태 확인','데스크 POS/프린터 확인','오늘 환자 스케줄 확인','멸균기 가동 확인','수도/전기 이상 여부','음악/조명 세팅']),
    ('저녁 마감 체크리스트','daily_close',['기구 멸균 완료','진료실 청소 완료','세면대/체어 소독','POS 마감','금고 확인','쓰레기 배출','에어컨/전원 OFF','문단속']),
    ('주간 점검 (금요일)','weekly',['에어컨 필터 청소','X-ray 기기 캘리브레이션','멸균기 내부 청소','소모품 재고 확인','차트 백업 확인','직원 스케줄 조율']),
    ('감염관리 월례 점검','infection',['모든 진료실 멸균 상태','기구 보관 순서','손세정 시설 점검','고위험 오염구역 관리','의료폐기물 분리','방호복 재고','살균 용액 농도 체크']),
    ('신규 직원 온보딩','onboarding',['병원 투어','시스템 로그인 설정','유니폼 지급','감염관리 교육','1주 멘토 배정','1개월 피드백 미팅']),
    ('수술 전 준비 체크','custom',['환자 동의서 확인','CT/X-ray 준비','수술 기구 세트 멸균','약품 재고','응급키트 점검','어시스트 배정']),
    ('환자 응대 체크 (데스크)','custom',['밝은 인사','예약 확인','문진표 작성 안내','대기 시간 안내','결제/보험 확인','차팅 전달']),
    ('임플란트 상담 체크','custom',['CT 촬영 결과 확인','뼈 상태 설명','비용/보증 안내','대체치료 제안','사후관리 안내','동의서 수령']),
]
for i,(title,ct,items) in enumerate(CL):
    items_json = json.dumps([{'id':j,'text':t,'done':False} for j,t in enumerate(items)], ensure_ascii=False).replace("'","''")
    sql.append(f"""INSERT INTO checklists (id,hospital_id,title,checklist_type,items,created_at) VALUES (
'{uid('ck',i)}','{HID}','{title}','{ct}','{items_json}','{iso(today - timedelta(days=i*3))} 09:00:00');""")

# ─── 7. 케이스 (cases) 12건 ─────────────────────────────
CASES = [
    ('case-imp','상악 구치부 임플란트 2본','45세 남성, 어금니 결손 2개 임플란트 식립','45','male','3개월'),
    ('case-imp','하악 전체 임플란트 4본 All-on-4','60대 남성, 틀니 사용 → 고정성 보철','62','male','6개월'),
    ('case-imp','단일 임플란트 즉시식립','30대 여성, 발치 후 즉시식립','35','female','2개월'),
    ('case-res','전치부 레진 수복','20대 여성, 앞니 미세 충치 심미 수복','25','female','1일'),
    ('case-res','다발성 레진 미백 효과','40대 여성, 변색 치아 6개 레진 수복','42','female','2주'),
    ('case-pro','올세라믹 크라운 2개','30대 여성, 앞니 크라운 교체','33','female','2주'),
    ('case-pro','라미네이트 6개','30대 여성, 웨딩 앞서 라미네이트','29','female','4주'),
    ('case-ort','성인 투명교정','20대 여성, 경미한 앞니 돌출 교정','26','female','14개월'),
    ('case-ort','청소년 금속교정','16세 남성, 부정교합 전체 교정','16','male','22개월'),
    ('case-end','재근관치료','50대 남성, 기존 신경치료 실패 후 재치료','52','male','4주'),
    ('case-per','치주수술 풀마우스','50대 여성, 말기 치주염 전체 수술','55','female','3개월'),
    ('case-sur','매복 사랑니 발치','20대 남성, 완전매복 사랑니 4개 발치','24','male','1주'),
]
for i,(cat,t,d,age,g,period) in enumerate(CASES):
    d_at = today - timedelta(days=random.randint(10, 200))
    sql.append(f"""INSERT INTO cases (id,hospital_id,category_id,title,description,patient_age,patient_gender,treatment_period,created_by,is_public,view_count,created_at) VALUES (
'{uid('cs',i)}','{HID}','{cat}','{t}','{d}','{age}','{g}','{period}','{ADMIN}',1,{random.randint(20,180)},'{iso(d_at)} 15:00:00');""")

# ─── 8. 상담 기록 (consult_records) 35건 ──────────────
for i in range(35):
    d = today - timedelta(days=random.randint(0, 60))
    planned = random.choice([500000, 1200000, 1800000, 3500000, 5500000, 8000000, 12000000])
    agreed = planned if random.random() > 0.35 else int(planned * 0.6)
    ptype = random.choice(['new','new','existing','return'])
    tc = random.choice(['implant','ortho','prosth','esthetic','general','endo','perio'])
    conf = random.choice(['동의','보류','거절','동의']) if random.random() > 0.1 else ''
    sql.append(f"""INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'{uid('cr',i)}','{HID}','{iso(d)}','CH{1000+i}','{NAMES[i%len(NAMES)]}','데모 원장','이지영',
{planned},{agreed},'{ptype}','{tc}','{conf}','{"예약" if agreed>0 and random.random()>0.3 else ""}',
'{"완료" if random.random()>0.5 else ""}','{"등록" if random.random()>0.4 else ""}',
'{random.choice(["상세 설명 후 동의","가격 부담으로 보류","2차 상담 예약","가족 상의 후 결정"])}',
'{ADMIN}','{random.choice(["naver","instagram","walk_in","referral"])}','이지영');""")

# ─── 9. 리콜 대상 (recall_tasks) 11명 ───────────────────
RECALL_REASONS = ['6개월 정기검진','스케일링 주기','임플란트 정기검진','교정 리테이너 확인','충치 치료 후 재방문']
for i in range(11):
    d = today + timedelta(days=random.randint(-5, 14))
    sd = today + timedelta(days=random.randint(0, 21))
    sql.append(f"""INSERT INTO recall_tasks (id,hospital_id,patient_id,patient_name,phone,chart_number,reason,last_visit_date,days_elapsed,treatment_area,channel,priority,status,scheduled_date,created_at) VALUES (
'{uid('rc',i)}','{HID}','pat-{i:03d}','{NAMES[i]}','010-{random.randint(1000,9999)}-{random.randint(1000,9999)}','CH{2000+i}',
'{random.choice(RECALL_REASONS)}','{iso(today - timedelta(days=random.randint(180,420)))}',{random.randint(180,420)},
'{random.choice(["구치부","전치부","상악","하악"])}','{random.choice(["call","kakao","sms"])}',{random.randint(1,5)},
'{random.choice(["pending","pending","pending","contacted"])}','{iso(sd)}','{iso(today - timedelta(days=i))} 10:00:00');""")

# ─── 10. 설문 3종 ─────────────────────────────────────────
SURV = [
    ('진료 후 만족도 설문','NPS + 친절도 + 대기시간 평가',[{"id":1,"type":"nps","question":"친구에게 우리 병원을 추천할 의향은?"},{"id":2,"type":"rating","question":"직원 친절도"},{"id":3,"type":"text","question":"개선 제안"}]),
    ('신환 온보딩 설문','첫 방문 후 인상 조사',[{"id":1,"type":"rating","question":"전반적 만족도"},{"id":2,"type":"choice","question":"방문 경로","options":["네이버","지인소개","인스타","기타"]}]),
    ('정기 NPS 설문','월간 발송',[{"id":1,"type":"nps","question":"추천 의향 0-10"},{"id":2,"type":"text","question":"이유"}]),
]
for i,(t,d,q) in enumerate(SURV):
    q_json = json.dumps(q, ensure_ascii=False).replace("'","''")
    sql.append(f"""INSERT INTO surveys (id,hospital_id,title,description,questions,is_active,auto_send,response_count,avg_nps,created_by,created_at) VALUES (
'{uid('sv',i)}','{HID}','{t}','{d}','{q_json}',1,{1 if i==0 else 0},{random.randint(8,35)},{random.uniform(55,85):.1f},'{ADMIN}','{iso(today - timedelta(days=30+i*10))} 10:00:00');""")

# ─── 11. 수가표 (fee_items) 18건 — fee_categories.id = '91512db3...' ──
FEE_CAT_ID = None  # 쿼리로 가져와야 하지만 단일행이라 모든 항목에 placeholder
FEE_ITEMS = [
    ('임플란트 (오스템)',1650000,1450000,'개',120,'10년 보증 포함'),
    ('임플란트 (스트라우만)',2200000,2000000,'개',120,'20년 보증 포함'),
    ('자연치 신경치료 (단근관)',80000,70000,'개',30,'건강보험 적용 가능'),
    ('자연치 신경치료 (다근관)',180000,160000,'개',60,'건강보험 적용'),
    ('골드 크라운',550000,500000,'개',60,''),
    ('올세라믹 크라운',650000,600000,'개',60,''),
    ('지르코니아 크라운',750000,700000,'개',60,''),
    ('라미네이트 (1본)',800000,750000,'개',90,''),
    ('치아 미백 (병원)',450000,400000,'회',60,'1회 30분'),
    ('스켈링',60000,50000,'회',30,'보험 적용'),
    ('잇몸치료 (풀마우스)',300000,280000,'회',90,''),
    ('교정 (투명 풀세트)',5500000,5000000,'세트',720,'유지장치 포함'),
    ('교정 (금속 풀세트)',4200000,3800000,'세트',720,'유지장치 포함'),
    ('단순 발치',30000,25000,'개',20,'보험 적용'),
    ('매복 사랑니 발치',180000,150000,'개',60,''),
    ('임플란트 제거',300000,280000,'개',60,''),
    ('뼈이식 (자가골)',800000,750000,'회',120,''),
    ('CT 촬영',80000,70000,'회',15,''),
]
# fee_categories id 조회용 SQL
sql.append("-- fee items below assume fee_categories row exists (id=91512db3-...)")
sql.append(f"DELETE FROM fee_items WHERE hospital_id='{HID}';")
# 실제 category id를 변수로
FC_ID = '91512db3'  # prefix match만 보인 상황. 아래에서 LIKE 조회
for i,(n,base,disc,unit,dur,desc) in enumerate(FEE_ITEMS):
    sql.append(f"""INSERT INTO fee_items (id,hospital_id,category_id,name,base_price,discount_price,unit,duration_min,description,is_active,sort_order,created_at)
SELECT '{uid('fi',i)}','{HID}',fc.id,'{n}',{base},{disc},'{unit}',{dur},'{desc}',1,{i},datetime('now')
FROM fee_categories fc WHERE fc.hospital_id='{HID}' LIMIT 1;""")

# ─── 12. 칸반 보드 + 카드 (구매/수선) ───────────────────
pb_id = uid('pb', 1)
rb_id = uid('pb', 2)
sql.append(f"INSERT INTO kanban_boards (id,hospital_id,board_type,title) VALUES ('{pb_id}','{HID}','purchase','물품 구매 요청'),('{rb_id}','{HID}','repair','수리/정비');")

KANBAN_PURCHASE = [
    ('일회용 마스크 5박스','KF94 중형, 박스당 50매','approved','normal',45000,90000),
    ('멸균 백 리필','오토클레이브용 M/L 각 100매','in_progress','high',120000,None),
    ('진료실 LED 전구 교체','3번 체어 메인 라이트','requested','urgent',80000,None),
    ('보철 기구 세트 추가 구매','IIHS 임플란트 키트','requested','normal',1800000,None),
    ('구강카메라 교체','MyRay 카메라 배터리 이슈','approved','high',950000,None),
    ('컴프레서 오일 교환','연 1회 정기 교환','completed','normal',150000,145000),
    ('에어컨 필터 교환','2,3층 진료실 총 4대','in_progress','normal',60000,None),
    ('데스크 프린터 토너','HP 오리지널 2개','completed','low',85000,82000),
    ('X-ray 센서 보호 필름','1년치 소모품','requested','normal',250000,None),
    ('기구 세척 브러시','스켈링 전용 소형','approved','low',40000,None),
    ('환자 가운 추가 제작','30벌 신규 로고 적용','requested','normal',800000,None),
    ('세탁기 수리','스핀 이상 서비스 요청','rejected','high',200000,None),
]
for i,(t,d,st,pr,ec,ac) in enumerate(KANBAN_PURCHASE):
    ac_sql = str(ac) if ac is not None else 'NULL'
    sql.append(f"""INSERT INTO kanban_cards (id,board_id,hospital_id,title,description,status,priority,department,requested_by,estimated_cost,actual_cost,created_at) VALUES (
'{uid('kc',i)}','{pb_id}','{HID}','{t}','{d}','{st}','{pr}','general','{random.choice(USERS)}',{ec},{ac_sql},'{iso(today - timedelta(days=random.randint(0,25)))} 11:00:00');""")

# ─── 끝 ──────────────────────────────────────────────────

with open('tools/seed-boards.sql','w',encoding='utf-8') as f:
    f.write('\n'.join(sql))

print(f"✅ {len(sql)} SQL statements generated → tools/seed-boards.sql")
