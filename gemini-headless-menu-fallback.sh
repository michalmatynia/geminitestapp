#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Headless Gemini Runner (Next.js) — Menu Prompts + Model Fallback
# - cd into your project
# - choose prompt via a/b/c... (or custom)
# - headless (-p) + --approval-mode yolo
# - model fallback starting from Gemini 3
# - retries per model with exponential backoff
# - git diff summary at end
# ============================================================

# -----------------------------
# Config (override via env vars)
# -----------------------------
PROJECT_DIR="${PROJECT_DIR:-$HOME/Desktop/NPM/2026/Gemini new Pull/geminitestapp}"

MODEL_CHAIN="${MODEL_CHAIN:-gemini-3-pro-preview,gemini-3-flash-preview,gemini-2.5-flash}"
MAX_RETRIES_PER_MODEL="${MAX_RETRIES_PER_MODEL:-5}"

SLEEP_SEC="${SLEEP_SEC:-15}"
MAX_SLEEP="${MAX_SLEEP:-300}"

OUTPUT_FORMAT="${OUTPUT_FORMAT:-stream-json}"   # text|json|stream-json
APPROVAL_MODE="${APPROVAL_MODE:-yolo}"          # yolo recommended

# Reduce repo scanning to prevent context overflow
INCLUDE_DIRS_RAW="${INCLUDE_DIRS:-src,app,components,lib,tests}"

# Lock to prevent overlapping runs
LOCK_DIR_NAME="${LOCK_DIR_NAME:-.gemini_headless_lock}"

# If 1, require clean git working tree (safer)
REQUIRE_CLEAN_GIT="${REQUIRE_CLEAN_GIT:-0}"

# -----------------------------
# Prompt presets (a-j)
# -----------------------------
keys=(a b c d e f g h i j)
descs=(
  "run npx eslint and fix issues one-by-one"
  "run npx eslint and fix from back of list (avoid overlap)"
  "run eslint and fix issues one-by-one"
  "run eslint and fix from back of list (avoid overlap)"
  "run npm build and fix issues one-by-one"
  "run npm tests and fix issues"
  "develop test coverage for feature"
  "consolidate UI into unified components"
  "consolidate Types into unified components"
  "connect risky routes to centralized error logging"
)
prompts=(
  "run npx eslint and address all the issues one by one"
  "run npx eslint and address all the issues one by one from the back of the list not to overlap with other AIs"
  "run eslint and address all the issues one by one"
  "run eslint and address all the issues one by one from the back of the list not to overlap with other AIs"
  "run npm build and address the issues one by one"
  "run npm tests and address issues"
  "develop test coverage for feature"
  "consolidate UI into unified components"
  "consolidate Types into unified components"
  "find risky routes and areas of potential error and connect them to a centralised error logging and handling system"
)

CHOSEN_KEY=""
CHOSEN_DESC=""
CHOSEN_PROMPT=""

have_cmd() { command -v "$1" >/dev/null 2>&1; }

print_menu() {
  echo
  echo "Choose a prompt:"
  echo "--------------------------------------------------------------------------------"
  for i in "${!keys[@]}"; do
    printf "  %s) %s\n" "${keys[$i]}" "${descs[$i]}"
    printf "     %s\n" "${prompts[$i]}"
  done
  echo "  x) custom prompt"
  echo "--------------------------------------------------------------------------------"
  echo "Usage:"
  echo "  ./gemini-headless-menu-fallback.sh          # show menu, then run selection"
  echo "  ./gemini-headless-menu-fallback.sh a        # run selection a (prints what it is)"
  echo "  ./gemini-headless-menu-fallback.sh --list   # show menu and exit"
  echo
}

pick_prompt() {
  local choice="${1:-}"

  if [[ -z "$choice" ]]; then
    print_menu
    read -r -p "Selection [a-j/x]: " choice
  fi

  if [[ "$choice" == "x" ]]; then
    read -r -p "Enter custom prompt: " CHOSEN_PROMPT
    CHOSEN_KEY="x"
    CHOSEN_DESC="custom prompt"
    return 0
  fi

  for i in "${!keys[@]}"; do
    if [[ "${keys[$i]}" == "$choice" ]]; then
      CHOSEN_KEY="${keys[$i]}"
      CHOSEN_DESC="${descs[$i]}"
      CHOSEN_PROMPT="${prompts[$i]}"
      return 0
    fi
  done

  echo "Invalid selection: $choice" >&2
  exit 2
}

# Detect capacity / quota / busy signals in output
is_capacity_error() {
  grep -Eqi \
    'We are currently experiencing high demand|RESOURCE_EXHAUSTED|Too Many Requests|rate limit|quota|429|temporarily unavailable|overloaded' \
    "$1"
}

# Build include dirs: only keep dirs that exist, comma-separated
build_include_dirs() {
  local raw="$1"
  local out=()
  IFS=',' read -r -a parts <<< "$raw"
  for p in "${parts[@]}"; do
    p="$(echo "$p" | xargs)"
    [[ -z "$p" ]] && continue
    if [[ -d "$p" ]]; then
      out+=("$p")
    fi
  done
  (IFS=','; echo "${out[*]}")
}

lock_acquire() {
  local lock_path="$LOCK_DIR_NAME"
  if mkdir "$lock_path" 2>/dev/null; then
    echo "$$" > "$lock_path/pid"
    trap 'rm -rf "$lock_path" >/dev/null 2>&1 || true' EXIT INT TERM
    return 0
  fi

  echo "[lock] Another run seems active (lock: $lock_path)." >&2
  echo "       If you're sure it's stale, remove it:" >&2
  echo "       rm -rf \"$PROJECT_DIR/$lock_path\"" >&2
  exit 3
}

git_require_clean() {
  if [[ "$REQUIRE_CLEAN_GIT" != "1" ]]; then return 0; fi
  if have_cmd git && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    if [[ -n "$(git status --porcelain)" ]]; then
      echo "[git] Working tree is not clean. Commit/stash first or set REQUIRE_CLEAN_GIT=0." >&2
      exit 4
    fi
  fi
}

print_summary() {
  echo
  echo "==================== SUMMARY ===================="
  if have_cmd git && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo
    echo "[git] status:"
    git status -sb || true

    echo
    echo "[git] changed files:"
    git diff --name-only || true

    echo
    echo "[git] diff stat:"
    git diff --stat || true
  else
    echo "[note] Not a git repo (or git not installed). Can't show diff summary."
  fi
  echo "================================================="
  echo
}

run_gemini_with_model() {
  local model="$1"
  local prompt="$2"
  local include_dirs="$3"

  local attempt=0
  local sleep_now="$SLEEP_SEC"

  while true; do
    attempt=$((attempt + 1))
    local tmp
    tmp="$(mktemp)"

    echo "[gemini] model=$model attempt=$attempt/$MAX_RETRIES_PER_MODEL" >&2

    set +e
    if [[ -n "$include_dirs" ]]; then
      gemini -p "$prompt" -m "$model" \
        --approval-mode "$APPROVAL_MODE" \
        --output-format "$OUTPUT_FORMAT" \
        --include-directories "$include_dirs" \
        2>&1 | tee "$tmp"
    else
      gemini -p "$prompt" -m "$model" \
        --approval-mode "$APPROVAL_MODE" \
        --output-format "$OUTPUT_FORMAT" \
        2>&1 | tee "$tmp"
    fi
    rc=${PIPESTATUS[0]}
    set -e

    if [[ $rc -eq 0 ]]; then
      rm -f "$tmp"
      return 0
    fi

    if is_capacity_error "$tmp"; then
      rm -f "$tmp"
      if [[ $attempt -lt $MAX_RETRIES_PER_MODEL ]]; then
        echo "[gemini] capacity busy on $model; sleeping ${sleep_now}s then retry..." >&2
        sleep "$sleep_now"
        sleep_now=$((sleep_now * 2))
        if [[ $sleep_now -gt $MAX_SLEEP ]]; then sleep_now="$MAX_SLEEP"; fi
        continue
      else
        echo "[gemini] capacity busy on $model; max retries reached, switching model..." >&2
        return 10
      fi
    fi

    echo "[gemini] non-capacity failure on $model (exit $rc); switching model..." >&2
    echo "----- last output -----" >&2
    cat "$tmp" >&2 || true
    rm -f "$tmp"
    return 11
  done
}

main() {
  local selection="${1:-}"

  if [[ "$selection" == "--list" || "$selection" == "-l" ]]; then
    print_menu
    exit 0
  fi

  cd "$PROJECT_DIR"

  lock_acquire

  if ! have_cmd gemini; then
    echo "[error] gemini CLI not found in PATH." >&2
    echo "Install: npm i -g @google/gemini-cli" >&2
    exit 5
  fi

  git_require_clean

  pick_prompt "$selection"
  local prompt="$CHOSEN_PROMPT"

  echo
  echo "[run] project: $PROJECT_DIR"
  echo "[run] models:  $MODEL_CHAIN"
  echo "[run] retries: $MAX_RETRIES_PER_MODEL per model"
  echo "[choice] ${CHOSEN_KEY}) ${CHOSEN_DESC}"
  echo "[prompt]  ${CHOSEN_PROMPT}"
  echo

  local include_dirs
  include_dirs="$(build_include_dirs "$INCLUDE_DIRS_RAW")"
  if [[ -n "$include_dirs" ]]; then
    echo "[run] include-dirs: $include_dirs"
  else
    echo "[run] include-dirs: (none found; using default workspace)"
  fi
  echo

  IFS=',' read -r -a MODELS <<< "$MODEL_CHAIN"
  local succeeded="0"

  for m in "${MODELS[@]}"; do
    m="$(echo "$m" | xargs)"
    [[ -z "$m" ]] && continue

    echo "[gemini] trying model: $m" >&2

    if run_gemini_with_model "$m" "$prompt" "$include_dirs"; then
      echo "[gemini] success on model: $m" >&2
      succeeded="1"
      break
    else
      code=$?
      if [[ "$code" == "10" || "$code" == "11" ]]; then
        continue
      fi
      exit "$code"
    fi
  done

  if [[ "$succeeded" != "1" ]]; then
    echo "[gemini] all models failed in chain: $MODEL_CHAIN" >&2
    exit 2
  fi

  print_summary
}

main "$@"
