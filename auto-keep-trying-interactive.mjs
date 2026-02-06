import pty from "node-pty";

const shell = process.env.SHELL || "/bin/zsh";

// Default chain: start from Gemini 3, then fall back
const MODELS = (process.env.MODEL_CHAIN || [
  "gemini-3-pro-preview",
  "gemini-3-flash-preview",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
].join(","))
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const KEEP_TRY_MAX = Number(process.env.KEEP_TRY_MAX ?? 3); // per model
const RESUME_LATEST = (process.env.RESUME_LATEST ?? "1") !== "0";

let modelIndex = 0;
let demandHits = 0;
let lastDemandTs = 0;
let switching = false;
let p = null;

function currentModel() {
  return MODELS[modelIndex % MODELS.length];
}

function spawnGemini() {
  const model = currentModel();
  demandHits = 0;
  switching = false;

  const resume = RESUME_LATEST ? " --resume latest" : "";
  const geminiCmd = `gemini --approval-mode yolo -m ${model}${resume}`;

  console.error(`\n[gemini] launching model: ${model}${RESUME_LATEST ? " (resume latest)" : ""}\n`);

  p = pty.spawn(shell, ["-lc", geminiCmd], {
    name: "xterm-256color",
    cols: process.stdout.columns ?? 120,
    rows: process.stdout.rows ?? 40,
    cwd: process.cwd(),
    env: process.env,
  });

  p.onData((data) => {
    process.stdout.write(data);

    if (data.includes("We are currently experiencing high demand")) {
      const now = Date.now();
      // debounce so we don't spam keys on repeated chunks
      if (now - lastDemandTs < 1500) return;
      lastDemandTs = now;

      demandHits += 1;

      if (demandHits <= KEEP_TRY_MAX) {
        // try keep-trying a few times on the current model
        p.write("1\r");
      } else {
        // switch model: choose "Stop" then restart with next model
        switching = true;
        console.error(`\n[gemini] capacity busy on ${currentModel()} — switching model...\n`);
        p.write("2\r");
      }
    }
  });

  p.onExit(({ exitCode, signal }) => {
    console.error(`\n[pty] exited: code=${exitCode} signal=${signal}\n`);

    // if we stopped due to capacity, rotate model and restart
    if (switching) {
      modelIndex += 1;
      spawnGemini();
      return;
    }

    // otherwise, exit normally
    try { if (process.stdin.isTTY) process.stdin.setRawMode(false); } catch {}
    process.stdin.pause();
    process.exit(exitCode ?? 0);
  });
}

// Forward your keyboard into the PTY (so Enter works)
process.stdin.setEncoding("utf8");
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();

process.stdin.on("data", (chunk) => {
  // Ctrl+C
  if (chunk === "\u0003") {
    if (p) p.kill("SIGINT");
    return;
  }
  if (p) p.write(chunk);
});

spawnGemini();
