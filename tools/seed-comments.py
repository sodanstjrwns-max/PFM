#!/usr/bin/env python3
"""Seed natural comments, likes, view_counts into posts for demo hospital."""
import subprocess
import random
import uuid
from datetime import datetime, timedelta

HOSPITAL_ID = 'af4542c2-e55b-41cf-8d5d-805f8294a3d3'
USERS = [
    ('515e829a-2a40-48f7-b49e-fef2cabfd23f', '데모 원장'),
    ('test-hyg-001', '김수민'),
    ('test-desk-001', '이지영'),
]

# 보드별 자연스러운 댓글 풀
COMMENTS_BY_BOARD = {
    'free': [
        '오 저도 같은 생각이었어요 ㅋㅋ', '이거 너무 공감됩니다 👍', '동의합니다',
        '헐 진짜요? 저는 몰랐네요', '좋은 정보 감사해요!', 'ㅋㅋㅋㅋ 개웃김',
        '저도 참여할게요~', '내일 얘기해봐요', '아 이거 중요한 건데',
        '점심 저도 같이 가요!', '데스크에 물어보고 올게요', '원장님 컨펌 받으셨어요?',
        '이번 주말에 하면 좋을 듯', '저 이거 한 번 해봤는데 괜찮았어요',
        '지난번에 말씀하신 그거죠?', '에어컨 필터는 제가 이번 주에 맡을게요',
        '🙌', '👏👏', '✨', '좋아요~',
        '공감 백 배', '아 맞다 그거 해야 했는데', '알려주셔서 감사합니다',
        '케이크 맛있겠다 🎂', '내일 보고 찾아뵐게요', '저도 궁금했어요',
    ],
    'praise': [
        '정말 멋지세요! 👏', '저도 이지영 선생님 덕분에 많이 배워요',
        '진심으로 존경합니다 💛', '항상 고생 많으세요!',
        '우리 팀에 계셔서 든든해요', '이런 분과 일할 수 있어서 영광',
        '덕분에 분위기가 늘 좋아요', '감사의 마음을 전합니다',
        '매번 먼저 챙겨주셔서 감동이에요', '👍👍👍',
        '저도 같은 경험했어요! 정말 센스 있으세요', '원장님도 자랑스러워 하실 것 같아요 😊',
        '우리 병원 진짜 복 받은 것 같아요', '오늘도 감사합니다!',
        '저는 늘 배우는 입장이에요 🙇', '이런 게 팀워크죠',
        '환자분들도 분명 느끼실 거예요', '다음에 커피 사드릴게요 ☕',
    ],
    'notice': [
        '확인했습니다', '네, 숙지했어요', '공유 감사합니다',
        '알겠습니다!', '참고하겠습니다', '읽었습니다 👌',
        '질문 있으면 데스크에 문의드리면 될까요?', '일정 반영할게요',
        '확인 완료', '공지 감사드립니다', '이해했습니다',
    ],
}

LIKERS = [u[0] for u in USERS]  # 좋아요 찍을 수 있는 후보들


def run_sql(sql):
    """Execute a batch of SQL via wrangler."""
    # Write to temp file (SQL command can be long)
    with open('/tmp/_seed.sql', 'w') as f:
        f.write(sql)
    r = subprocess.run(
        ['npx', 'wrangler', 'd1', 'execute', 'pfm-production', '--local', '--file=/tmp/_seed.sql'],
        cwd='/home/user/webapp',
        capture_output=True, text=True, timeout=60
    )
    return r.returncode, r.stdout[-200:], r.stderr[-200:]


def fetch_posts():
    """Get all post IDs for the demo hospital."""
    r = subprocess.run(
        ['npx', 'wrangler', 'd1', 'execute', 'pfm-production', '--local',
         '--command', f"SELECT id, board_type, created_at FROM posts WHERE hospital_id='{HOSPITAL_ID}'",
         '--json'],
        cwd='/home/user/webapp', capture_output=True, text=True, timeout=30
    )
    import json as _json
    out = r.stdout.strip()
    # wrangler --json returns array with meta; find results
    # Extract the JSON array of results - simpler regex approach
    import re
    # parse the whole output as JSON
    try:
        data = _json.loads(out)
        # wrangler returns [{...meta..., "results": [...]}]
        if isinstance(data, list) and data and 'results' in data[0]:
            return data[0]['results']
        if isinstance(data, dict) and 'results' in data:
            return data['results']
    except Exception as e:
        print(f"parse fail: {e}")
        print(out[:500])
    return []


def main():
    posts = fetch_posts()
    print(f"✓ Fetched {len(posts)} posts")
    if not posts:
        print("No posts, abort"); return

    sql_parts = []

    for p in posts:
        post_id = p['id']
        board = p['board_type']
        base_date = p['created_at']
        comment_pool = COMMENTS_BY_BOARD.get(board, COMMENTS_BY_BOARD['free'])

        # 1) 댓글 수: 자유/칭찬 1~5개, 공지 0~2개 (핀된 공지에 질문 1개 정도)
        n_comments = random.choices(
            [0, 1, 2, 3, 4, 5],
            weights=[1, 3, 4, 3, 2, 1] if board != 'notice' else [3, 4, 2, 1, 0, 0]
        )[0]

        for i in range(n_comments):
            cid = 'cm-' + uuid.uuid4().hex[:16]
            author_id, _ = random.choice(USERS)
            content = random.choice(comment_pool).replace("'", "''")
            # 댓글 시각: post 생성 후 10분 ~ 3일 후
            offset_min = random.randint(10, 60 * 24 * 3)
            sql_parts.append(
                f"INSERT INTO comments (id, post_id, author_id, content, created_at, hospital_id) "
                f"VALUES ('{cid}', '{post_id}', '{author_id}', '{content}', "
                f"datetime('{base_date}', '+{offset_min} minutes'), '{HOSPITAL_ID}');"
            )

        # 2) 좋아요: 0~3개 (3명 중에서 중복 없이)
        n_likes = random.choices([0, 1, 2, 3], weights=[2, 4, 3, 2])[0]
        likers = random.sample(LIKERS, min(n_likes, len(LIKERS)))
        for uid in likers:
            lid = 'lk-' + uuid.uuid4().hex[:16]
            sql_parts.append(
                f"INSERT OR IGNORE INTO post_likes (id, post_id, user_id, created_at, hospital_id) "
                f"VALUES ('{lid}', '{post_id}', '{uid}', CURRENT_TIMESTAMP, '{HOSPITAL_ID}');"
            )

        # posts.like_count 업데이트
        sql_parts.append(
            f"UPDATE posts SET like_count={len(likers)}, "
            f"view_count={random.randint(5, 80)} "
            f"WHERE id='{post_id}';"
        )

    print(f"✓ Generated {len(sql_parts)} SQL statements")

    # 청크로 나눠 실행 (한 번에 너무 많으면 느림)
    CHUNK = 80
    total_ok = 0
    for i in range(0, len(sql_parts), CHUNK):
        chunk = '\n'.join(sql_parts[i:i+CHUNK])
        code, stdout, stderr = run_sql(chunk)
        if code == 0:
            total_ok += min(CHUNK, len(sql_parts) - i)
            print(f"  chunk {i//CHUNK + 1}: ✓ ({min(CHUNK, len(sql_parts)-i)} stmts)")
        else:
            print(f"  chunk {i//CHUNK + 1}: ✗ {stderr}")
            break

    print(f"\n✅ Done: {total_ok}/{len(sql_parts)} SQL statements executed")


if __name__ == '__main__':
    random.seed(42)  # 재현성
    main()
