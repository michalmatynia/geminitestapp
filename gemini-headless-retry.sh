#!/usr/bin/env bash
set -euo pipefail

PROMPT=${1:?Usage: ./gemini-headless-retry.sh "prompt"}
MODEL="${MODEL:-gemini-2.5-pro}"
SLEEP_SEC="${SLEEP_SEC:-15}"
MAX_SLEEP="${MAX_SLEEP:-300}"

while true; do
  tmp="$(mktemp)"

  set +e
  gemini -p "$PROMPT" -m "$MODEL" \
    --approval-mode auto_edit \
    --yolo \
    --output-format stream-json \
    2>&1 | tee "$tmp"
  rc=${PIPESTATUS[0]}
  set -e

  if [[ $rc -eq 0 ]]; then
    rm -f "$tmp"
    exit 0
  fi

  if grep -q "We are currently experiencing high demand" "$tmp"; then
    rm -f "$tmp"
    echo "[gemini] capacity busy; sleeping ${SLEEP_SEC}s then retrying..." >&2
    sleep "$SLEEP_SEC"
    SLEEP_SEC=$(( SLEEP_SEC * 2 ))
    if [[ $SLEEP_SEC -gt $MAX_SLEEP ]]; then SLEEP_SEC=$MAX_SLEEP; fi
    continue
  fi

  echo "[gemini] failed with exit code $rc" >&2
  echo "----- last output -----" >&2
  cat "$tmp" >&2
  rm -f "$tmp"
  exit "$rc"
done
