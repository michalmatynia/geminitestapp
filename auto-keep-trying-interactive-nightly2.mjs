#!/usr/bin/env node
import pty from 'node-pty';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const { spawn } = pty;
const shell = process.env.SHELL || "/bin/zsh";

// ===== Configuration =====
// MODELS: comma-separated list (in order) of models to try (fallback chain).
// Default: try Gemini 3 Pro, then 3 Flash, then 2.5 Pro, etc.
const MODELS = (process.env.MODEL_CHAIN || [
  "gemini-3-pro-preview",
  "gemini-3-flash-preview",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
].join(","))
  .split(",").map((s) => s.trim()).filter(Boolean);

// Maximum "Keep trying" attempts per model before selecting "Stop" and switching.
// If NEVER_SWITCH=1, this limit is ignored (infinite retries).
const KEEP_TRY_MAX = Number(process.env.KEEP_TRY_MAX ?? 3);

// Whether to resume latest session. (Set RESUME_LATEST=0 to disable resume.)
let resumeEnabledThisRun = (process.env.RESUME_LATEST ?? "1") !== "0";

// Environment wrapper command: a full-HOME isolation wrapper (must be in PATH).
// Default assumes e.g. a nightly/preview wrapper.
const GEMINI_WRAPPER = process.env.GEMINI_WRAPPER || "gemini-nightly-iso";
// The corresponding isolated HOME directory (used to check for existing sessions).
const ISO_HOME = process.env.GEMINI_ISO_HOME || path.join(os.homedir(), ".gemini-nightly-home");

// Auto-retry settings for capacity errors:
const TRY_AGAIN_MIN_INTERVAL_MS = Number(process.env.TRY_AGAIN_MIN_INTERVAL_MS ?? 2500);
// Delay before typing "continue" or respawning after a no-menu capacity error:
const CAPACITY_RETRY_MS = Number(process.env.CAPACITY_RETRY_MS ?? 4000);
// Toggle automatic "continue" on capacity events (0 to disable):
const AUTO_CONTINUE_ON_CAPACITY = (process.env.AUTO_CONTINUE_ON_CAPACITY ?? "1") !== "0";
// If set (1), never switch models; always keep retrying the current model.
const NEVER_SWITCH = (process.env.NEVER_SWITCH ?? "0") === "1";

// ===== Internal state =====
let modelIndex = 0;    // index in MODELS array
let demandHits = 0;    // retry count for current model
let lastDemandTs = 0;  // timestamp of last retry action (for debounce)
let switching = false; // whether we plan to switch model on exit
let sawCapacity = false;  // set when a capacity event was detected

// For scheduling a delayed "continue" keystroke:
let continueScheduled = false;

// Returns the current model to use.
function currentModel() {
  return MODELS[modelIndex % MODELS.length];
}

// Heuristic: check if the isolated home has any session data.
// If not, avoid using --resume (fresh start).
function isoHomeLooksInitialized() {
  try {
    const entries = fs.readdirSync(ISO_HOME, { withFileTypes: true }).map(d => d.name);
    // A fresh ISO_HOME may only contain e.g. "Library"; ignore trivial entries.
    const nonTrivial = entries.filter((n) => n !== "Library");
    if (nonTrivial.length === 0) return false;
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
    return false;
  } catch {
    return false;
  }
}

// Build the Gemini CLI command with current model and optional --resume.
function buildGeminiCmd(model) {
  const canResume = resumeEnabledThisRun && isoHomeLooksInitialized();
  const resumeOpt = canResume ? "--resume latest" : "";
  return `${GEMINI_WRAPPER} --approval-mode yolo -m ${model} ${resumeOpt}`;
}

// Schedule sending the "continue" command after a delay.
function scheduleContinueRetry(reason = "capacity") {
  if (!AUTO_CONTINUE_ON_CAPACITY) return;
  if (continueScheduled) return;
  continueScheduled = true;
  console.error(`\n[gemini] ${reason} — retrying in ${CAPACITY_RETRY_MS}ms (sending: continue)\n`);
  setTimeout(() => {
    continueScheduled = false;
    try { ptyProcess?.write("continue\r"); } catch {}
  }, CAPACITY_RETRY_MS);
}

let ptyProcess = null;
function spawnGemini() {
  const model = currentModel();
  demandHits = 0;
  switching = false;
  sawCapacity = false;
  continueScheduled = false;

  const geminiCmd = buildGeminiCmd(model);
  console.error(`\n[gemini-preview] Launching model: ${model}` + 
                `${geminiCmd.includes("--resume") ? " (resuming latest)" : " (fresh)" }\n`);

  // Spawn the Gemini CLI in the user shell.
  ptyProcess = spawn(shell, ["-lc", geminiCmd], {
    name: "xterm-256color",
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
    cwd: process.cwd(),
    env: process.env,
  });

  // Pipe Gemini output to stdout and detect key messages.
  ptyProcess.onData((data) => {
    process.stdout.write(data);

    // 1) OAuth login succeeded: CLI asks to restart with 'r'.
    if (data.includes("Authentication succeeded") && data.includes("Press") && data.includes("'r'")) {
      // Delay slightly to let the UI finish rendering.
      setTimeout(() => {
        try { ptyProcess?.write("r"); } catch {}
      }, 100);
      return;
    }

    // 2) Capacity / high-demand handling.
    if (data.includes("We are currently experiencing high demand") || data.includes("No capacity available")) {
      const now = Date.now();
      if (now - lastDemandTs < TRY_AGAIN_MIN_INTERVAL_MS) {
        // Debounce: skip if this happened very recently.
        return;
      }
      lastDemandTs = now;
      sawCapacity = true;

      // Check if the menu with "1. Keep Trying" is visible.
      const lower = data.toLowerCase();
      const hasKeep = /keep trying/.test(lower);

      if (hasKeep) {
        // Interactive menu case: choose option 1 or 2.
        if (NEVER_SWITCH) {
          // Always keep trying, do not count or switch.
          ptyProcess.write("1\r");
        } else {
          demandHits++;
          if (demandHits <= KEEP_TRY_MAX) {
            // Press "1" to keep trying
            ptyProcess.write("1\r");
          } else {
            // Exceeded retry limit: switch model (press "2").
            switching = true;
            console.error(`\n[gemini] Capacity busy on ${model} — switching model...\n`);
            ptyProcess.write("2\r");
          }
        }
      } else {
        // No interactive menu: schedule typing 'continue' after a pause.
        scheduleContinueRetry(data.includes("No capacity available") ? "no capacity" : "high demand");
      }
      return;
    }
  });

  // Handle process exit to decide next steps.
  ptyProcess.onExit(({ exitCode, signal }) => {
    console.error(`\n[pty] Child exited: code=${exitCode} signal=${signal}\n`);

    // 3) If exit code 42 while resuming: retry without resume.
    if ((exitCode === 42) && resumeEnabledThisRun) {
      console.error("[gemini] No resumable session — retrying without --resume\n");
      resumeEnabledThisRun = false;
      spawnGemini();
      return;
    }

    // 4) If we decided to switch models:
    if (switching) {
      modelIndex++;
      spawnGemini();
      return;
    }

    // 5) If we exited during a capacity event (and not switching), retry after delay.
    if (sawCapacity) {
      sawCapacity = false;
      console.error(`[gemini] Exited during capacity event — restarting in ${CAPACITY_RETRY_MS}ms...\n`);
      setTimeout(() => spawnGemini(), CAPACITY_RETRY_MS);
      return;
    }

    // 6) Normal exit: clean up and propagate code.
    try {
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
    } catch {}
    process.stdin.pause();
    process.exit(exitCode ?? 0);
  });
}

// Forward user keystrokes to the PTY, so the session remains interactive.
process.stdin.setEncoding("utf8");
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on("data", (chunk) => {
  if (chunk === "\u0003") { // Ctrl-C
    try { ptyProcess?.kill("SIGINT"); } catch {}
    return;
  }
  try { ptyProcess?.write(chunk); } catch {}
});

// Start the first Gemini session.
spawnGemini();
