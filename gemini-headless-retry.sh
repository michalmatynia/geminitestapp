#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$HOME/Desktop/NPM/2026/Gemini new Pull/geminitestapp"
cd "$PROJECT_DIR"

GEMINI_CMD="${GEMINI_CMD:-gemini}"                 # can be: gemini OR "npx -y @google/gemini-cli"
APPROVAL_MODE="${APPROVAL_MODE:-yolo}"             # yolo / auto_edit / default
MAX_RETRIES="${MAX_RETRIES:-50}"
SLEEP_SECONDS="${SLEEP_SECONDS:-10}"
MODEL="${MODEL:-}"                                 # optional
ATTEMPT_TIMEOUT_SECONDS="${ATTEMPT_TIMEOUT_SECONDS:-600}"  # 10 minutes

if [[ $# -gt 0 ]]; then
  PROMPT="$*"
else
  PROMPT="$(cat)"
fi

mktemp_compat() {
  # macOS mktemp needs a template
  mktemp "/tmp/gemini_out.XXXXXX"
}

run_and_stream() {
  local outfile="$1"

  # Build the exact CLI command (non-interactive)
  local cmd
  if [[ -n "$MODEL" ]]; then
    cmd="$GEMINI_CMD -p $(printf '%q' "$PROMPT") --output-format json --approval-mode $(printf '%q' "$APPROVAL_MODE") -m $(printf '%q' "$MODEL")"
  else
    cmd="$GEMINI_CMD -p $(printf '%q' "$PROMPT") --output-format json --approval-mode $(printf '%q' "$APPROVAL_MODE")"
  fi

  # Run through login shell so nvm/npx works
  python3 - <<'PY' "$cmd" "$outfile" "$ATTEMPT_TIMEOUT_SECONDS"
import sys, time, subprocess, signal
cmd, outfile, timeout_s = sys.argv[1], sys.argv[2], int(sys.argv[3])

start = time.time()
p = subprocess.Popen(["bash","-lc",cmd], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)

high_demand = False
needs_restart = False
trust_prompt = False

with open(outfile, "w", encoding="utf-8", errors="replace") as f:
  for line in p.stdout:
    # stream to terminal
    print(line, end="")
    # save for parsing
    f.write(line)

    l = line.lower()
    if "we are currently experiencing high demand" in l:
      high_demand = True
    if "needs to be restarted" in l:
      needs_restart = True
    if "trusted folders" in l or "trust folder" in l:
      trust_prompt = True

    if time.time() - start > timeout_s:
      try:
        p.terminate()
        time.sleep(0.5)
        p.kill()
      except Exception:
        pass
      sys.exit(124)

rc = p.wait()

# Special exits that the bash wrapper can react to
if trust_prompt:
  sys.exit(79)
if needs_restart:
  sys.exit(78)
if high_demand:
  sys.exit(77)

sys.exit(rc)
PY
}

extract_last_json() {
  python3 - <<'PY'
import sys, json
s = sys.stdin.read()
starts = [i for i,ch in enumerate(s) if ch == '{']
for i in reversed(starts):
  chunk = s[i:].strip()
  try:
    obj = json.loads(chunk)
    print(json.dumps(obj))
    sys.exit(0)
  except Exception:
    pass
print("__NOJSON__")
PY
}

for ((i=1; i<=MAX_RETRIES; i++)); do
  echo "[gemini] Attempt $i/$MAX_RETRIES..."

  OUTFILE="$(mktemp_compat)"
  set +e
  run_and_stream "$OUTFILE"
  RC=$?
  set -e

  OUT="$(cat "$OUTFILE")"
  rm -f "$OUTFILE" || true

  if [[ $RC -eq 79 ]]; then
    echo
    echo "[gemini] Trusted Folders prompt detected."
    echo "Run: cd \"$PROJECT_DIR\" && gemini"
    echo "Then choose: Trust folder (or run /permissions)."
    exit 2
  fi

  if [[ $RC -eq 78 ]]; then
    echo
    echo "[gemini] CLI requested restart after auth. Retrying immediately..."
    sleep 1
    continue
  fi

  if [[ $RC -eq 77 ]]; then
    echo
    echo "[gemini] High demand detected. Sleeping ${SLEEP_SECONDS}s..."
    sleep "$SLEEP_SECONDS"
    continue
  fi

  if [[ $RC -eq 124 ]]; then
    echo
    echo "[gemini] Attempt timed out after ${ATTEMPT_TIMEOUT_SECONDS}s. Retrying in ${SLEEP_SECONDS}s..."
    sleep "$SLEEP_SECONDS"
    continue
  fi

  J="$(printf "%s" "$OUT" | extract_last_json)"
  if [[ "$J" == "__NOJSON__" ]]; then
    echo
    echo "[gemini] No JSON found in output (exit code $RC). Full output above."
    exit 2
  fi

  # Print the response field
  python3 - <<'PY' "$J"
import json,sys
j=json.loads(sys.argv[1])
print((j.get("response") or "").rstrip())
PY
  exit 0
done

echo "[gemini] Max retries reached ($MAX_RETRIES). Exiting."
exit 1
