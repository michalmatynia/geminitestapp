// auto-keep-trying-interactive-preview.mjs
// Runs Gemini CLI (preview) through your FULL-HOME isolated wrapper `gemini-preview-iso`
// - Model failover on "high demand"
// - Safe resume: tries --resume latest, but auto-falls-back if no session exists (exit code 42)
// - Auto-restart after OAuth success prompt ("Press 'r' to restart")

import ptyPkg from "node-pty";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const { spawn } = ptyPkg;

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
  .map((s) => s.trim())
  .filter(Boolean);

const KEEP_TRY_MAX = Number(process.env.KEEP_TRY_MAX ?? 3); // per model
const WANT_RESUME_LATEST = (process.env.RESUME_LATEST ?? "1") !== "0";

// Your full-HOME isolation wrapper (must be on PATH)
const GEMINI_WRAPPER = process.env.GEMINI_WRAPPER || "gemini-iso";

// Matches your wrapper: ISO_HOME="$REAL_HOME/.gemini-preview-home"
const ISO_HOME = process.env.GEMINI_ISO_HOME || path.join(os.homedir(), ".gemini-home");

let modelIndex = 0;
let demandHits = 0;
let lastDemandTs = 0;
let switching = false;
let p = null;

// resume behavior for current launch (auto-disabled if Gemini exits 42)
let resumeEnabledThisRun = WANT_RESUME_LATEST;

function currentModel() {
  return MODELS[modelIndex % MODELS.length];
}

// Best-effort check: if ISO_HOME is basically empty, don't try --resume latest
function isoHomeLooksInitialized() {
  try {
    const entries = fs.readdirSync(ISO_HOME, { withFileTypes: true }).map((d) => d.name);

    // fresh ISO_HOME usually has only Library/ (Keychains) after you set it up
    const nonTrivial = entries.filter((n) => n !== "Library");
    if (nonTrivial.length === 0) return false;

    // If any non-trivial directory exists and has content, assume resume can work
    for (const name of nonTrivial) {
      const pth = path.join(ISO_HOME, name);
      try {
        const st = fs.statSync(pth);
        if (st.isDirectory()) {
          const inner = fs.readdirSync(pth);
          if (inner.length > 0) return true;
        } else if (st.isFile() && st.size > 0) {
          return true;
        }
      } catch {}
    }

    // Non-trivial exists but seems empty; still try resume? safer: no
    return false;
  } catch {
    return false;
  }
}

function buildGeminiCmd(model) {
  const canResume = resumeEnabledThisRun && isoHomeLooksInitialized();
  const resume = canResume ? " --resume latest" : "";
  return `${GEMINI_WRAPPER} --approval-mode yolo -m ${model}${resume}`;
}

function spawnGemini() {
  const model = currentModel();
  demandHits = 0;
  switching = false;

  const geminiCmd = buildGeminiCmd(model);

  console.error(
    `\n[gemini - preview] launching model: ${model}` +
      `${geminiCmd.includes("--resume latest") ? " (resume latest)" : " (fresh)"}\n`
  );

  p = spawn(shell, ["-lc", geminiCmd], {
    name: "xterm-256color",
    cols: process.stdout.columns ?? 120,
    rows: process.stdout.rows ?? 40,
    cwd: process.cwd(),
    env: process.env,
  });

  p.onData((data) => {
    process.stdout.write(data);

    // Auto-restart after OAuth success message
    if (data.includes("Authentication succeeded") && data.includes("Press") && data.includes("'r'")) {
      // give the UI a moment to settle
      setTimeout(() => {
        try { p?.write("r"); } catch {}
      }, 250);
      return;
    }

    // Capacity handling: keep-trying or switch model
    if (data.includes("We are currently experiencing high demand")) {
      const now = Date.now();
      // debounce so we don't spam keys on repeated chunks
      if (now - lastDemandTs < 1500) return;
      lastDemandTs = now;

      demandHits += 1;

      if (demandHits <= KEEP_TRY_MAX) {
        // option "1" is usually "Keep trying"
        p.write("1\r");
      } else {
        // option "2" is usually "Stop" -> then we rotate models
        switching = true;
        console.error(`\n[gemini] capacity busy on ${currentModel()} — switching model...\n`);
        p.write("2\r");
      }
    }
  });

  p.onExit(({ exitCode, signal }) => {
    console.error(`\n[pty] exited: code=${exitCode} signal=${signal}\n`);

    // Gemini exits 42 when --resume latest has nothing to resume
    if ((exitCode ?? 0) === 42 && geminiCmd.includes("--resume latest")) {
      console.error("[gemini] no resumable session yet — retrying without --resume latest\n");
      resumeEnabledThisRun = false;
      spawnGemini();
      return;
    }

    // If we stopped due to capacity, rotate model and restart
    if (switching) {
      modelIndex += 1;
      spawnGemini();
      return;
    }

    // Otherwise, exit normally
    try {
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
    } catch {}
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