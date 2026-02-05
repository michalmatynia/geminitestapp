#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$HOME/Desktop/NPM/2026/Gemini new Pull/geminitestapp"
cd "$PROJECT_DIR"

# Runner (can be: gemini  OR  "npx -y @google/gemini-cli")
GEMINI_CMD="${GEMINI_CMD:-gemini}"

APPROVAL_MODE="${APPROVAL_MODE:-yolo}"
MAX_RETRIES="${MAX_RETRIES:-50}"
SLEEP_SECONDS="${SLEEP_SECONDS:-10}"
ATTEMPT_TIMEOUT_SECONDS="${ATTEMPT_TIMEOUT_SECONDS:-1800}" # 30 min per attempt

# Start with Gemini 3, fallback down
MODEL_CHAIN="${MODEL_CHAIN:-gemini-3-pro-preview,gemini-3-flash-preview,gemini-2.5-pro,gemini-2.5-flash,gemini-2.5-flash-lite}"

# Auto-switch when capacity is truly exhausted
CAPACITY_MODE="${CAPACITY_MODE:-switch}" # switch | wait
CAPACITY_RESET_THRESHOLD_SECONDS="${CAPACITY_RESET_THRESHOLD_SECONDS:-120}" # if reset > 120s, switch model

# Terminal UX
FILTER_NOISE="${FILTER_NOISE:-1}"        # 1 hides spammy lines on-screen (still logged)
HEARTBEAT_SECONDS="${HEARTBEAT_SECONDS:-15}"

# Logging
LOG_DIR="${LOG_DIR:-$PROJECT_DIR/.gemini-logs}"
mkdir -p "$LOG_DIR"

# Prompt can be args or stdin
if [[ $# -gt 0 ]]; then
  PROMPT_USER="$*"
else
  PROMPT_USER="$(cat)"
fi

# Ask Gemini to show explicit progress lines
PROMPT_PREFIX="${PROMPT_PREFIX:-1}"
if [[ "$PROMPT_PREFIX" == "1" ]]; then
  PROMPT=$'You are an automated coding agent.\n'\
$'Always show progress in plain text.\n'\
$'- Start with: "PLAN: ..." (3-6 bullets)\n'\
$'- Before each action/tool, print: "PROGRESS: <what you are doing now>"\n'\
$'- After each action/tool, print: "RESULT: <short outcome>"\n\n'\
$'TASK:\n'"$PROMPT_USER"
else
  PROMPT="$PROMPT_USER"
fi

# Create a run id + job name for logs
RUN_TS="$(date +%Y%m%d-%H%M%S)"
JOB_NAME="${JOB_NAME:-$(echo "$PROMPT_USER" | tr -cd '[:alnum:] _-' | tr ' ' '_' | cut -c1-40)}"
RUN_ID="${RUN_TS}_${JOB_NAME:-job}"

RUN_LOG="$LOG_DIR/${RUN_ID}.log"
RUN_SUMMARY="$LOG_DIR/${RUN_ID}.summary.json"
ATTEMPT_DIR="$LOG_DIR/${RUN_ID}.attempts"
mkdir -p "$ATTEMPT_DIR"

# Model chain array
IFS=',' read -r -a MODELS <<< "$MODEL_CHAIN"
MODEL_INDEX="${MODEL_INDEX:-0}"

current_model() {
  if [[ ${#MODELS[@]} -gt 0 ]]; then
    echo "${MODELS[$MODEL_INDEX]}"
  else
    echo ""
  fi
}

note() { echo "$*" | tee -a "$RUN_LOG"; }

mktemp_compat() { mktemp "/tmp/gemini_out.XXXXXX"; }

# exit codes:
#  76 capacity exhausted (hard)
#  77 high demand
#  78 auth restart requested
# 124 timeout
run_and_stream() {
  local attempt_out="$1"
  local model="$2"

  local model_flag=""
  if [[ -n "$model" ]]; then
    model_flag="--model $(printf '%q' "$model")"
  fi

  local cmd="$GEMINI_CMD $model_flag -p $(printf '%q' "$PROMPT") --output-format json --approval-mode $(printf '%q' "$APPROVAL_MODE")"

  python3 - <<'PY' "$cmd" "$attempt_out" "$ATTEMPT_TIMEOUT_SECONDS" "$HEARTBEAT_SECONDS" "$FILTER_NOISE" "$CAPACITY_RESET_THRESHOLD_SECONDS" "$model"
import sys, time, subprocess, re, selectors, json

cmd, outpath = sys.argv[1], sys.argv[2]
timeout_s = int(sys.argv[3])
heartbeat_s = int(sys.argv[4])
filter_noise = int(sys.argv[5])
cap_thresh_s = int(sys.argv[6])
model = sys.argv[7]

start = time.time()
last_print = time.time()

p = subprocess.Popen(
    ["bash", "-lc", cmd],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1
)

sel = selectors.DefaultSelector()
sel.register(p.stdout, selectors.EVENT_READ)

high_demand = False
needs_restart = False
capacity_hard = False

# Noise we hide from terminal (still written to log file)
noise_patterns = [
  "dep0040", "punycode", "deprecationwarning",
  "importprocessor] failed to import auth/core",
  "yolo mode is enabled", "hook registry initialized",
  "loaded cached credentials"
]

toolish_patterns = [
  "error executing tool", "running", "run_shell_command", "read_file", "replace", "write_file", "edit"
]

def parse_reset_seconds(line_lower: str) -> int | None:
  # matches: "reset after 23h50m32s" or "reset after 5s" or "reset after 2m"
  m = re.search(r"reset after\s+([0-9hms]+)", line_lower)
  if not m:
    return None
  s = m.group(1)
  h = re.search(r"(\d+)h", s)
  mi = re.search(r"(\d+)m", s)
  se = re.search(r"(\d+)s", s)
  total = 0
  if h: total += int(h.group(1)) * 3600
  if mi: total += int(mi.group(1)) * 60
  if se: total += int(se.group(1))
  return total

def should_hide(line_lower: str) -> bool:
  return any(p in line_lower for p in noise_patterns)

with open(outpath, "w", encoding="utf-8", errors="replace") as f:
  while True:
    # Timeout guard
    if time.time() - start > timeout_s:
      try:
        p.terminate()
        time.sleep(0.5)
        p.kill()
      except Exception:
        pass
      sys.exit(124)

    events = sel.select(timeout=1)
    if not events:
      # Heartbeat if no output
      if time.time() - last_print >= heartbeat_s:
        msg = f"[gemini] ...still working (model={model}, elapsed={int(time.time()-start)}s)"
        print(msg, flush=True)
        f.write(msg + "\n")
        last_print = time.time()
      if p.poll() is not None:
        break
      continue

    line = p.stdout.readline()
    if line == "":
      if p.poll() is not None:
        break
      continue

    f.write(line)

    l = line.lower()

    # Detect high demand
    if "we are currently experiencing high demand" in l or "http 503" in l or '"code": 503' in l:
      high_demand = True

    # Detect auth restart
    if "needs to be restarted" in l or "press 'r' to restart" in l:
      needs_restart = True

    # Detect capacity exhaustion
    if ("exhausted your capacity on this model" in l) or ("resource_exhausted" in l) or ("code\": 429" in l) or ("http 429" in l):
      reset_s = parse_reset_seconds(l)
      # If reset time is long, treat as hard capacity -> switch model
      if reset_s is None or reset_s >= cap_thresh_s:
        capacity_hard = True

    # Output filtering + highlighting
    if filter_noise and should_hide(l):
      # keep it in file only
      pass
    else:
      prefix = ""
      if any(pat in l for pat in toolish_patterns):
        prefix = "[tool] "
      print(prefix + line, end="", flush=True)

    last_print = time.time()

rc = p.wait()

# Prefer “hard” signals over return code
if needs_restart:
  sys.exit(78)
if high_demand:
  sys.exit(77)
if capacity_hard:
  sys.exit(76)

sys.exit(rc)
PY
}

# Robust JSON extraction: strip ANSI/OSC and use raw_decode so trailing text doesn't break parsing
extract_last_json() {
  python3 - <<'PY'
import sys, re, json
s = sys.stdin.read()

# Strip ANSI CSI sequences and OSC sequences
s = re.sub(r'\x1b\[[0-9;?]*[ -/]*[@-~]', '', s)      # CSI
s = re.sub(r'\x1b\][^\x07]*\x07', '', s)             # OSC ... BEL
s = re.sub(r'\x1b\][^\x1b]*\x1b\\', '', s)           # OSC ... ST

dec = json.JSONDecoder()
starts = [i for i,ch in enumerate(s) if ch == '{']
for i in reversed(starts):
  chunk = s[i:].lstrip()
  try:
    obj, _ = dec.raw_decode(chunk)
    print(json.dumps(obj))
    sys.exit(0)
  except Exception:
    pass
print("__NOJSON__")
PY
}

START_EPOCH="$(date +%s)"
note "[run] id=$RUN_ID"
note "[run] models=$MODEL_CHAIN"
note "[run] log=$RUN_LOG"
note "[run] attempts_dir=$ATTEMPT_DIR"
note "[run] prompt=$PROMPT_USER"
note ""

for ((attempt=1; attempt<=MAX_RETRIES; attempt++)); do
  MODEL="$(current_model)"
  ATTEMPT_OUT="$ATTEMPT_DIR/attempt_${attempt}.log"

  note "[gemini] Attempt $attempt/$MAX_RETRIES (model: ${MODEL:-default})..."

  set +e
  run_and_stream "$ATTEMPT_OUT" "$MODEL"
  RC=$?
  set -e

  # Append attempt output to main run log
  {
    echo ""
    echo "==================== attempt $attempt (model: ${MODEL:-default}) rc=$RC ===================="
    cat "$ATTEMPT_OUT"
    echo "==================== end attempt $attempt ================================================"
    echo ""
  } >> "$RUN_LOG"

  OUT="$(cat "$ATTEMPT_OUT")"

  if [[ $RC -eq 78 ]]; then
    note "[gemini] Auth requested restart. Retrying immediately..."
    sleep 1
    continue
  fi

  if [[ $RC -eq 77 ]]; then
    note "[gemini] High demand detected. Sleeping ${SLEEP_SECONDS}s..."
    sleep "$SLEEP_SECONDS"
    continue
  fi

  if [[ $RC -eq 124 ]]; then
    note "[gemini] Attempt timed out after ${ATTEMPT_TIMEOUT_SECONDS}s. Retrying in ${SLEEP_SECONDS}s..."
    sleep "$SLEEP_SECONDS"
    continue
  fi

  if [[ $RC -eq 76 ]]; then
    note "[gemini] Capacity exhausted on model: $MODEL"

    if [[ "$CAPACITY_MODE" == "wait" ]]; then
      note "[gemini] Waiting ${SLEEP_SECONDS}s and retrying same model..."
      sleep "$SLEEP_SECONDS"
      continue
    fi

    # CAPACITY_MODE=switch (default)
    if (( MODEL_INDEX + 1 < ${#MODELS[@]} )); then
      MODEL_INDEX=$((MODEL_INDEX + 1))
      note "[gemini] Auto-switching to next model: $(current_model)"
      sleep 1
      continue
    else
      note "[gemini] No more models left. Sleeping ${SLEEP_SECONDS}s and retrying..."
      sleep "$SLEEP_SECONDS"
      continue
    fi
  fi

  J="$(printf "%s" "$OUT" | extract_last_json)"
  if [[ "$J" == "__NOJSON__" ]]; then
    note "[gemini] No JSON found in output (rc=$RC). See log: $RUN_LOG"
    exit 2
  fi

  END_EPOCH="$(date +%s)"
  DURATION="$((END_EPOCH - START_EPOCH))"

  python3 - <<'PY' "$J" "$RUN_SUMMARY" "$RUN_ID" "$MODEL" "$attempt" "$DURATION" "$RUN_LOG"
import json,sys
j=json.loads(sys.argv[1])
out_path=sys.argv[2]
meta={
  "run_id": sys.argv[3],
  "final_model": sys.argv[4],
  "attempt": int(sys.argv[5]),
  "duration_seconds": int(sys.argv[6]),
  "log_file": sys.argv[7],
  "session_id": j.get("session_id"),
  "error": j.get("error"),
  "response": j.get("response"),
  "stats": j.get("stats"),
}
with open(out_path,"w",encoding="utf-8") as f:
  json.dump(meta,f,indent=2)
PY

  python3 - <<'PY' "$J"
import json,sys
j=json.loads(sys.argv[1])
print((j.get("response") or "").rstrip())
PY

  note ""
  note "[run] done. summary=$RUN_SUMMARY"
  exit 0
done

note "[gemini] Max retries reached ($MAX_RETRIES). Exiting."
note "[run] done (failed). log=$RUN_LOG"
exit 1
