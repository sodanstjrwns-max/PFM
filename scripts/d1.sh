#!/usr/bin/env bash
# d1.sh — D1 조회/실행 래퍼 (대상 DB를 반드시 명시하게 강제)
#
# ═══ 왜 이 스크립트가 필요한가 ═══
# `wrangler d1 execute`는 --remote가 없으면 조용히 로컬 DB를 읽는다.
# 에러도 경고도 없다. 2026-07-25에 이것 때문에 실제 사고가 날 뻔했다:
#   프로덕션 병원 목록을 조회했다고 믿었는데 실제로는 샌드박스 로컬 DB였고,
#   "테스트 병원 43개"라는 존재하지 않는 삭제 대상을 산정했다.
#   (로컬과 원격 숫자가 완전히 동일하게 나온 게 이상해서 겨우 멈췄다.
#    실제 프로덕션은 병원 9개 / 환자 12,620명이었다.)
#
# ═══ 해결 ═══
# 대상(local|prod)을 첫 인자로 반드시 받는다. 생략하면 실행을 거부한다.
# 기본값을 두지 않는 것이 핵심 — "깜빡했을 때 안전한 쪽으로"가 아니라
# "깜빡하면 아예 안 돌아간다"로 만든다.
#
# 사용법:
#   ./scripts/d1.sh local --command="SELECT COUNT(*) FROM hospitals"
#   ./scripts/d1.sh prod  --command="SELECT COUNT(*) FROM hospitals"
#   ./scripts/d1.sh prod  --file=./migrations/0048_x.sql
set -euo pipefail

DB_NAME="pfm-production"
TARGET="${1:-}"

if [ -z "$TARGET" ]; then
  cat >&2 <<'USAGE'
❌ 대상 DB를 지정해야 합니다. (기본값 없음 — 의도적입니다)

  ./scripts/d1.sh local --command="SELECT ..."   # 로컬 개발 DB
  ./scripts/d1.sh prod  --command="SELECT ..."   # 프로덕션 DB (실데이터!)

이유: `wrangler d1 execute`는 --remote를 빼먹으면 경고 없이 로컬을 읽습니다.
      그 탓에 로컬 데이터를 프로덕션으로 오인한 사고가 있었습니다.
USAGE
  exit 1
fi
shift

case "$TARGET" in
  local)
    exec npx wrangler d1 execute "$DB_NAME" --local "$@"
    ;;
  prod|remote|production)
    echo "⚠️  대상: 프로덕션 DB ($DB_NAME) — 실데이터입니다" >&2
    exec npx wrangler d1 execute "$DB_NAME" --remote "$@"
    ;;
  *)
    echo "❌ 알 수 없는 대상: '$TARGET' (local 또는 prod만 허용)" >&2
    exit 1
    ;;
esac
