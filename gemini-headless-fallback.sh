#!/usr/bin/env bash
set -euo pipefail

PROMPT=${1:?Usage: ./gemini-headless-fallback.sh "prompt"}

MODEL_CHAIN="${MODEL_CHAIN:-gemini-3-pro-preview,gemini-3-flash-preview,gemini-2.5-pro,gemini-2.5-flash,gemini-2.5-flash-lite}"
MAX_RETRIES_PER_MODEL="${MAX_RETRIES_PER_MODEL:-3}"
SLEEP_SEC="${SLEEP_SEC:-15}"
MAX_SLEEP="${MAX_SLEEP:-300}"

is_capacity_error() {
  # Match the interactive text + a few common quota/capacity phrases
  grep -Eqi \
    'We are currently experiencing high demand|RESOURCE_EXHAUSTED|Too Many Requests|quota|rate limit|429' \
    "$1"
}

IFS=',' read -r -a MODELS <<< "$MODEL_CHAIN"

for model in "${MODELS[@]}"; do
  model="$(echo "$model" | xargs)"
  [[ -z "$model" ]] && continue

  echo "[gemini] trying model: $model" >&2

  attempt=0
  sleep_now="$SLEEP_SEC"

  while true; do
    tmp="$(mktemp)"
    set +e
    gemini -p "$PROMPT" -m "$model" \
      --approval-mode yolo \
      --output-format stream-json \
      2>&1 | tee "$tmp"
    rc=${PIPESTATUS[0]}
    set -e

    if [[ $rc -eq 0 ]]; then
      rm -f "$tmp"
      exit 0
    fi

    if is_capacity_error "$tmp"; then
      attempt=$((attempt + 1))
      rm -f "$tmp"

      if [[ $attempt -le $MAX_RETRIES_PER_MODEL ]]; then
        echo "[gemini] capacity busy on $model; retry $attempt/$MAX_RETRIES_PER_MODEL in ${sleep_now}s..." >&2
        sleep "$sleep_now"
        sleep_now=$(( sleep_now * 2 ))
        if [[ $sleep_now -gt $MAX_SLEEP ]]; then sleep_now="$MAX_SLEEP"; fi
        continue
      else
        echo "[gemini] giving up on $model after $MAX_RETRIES_PER_MODEL retries; switching model..." >&2
        break
      fi
    fi

    echo "[gemini] non-capacity failure on $model (exit $rc); switching model..." >&2
    echo "----- last output -----" >&2
    cat "$tmp" >&2
    rm -f "$tmp"
    break
  done
done

echo "[gemini] all models failed in chain: $MODEL_CHAIN" >&2
exit 2
