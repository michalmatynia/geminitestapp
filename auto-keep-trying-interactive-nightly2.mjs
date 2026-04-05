#!/usr/bin/env node
/**
 * macOS script-based runner (no typing lag option)
 *
 * Modes:
 * - SCRIPT_PASSTHROUGH=1 (default): script stdio=inherit (snappy), NO output parsing/automation
 * - SCRIPT_PASSTHROUGH=0: script stdout/stderr piped through Node (automation enabled, may lag)
 *
 * Env:
 * - MODEL_CHAIN, KEEP_TRY_MAX, RESUME_LATEST, GEMINI_WRAPPER, RAW_OUTPUT
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn as cpSpawn, spawnSync } from "node:child_process";
import { setTimeout } from "node:timers";

const MODELS = (
  process.env.MODEL_CHAIN ||
  [
    "gemini-3-pro-preview",
    "gemini-3-flash-preview",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
  ].join(",")
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const KEEP_TRY_MAX = Number(process.env.KEEP_TRY_MAX ?? 3);
let resumeEnabledThisRun = (process.env.RESUME_LATEST ?? "1") !== "0";

const GEMINI_WRAPPER_ENV = process.env.GEMINI_WRAPPER || "gemini-nightly-iso";
const ISO_HOME =
  process.env.GEMINI_ISO_HOME || path.join(os.homedir(), ".gemini-nightly-home");

const TRY_AGAIN_MIN_INTERVAL_MS = Number(process.env.TRY_AGAIN_MIN_INTERVAL_MS ?? 2500);
const CAPACITY_RETRY_MS = Number(process.env.CAPACITY_RETRY_MS ?? 4000);
const AUTO_CONTINUE_ON_CAPACITY = (process.env.AUTO_CONTINUE_ON_CAPACITY ?? "1") !== "0";
const NEVER_SWITCH = (process.env.NEVER_SWITCH ?? "0") === "1";
const RAW_OUTPUT = (process.env.RAW_OUTPUT ?? "0") === "1";

// Default to passthrough for zero typing lag
const SCRIPT_PASSTHROUGH = (process.env.SCRIPT_PASSTHROUGH ?? "1") === "1";

let modelIndex = 0;
let demandHits = 0;
let lastDemandTs = 0;
let switching = false;
let sawCapacity = false;
let continueScheduled = false;

let cpProcess = null;

// Only used when SCRIPT_PASSTHROUGH=0
let outBuf = "";
const OUTBUF_MAX = 32_000;

function resolveExecutable(cmd) {
  if (!cmd) return cmd;
  if (cmd.includes("/") && fs.existsSync(cmd)) return cmd;

  const pathEnv = process.env.PATH || "";
  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, cmd);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {}
  }
  return cmd;
}

const GEMINI_WRAPPER = resolveExecutable(GEMINI_WRAPPER_ENV);

function currentModel() {
  return MODELS[modelIndex % MODELS.length];
}

function isoHomeLooksInitialized() {
  try {
    const sentinel = path.join(ISO_HOME, ".iso-initialized");
    if (fs.existsSync(sentinel)) return true;

    if (!fs.existsSync(ISO_HOME)) return false;
    const entries = fs.readdirSync(ISO_HOME);
    return entries.some((n) => n && n !== "Library" && n !== ".DS_Store");
  } catch {
    return false;
  }
}
//
function buildGeminiArgs(model) {
  const canResume = resumeEnabledThisRun && isoHomeLooksInitialized();
  const args = [model];
  if (canResume) args.push("--resume", "latest");
  if (RAW_OUTPUT) args.push("--raw-output", "--accept-raw-output-risk");
  return { args, canResume };
}

function hasScriptTTY() {
  const r = spawnSync("which", ["script"], { encoding: "utf8" });
  return r.status === 0 && r.stdout.trim().length > 0;
}

function trySend(s) {
  try {
    if (cpProcess?.stdin) cpProcess.stdin.write(s + "\n");
  } catch {}
}

function scheduleContinueRetry(reason = "capacity") {
  if (!AUTO_CONTINUE_ON_CAPACITY) return;
  if (continueScheduled) return;
  continueScheduled = true;

  console.error(`\n[gemini] ${reason} — retrying in ${CAPACITY_RETRY_MS}ms (sending: continue)\n`);
  setTimeout(() => {
    continueScheduled = false;
    trySend("continue");
  }, CAPACITY_RETRY_MS);
}

function appendAndTrimBuf(s) {
  outBuf += s;
  if (outBuf.length > OUTBUF_MAX) outBuf = outBuf.slice(outBuf.length - OUTBUF_MAX);
}

function detectCapacityAndMenu(bufferText) {
  const hasCapacity =
    bufferText.includes("We are currently experiencing high demand") ||
    bufferText.includes("No capacity available");

  if (!hasCapacity) return { hasCapacity: false, hasKeepMenu: false };

  const lower = bufferText.toLowerCase();
  const hasKeep = /keep\s+trying/.test(lower);
  const hasOptions = /\b1[\.\)]/.test(lower) || /\b2[\.\)]/.test(lower);
  return { hasCapacity: true, hasKeepMenu: hasKeep && (hasOptions || hasKeep) };
}

function handleGeminiOutput(data) {
  process.stdout.write(data);
  appendAndTrimBuf(data);

  const { hasCapacity, hasKeepMenu } = detectCapacityAndMenu(outBuf);
  if (!hasCapacity) return;

  const now = Date.now();
  if (now - lastDemandTs < TRY_AGAIN_MIN_INTERVAL_MS) return;
  lastDemandTs = now;
  sawCapacity = true;

  if (hasKeepMenu) {
    if (NEVER_SWITCH) {
      trySend("1");
      return;
    }
    demandHits++;
    if (demandHits <= KEEP_TRY_MAX) {
      trySend("1");
    } else {
      switching = true;
      console.error(`\n[gemini] Capacity busy on ${currentModel()} — switching model...\n`);
      trySend("2");
    }
  } else {
    scheduleContinueRetry(outBuf.includes("No capacity available") ? "no capacity" : "high demand");
  }
}

function handleExit(exitCode, signal) {
  console.error(`\n[child] exited: code=${exitCode} signal=${signal}\n`);

  if (exitCode === 42 && resumeEnabledThisRun) {
    console.error("[gemini] No resumable session — retrying without --resume\n");
    resumeEnabledThisRun = false;
    spawnGemini();
    return;
  }

  if (switching) {
    modelIndex++;
    spawnGemini();
    return;
  }

  if (sawCapacity) {
    sawCapacity = false;
    console.error(`[gemini] Exited during capacity event — restarting in ${CAPACITY_RETRY_MS}ms...\n`);
    setTimeout(() => spawnGemini(), CAPACITY_RETRY_MS);
    return;
  }

  process.exit(exitCode ?? 0);
}

function spawnGemini() {
  const model = currentModel();
  demandHits = 0;
  switching = false;
  sawCapacity = false;
  continueScheduled = false;
  outBuf = "";

  const { args, canResume } = buildGeminiArgs(model);

  console.error(
    `\n[gemini-nightly] Launching model: ${model}` +
      `${canResume ? " (resuming latest)" : " (fresh)"}${RAW_OUTPUT ? " [raw-output]" : ""}\n` +
      `[gemini-nightly] Wrapper: ${GEMINI_WRAPPER}\n` +
      `[gemini-nightly] script passthrough: ${SCRIPT_PASSTHROUGH ? "ON (snappy)" : "OFF (automation, may lag)"}\n`
  );

  if (!hasScriptTTY()) {
    console.error("[fatal] macOS `script` not found on PATH.");
    process.exit(1);
  }

  const scriptArgs = ["-q", "/dev/null", GEMINI_WRAPPER, ...args];

  if (SCRIPT_PASSTHROUGH) {
    // FASTEST: no Node output bounce -> no typing lag
    cpProcess = cpSpawn("script", scriptArgs, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });

    cpProcess.on("exit", (code, sig) => {
      cpProcess = null;
      handleExit(code, sig);
    });

    return;
  }

  // Automation mode (may lag): pipe output through Node for parsing
  cpProcess = cpSpawn("script", scriptArgs, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"],
  });

  cpProcess.stdout.on("data", (buf) => handleGeminiOutput(buf.toString("utf8")));
  cpProcess.stderr.on("data", (buf) => handleGeminiOutput(buf.toString("utf8")));

  cpProcess.on("exit", (code, sig) => {
    cpProcess = null;
    outBuf = "";
    handleExit(code, sig);
  });
}

spawnGemini();