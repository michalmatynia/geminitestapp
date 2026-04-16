#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const MODELS = (
  process.env.MODEL_CHAIN ||
  [
    'gemini-3-pro-preview',
    'gemini-3-flash-preview',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
  ].join(',')
)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (MODELS.length === 0) {
  console.error('[fatal] MODEL_CHAIN resolved to an empty list.');
  process.exit(1);
}

const KEEP_TRY_MAX = toNumber(process.env.KEEP_TRY_MAX, 3);
const TRY_AGAIN_MIN_INTERVAL_MS = toNumber(process.env.TRY_AGAIN_MIN_INTERVAL_MS, 2500);
const CAPACITY_RETRY_MS = toNumber(process.env.CAPACITY_RETRY_MS, 4000);
const CAPACITY_RECENT_MS = toNumber(process.env.CAPACITY_RECENT_MS, 15000);
const RAW_TAIL_MAX = toNumber(process.env.RAW_TAIL_MAX, 24000);
const NORMALIZED_TAIL_MAX = toNumber(process.env.NORMALIZED_TAIL_MAX, 12000);
const AUTO_CONTINUE_ON_CAPACITY = isEnabled(process.env.AUTO_CONTINUE_ON_CAPACITY, true);
const NEVER_SWITCH = isEnabled(process.env.NEVER_SWITCH, false);
const RAW_OUTPUT = isEnabled(process.env.RAW_OUTPUT, false);
const DEBUG_AUTOMATION = isEnabled(process.env.DEBUG_AUTOMATION, false);
const DEBUG_LAUNCH = isEnabled(process.env.DEBUG_LAUNCH, false);
const SET_HOME_TO_ISO = isEnabled(process.env.PTY_SET_HOME_TO_ISO, false);
const AUTO_CHMOD_SPAWN_HELPER = isEnabled(process.env.AUTO_CHMOD_SPAWN_HELPER, true);
const AUTO_SIGN_HINT = isEnabled(process.env.AUTO_SIGN_HINT, true);

const KEEP_OPTION_TEXT = process.env.KEEP_OPTION_TEXT || '1';
const SWITCH_OPTION_TEXT = process.env.SWITCH_OPTION_TEXT || '2';
const CONTINUE_COMMAND = process.env.CONTINUE_COMMAND || 'continue';

const GEMINI_WRAPPER_ENV = process.env.GEMINI_WRAPPER || 'gemini-nightly-iso';
const GEMINI_WRAPPER_ARGS = parseJsonArrayEnv(process.env.GEMINI_WRAPPER_ARGS_JSON);
const ISO_HOME = process.env.GEMINI_ISO_HOME || path.join(os.homedir(), '.gemini-nightly-home');

let resumeEnabledThisRun = isEnabled(process.env.RESUME_LATEST, true);
let modelIndex = 0;
let activeRunId = 0;
let activePty = null;
let activePtyModuleName = null;
let activePtyModuleRoot = null;
let activeDisposables = [];
let continueTimer = null;
let restartTimer = null;
let stdinBound = false;
let resizeBound = false;
let shuttingDown = false;

let demandHits = 0;
let switching = false;
let lastDemandTs = 0;
let sawCapacityAt = 0;
let sawNoResumeSession = false;
let lastMenuFingerprint = '';
let rawTail = '';
let normalizedTail = '';
let lastLaunchContext = null;

main().catch((error) => {
  failWithCleanup(error instanceof Error ? error : new Error(String(error)));
});

async function main() {
  fs.mkdirSync(ISO_HOME, { recursive: true });

  const { pty, moduleName, moduleRoot } = await loadPtyModule();
  activePtyModuleName = moduleName;
  activePtyModuleRoot = moduleRoot;

  maybeFixSpawnHelper(moduleName, moduleRoot);

  bindUserInput();
  bindResizeHandling();
  bindProcessCleanup();

  spawnGemini(pty);
}

async function loadPtyModule() {
  const errors = [];

  for (const moduleName of ['@lydell/node-pty', 'node-pty']) {
    try {
      const imported = await import(moduleName);
      const candidate = imported?.spawn
        ? imported
        : imported?.default?.spawn
          ? imported.default
          : null;

      if (!candidate?.spawn) {
        throw new Error(`Module ${moduleName} loaded, but no spawn() export was found.`);
      }

      const packageJsonPath = require.resolve(`${moduleName}/package.json`);
      return {
        pty: candidate,
        moduleName,
        moduleRoot: path.dirname(packageJsonPath),
      };
    } catch (error) {
      errors.push(`${moduleName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(
    [
      'Could not load a PTY library.',
      'Install one of these in your project:',
      '  npm i @lydell/node-pty',
      '  npm i node-pty',
      '',
      errors.join('\n'),
    ].join('\n')
  );
}

function maybeFixSpawnHelper(moduleName, moduleRoot) {
  if (!AUTO_CHMOD_SPAWN_HELPER || process.platform !== 'darwin') return;

  for (const helperPath of findSpawnHelpers(moduleRoot)) {
    try {
      const stat = fs.statSync(helperPath);
      if ((stat.mode & 0o111) !== 0) continue;
      fs.chmodSync(helperPath, 0o755);
      console.error(`[gemini-nightly-pty] Fixed execute bit on ${moduleName} spawn-helper: ${helperPath}`);
    } catch {
      // Ignore helper permission issues here; launch diagnostics will mention them if relevant.
    }
  }
}

function findSpawnHelpers(moduleRoot) {
  if (!moduleRoot) return [];
  const out = [];

  for (const relative of [
    'prebuilds/darwin-arm64/spawn-helper',
    'prebuilds/darwin-x64/spawn-helper',
    'build/Release/spawn-helper',
  ]) {
    const candidate = path.join(moduleRoot, relative);
    if (fs.existsSync(candidate)) out.push(candidate);
  }

  return out;
}

function spawnGemini(pty) {
  clearContinueTimer();
  clearRestartTimer();
  disposeActiveListeners();
  activePty = null;

  activeRunId += 1;
  const runId = activeRunId;

  demandHits = 0;
  switching = false;
  lastDemandTs = 0;
  sawCapacityAt = 0;
  sawNoResumeSession = false;
  lastMenuFingerprint = '';
  rawTail = '';
  normalizedTail = '';
  lastLaunchContext = null;

  const model = currentModel();
  const { args, canResume } = buildGeminiArgs(model);
  const env = buildChildEnv();
  const userArgs = [...GEMINI_WRAPPER_ARGS, ...args];
  const targetSpec = inspectTarget(GEMINI_WRAPPER_ENV);
  const strategies = buildLaunchStrategies(targetSpec, userArgs, env);

  console.error(
    `\n[gemini-nightly-pty] Launching model: ${model}` +
      `${canResume ? ' (resuming latest)' : ' (fresh)'}` +
      `${RAW_OUTPUT ? ' [raw-output]' : ''}\n` +
      `[gemini-nightly-pty] Wrapper: ${targetSpec.resolvedCommand}\n` +
      `[gemini-nightly-pty] PTY backend: ${activePtyModuleName}\n`
  );

  let lastError = null;
  for (const strategy of strategies) {
    try {
      if (DEBUG_LAUNCH) {
        console.error(`[gemini-nightly-pty][launch] strategy=${strategy.kind} file=${strategy.file} args=${JSON.stringify(strategy.args)}`);
      }

      const ptyProcess = pty.spawn(strategy.file, strategy.args, {
        name: process.env.TERM || 'xterm-256color',
        cols: getTerminalColumns(),
        rows: getTerminalRows(),
        cwd: process.cwd(),
        env: strategy.env,
      });

      lastLaunchContext = {
        runId,
        model,
        strategy,
        targetSpec,
      };

      attachPty(runId, pty, ptyProcess);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (!isSpawnLaunchFailure(lastError)) {
        throw lastError;
      }
      if (DEBUG_LAUNCH) {
        console.error(`[gemini-nightly-pty][launch] ${strategy.kind} failed: ${lastError.message}`);
      }
    }
  }

  throw new Error(buildLaunchFailureMessage(targetSpec, strategies, lastError));
}

function attachPty(runId, pty, ptyProcess) {
  activePty = ptyProcess;

  activeDisposables.push(
    ptyProcess.onData((data) => {
      if (runId !== activeRunId || shuttingDown) return;
      process.stdout.write(data);
      handleTerminalData(runId, data);
    })
  );

  activeDisposables.push(
    ptyProcess.onExit(({ exitCode, signal }) => {
      if (runId !== activeRunId || shuttingDown) return;
      activePty = null;
      clearContinueTimer();
      disposeActiveListeners();
      handleChildExit(pty, { exitCode, signal, runId });
    })
  );
}

function inspectTarget(command) {
  const resolvedCommand = resolveExecutable(command);
  const isPathLike = command.includes(path.sep) || resolvedCommand.includes(path.sep);
  const stat = safeStat(resolvedCommand);
  const firstLine = stat?.isFile() ? safeReadFirstLine(resolvedCommand) : null;
  const shebang = parseShebang(firstLine);
  const extension = path.extname(resolvedCommand).toLowerCase();
  const isExecutableFile = Boolean(stat?.isFile() && ((stat.mode & 0o111) !== 0));

  return {
    originalCommand: command,
    resolvedCommand,
    exists: Boolean(stat),
    isPathLike,
    stat,
    firstLine,
    shebang,
    extension,
    isExecutableFile,
  };
}

function buildLaunchStrategies(targetSpec, userArgs, env) {
  const strategies = [];
  const pushStrategy = (strategy) => {
    if (!strategy?.file) return;
    const key = JSON.stringify([strategy.kind, strategy.file, strategy.args, strategy.env?.HOME, strategy.env?.GEMINI_ISO_HOME]);
    if (strategies.some((existing) => existing._key === key)) return;
    strategy._key = key;
    strategies.push(strategy);
  };

  const explicit = explicitInterpreterStrategy(targetSpec, userArgs, env);
  const direct = directStrategy(targetSpec, userArgs, env);
  const shell = shellStrategy(targetSpec, userArgs, env);

  if (explicit?.preferFirst) {
    pushStrategy(explicit);
    pushStrategy(direct);
    pushStrategy(shell);
  } else {
    pushStrategy(direct);
    pushStrategy(explicit);
    pushStrategy(shell);
  }

  return strategies;
}

function directStrategy(targetSpec, userArgs, env) {
  return {
    kind: 'direct',
    file: targetSpec.resolvedCommand,
    args: userArgs,
    env,
  };
}

function explicitInterpreterStrategy(targetSpec, userArgs, env) {
  const { resolvedCommand, shebang, extension } = targetSpec;

  if (shebang?.program) {
    const programBase = path.basename(shebang.program);
    const envWithShebang = {
      ...env,
      ...shebang.envAssignments,
    };

    if (programBase === 'node' || programBase === 'nodejs') {
      return {
        kind: shebang.usesEnvSplit ? 'shebang-node-env-split' : 'shebang-node',
        file: process.execPath,
        args: [...shebang.programArgs, resolvedCommand, ...userArgs],
        env: envWithShebang,
        preferFirst: true,
      };
    }

    if (['bash', 'zsh', 'sh', 'ksh'].includes(programBase)) {
      return {
        kind: shebang.usesEnvSplit ? 'shebang-shell-env-split' : 'shebang-shell',
        file: resolveExecutable(shebang.program),
        args: [...shebang.programArgs, resolvedCommand, ...userArgs],
        env: envWithShebang,
        preferFirst: true,
      };
    }

    if (programBase === 'env' && shebang.envProgram) {
      const envProgramBase = path.basename(shebang.envProgram);
      if (envProgramBase === 'node' || envProgramBase === 'nodejs') {
        return {
          kind: 'env-node',
          file: process.execPath,
          args: [...shebang.envProgramArgs, resolvedCommand, ...userArgs],
          env: envWithShebang,
          preferFirst: true,
        };
      }
    }
  }

  if (['.js', '.mjs', '.cjs'].includes(extension)) {
    return {
      kind: 'node-extension',
      file: process.execPath,
      args: [resolvedCommand, ...userArgs],
      env,
      preferFirst: true,
    };
  }

  return null;
}

function shellStrategy(targetSpec, userArgs, env) {
  const shell = resolveExecutable(process.env.PTY_SHELL || process.env.SHELL || '/bin/bash');
  const wantsInteractive = isEnabled(process.env.PTY_SHELL_INTERACTIVE, false);
  const wantsLogin = isEnabled(process.env.PTY_SHELL_LOGIN, false);
  const flag = `-${wantsInteractive ? 'i' : ''}${wantsLogin ? 'l' : ''}c`;

  return {
    kind: 'shell-exec',
    file: shell,
    args: [flag, 'exec "$@"', 'gemini-pty-shell', targetSpec.resolvedCommand, ...userArgs],
    env,
  };
}

function parseShebang(line) {
  if (!line?.startsWith('#!')) return null;

  const raw = line.slice(2).trim().replace(/\r$/, '');
  const tokens = shellSplit(raw);
  if (tokens.length === 0) return null;

  const out = {
    raw,
    program: tokens[0],
    programArgs: tokens.slice(1),
    envProgram: null,
    envProgramArgs: [],
    envAssignments: {},
    usesEnvSplit: false,
  };

  const base = path.basename(tokens[0]);
  if (base !== 'env') return out;

  let cursor = 1;
  let envTokens = tokens.slice(1);

  if (envTokens[0] === '-S') {
    out.usesEnvSplit = true;
    envTokens = envTokens.slice(1);
    cursor = 0;
  }

  while (cursor < envTokens.length && isEnvAssignment(envTokens[cursor])) {
    const token = envTokens[cursor];
    const eqIndex = token.indexOf('=');
    out.envAssignments[token.slice(0, eqIndex)] = token.slice(eqIndex + 1);
    cursor += 1;
  }

  if (cursor < envTokens.length) {
    out.envProgram = envTokens[cursor];
    out.envProgramArgs = envTokens.slice(cursor + 1);
    out.program = out.envProgram;
    out.programArgs = out.envProgramArgs;
  }

  return out;
}

function shellSplit(input) {
  const tokens = [];
  let current = '';
  let quote = null;
  let escaping = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (char === '\\' && quote !== "'") {
      escaping = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (escaping) current += '\\';
  if (current.length > 0) tokens.push(current);
  return tokens;
}

function isEnvAssignment(token) {
  return /^[A-Za-z_][A-Za-z0-9_]*=.*/.test(token);
}

function handleTerminalData(runId, chunk) {
  rawTail += chunk;
  if (rawTail.length > RAW_TAIL_MAX) {
    rawTail = rawTail.slice(rawTail.length - RAW_TAIL_MAX);
  }

  normalizedTail = normalizeTerminalText(rawTail);
  if (normalizedTail.length > NORMALIZED_TAIL_MAX) {
    normalizedTail = normalizedTail.slice(normalizedTail.length - NORMALIZED_TAIL_MAX);
  }

  if (/no\s+previous\s+sessions\s+found/i.test(normalizedTail)) {
    sawNoResumeSession = true;
  }

  maybeAutomate(runId);
}

function maybeAutomate(runId) {
  const state = detectAutomationState(normalizedTail);
  if (!state.hasCapacity) return;

  sawCapacityAt = Date.now();

  if (state.hasKeepMenu) {
    clearContinueTimer();

    if (state.fingerprint === lastMenuFingerprint) {
      return;
    }

    const now = Date.now();
    if (now - lastDemandTs < TRY_AGAIN_MIN_INTERVAL_MS) {
      return;
    }

    lastDemandTs = now;
    lastMenuFingerprint = state.fingerprint;

    if (NEVER_SWITCH) {
      sendLine(KEEP_OPTION_TEXT, 'keep-trying', runId);
      return;
    }

    demandHits += 1;
    if (demandHits <= KEEP_TRY_MAX) {
      sendLine(KEEP_OPTION_TEXT, `keep-trying ${demandHits}/${KEEP_TRY_MAX}`, runId);
      return;
    }

    switching = true;
    console.error(`\n[gemini-nightly-pty] Capacity busy on ${currentModel()} — switching model...\n`);
    sendLine(SWITCH_OPTION_TEXT, 'switch-model', runId);
    return;
  }

  scheduleContinueRetry(state.reason, runId);
}

function scheduleContinueRetry(reason, runId) {
  if (!AUTO_CONTINUE_ON_CAPACITY) return;
  if (continueTimer) return;

  console.error(`\n[gemini-nightly-pty] ${reason} — retrying in ${CAPACITY_RETRY_MS}ms (sending: ${CONTINUE_COMMAND})\n`);
  continueTimer = setTimeout(() => {
    continueTimer = null;
    if (runId !== activeRunId || !activePty) return;
    sendLine(CONTINUE_COMMAND, reason, runId);
  }, CAPACITY_RETRY_MS);
}

function clearContinueTimer() {
  if (continueTimer) {
    clearTimeout(continueTimer);
    continueTimer = null;
  }
}

function clearRestartTimer() {
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
}

function sendLine(text, reason, runId) {
  if (runId !== activeRunId || !activePty) return false;

  try {
    if (DEBUG_AUTOMATION) {
      console.error(`[gemini-nightly-pty][auto] send ${JSON.stringify(text)} (${reason})`);
    }
    activePty.write(`${text}\r`);
    return true;
  } catch (error) {
    console.error(`[warn] Failed to send automated input (${reason}): ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

function handleChildExit(pty, { exitCode, signal, runId }) {
  console.error(`\n[child] exited: code=${exitCode} signal=${signal}\n`);

  const noResumeSession = resumeEnabledThisRun && (exitCode === 42 || sawNoResumeSession);
  if (noResumeSession) {
    console.error('[gemini-nightly-pty] No resumable session — retrying without --resume\n');
    resumeEnabledThisRun = false;
    spawnGemini(pty);
    return;
  }

  if (switching) {
    modelIndex += 1;
    spawnGemini(pty);
    return;
  }

  if (sawCapacityAt > 0 && Date.now() - sawCapacityAt <= CAPACITY_RECENT_MS) {
    console.error(`[gemini-nightly-pty] Exited during/after capacity event — restarting in ${CAPACITY_RETRY_MS}ms...\n`);
    restartTimer = setTimeout(() => {
      restartTimer = null;
      if (runId !== activeRunId || shuttingDown) return;
      spawnGemini(pty);
    }, CAPACITY_RETRY_MS);
    return;
  }

  cleanupAndExit(typeof exitCode === 'number' ? exitCode : 0);
}

function currentModel() {
  return MODELS[modelIndex % MODELS.length];
}

function buildGeminiArgs(model) {
  const canResume = resumeEnabledThisRun && isoHomeLooksInitialized();
  const args = [model];

  if (canResume) {
    args.push('--resume', 'latest');
  }

  if (RAW_OUTPUT) {
    args.push('--raw-output', '--accept-raw-output-risk');
  }

  return { args, canResume };
}

function buildChildEnv() {
  const env = {
    ...process.env,
    GEMINI_ISO_HOME: ISO_HOME,
  };

  if (SET_HOME_TO_ISO) {
    env.HOME = ISO_HOME;
  }

  return env;
}

function isoHomeLooksInitialized() {
  try {
    const sentinel = path.join(ISO_HOME, '.iso-initialized');
    if (fs.existsSync(sentinel)) return true;
    if (!fs.existsSync(ISO_HOME)) return false;

    const entries = fs.readdirSync(ISO_HOME);
    return entries.some((entry) => entry && entry !== 'Library' && entry !== '.DS_Store');
  } catch {
    return false;
  }
}

function resolveExecutable(cmd) {
  if (!cmd) return cmd;

  if (cmd.includes(path.sep) && fs.existsSync(cmd)) {
    return cmd;
  }

  const pathEnv = process.env.PATH || '';
  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, cmd);
    try {
      fs.accessSync(candidate, fs.constants.F_OK);
      return candidate;
    } catch {
      // Continue searching.
    }
  }

  return cmd;
}

function normalizeTerminalText(input) {
  let text = input
    .replace(/\u001B\][^\u0007]*(?:\u0007|\u001B\\)/g, '')
    .replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\u001B[@-_]/g, '')
    .replace(/\r\n?/g, '\n');

  const out = [];
  for (const char of text) {
    if (char === '\b') {
      out.pop();
      continue;
    }
    if (char === '\u0000') continue;
    out.push(char);
  }

  return out.join('').replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

function detectAutomationState(text) {
  const tail = text.slice(-NORMALIZED_TAIL_MAX);

  const capacityRules = [
    [/we\s+are\s+currently\s+experiencing\s+high\s+demand/i, 'high demand'],
    [/no\s+capacity\s+available/i, 'no capacity'],
    [/high\s+demand\s+right\s+now/i, 'high demand'],
    [/try\s+again\s+in\s+a\s+moment/i, 'try again soon'],
    [/temporarily\s+unavailable/i, 'temporarily unavailable'],
  ];

  const matchedCapacity = capacityRules.find(([pattern]) => pattern.test(tail));
  if (!matchedCapacity) {
    return { hasCapacity: false, hasKeepMenu: false, reason: 'capacity', fingerprint: '' };
  }

  const keepMatch =
    tail.match(/(?:^|\n)\s*1\s*[.):-]?\s*(?:keep\s+trying|try\s+again|continue\s+waiting)\b/i) ||
    tail.match(/press\s+1\s+to\s+(?:keep\s+trying|try\s+again|continue\s+waiting)\b/i);

  const switchMatch =
    tail.match(/(?:^|\n)\s*2\s*[.):-]?\s*(?:switch|change|use)\b/i) ||
    tail.match(/press\s+2\s+to\s+(?:switch|change|use)\b/i);

  const hasKeepMenu = Boolean(keepMatch && switchMatch);
  const fingerprint = hasKeepMenu
    ? extractMenuFingerprint(tail, keepMatch.index ?? 0, switchMatch.index ?? 0)
    : '';

  return {
    hasCapacity: true,
    hasKeepMenu,
    reason: matchedCapacity[1],
    fingerprint,
  };
}

function extractMenuFingerprint(text, firstIndex, secondIndex) {
  const start = Math.max(0, Math.min(firstIndex, secondIndex) - 40);
  const end = Math.min(text.length, Math.max(firstIndex, secondIndex) + 220);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

function bindUserInput() {
  if (stdinBound) return;
  stdinBound = true;

  process.stdin.resume();
  if (process.stdin.isTTY) {
    process.stdin.setRawMode?.(true);
  }

  process.stdin.on('data', onUserInput);
  process.stdin.on('end', onStdinEnd);
}

function unbindUserInput() {
  if (!stdinBound) return;
  stdinBound = false;

  process.stdin.off('data', onUserInput);
  process.stdin.off('end', onStdinEnd);

  if (process.stdin.isTTY) {
    try {
      process.stdin.setRawMode?.(false);
    } catch {
      // Ignore terminal reset failures during shutdown.
    }
  }
}

function onUserInput(chunk) {
  if (!activePty) return;
  try {
    activePty.write(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk));
  } catch {
    // Ignore best-effort input forwarding failures.
  }
}

function onStdinEnd() {
  if (!activePty) return;
  try {
    activePty.write('\x04');
  } catch {
    // Ignore EOF forwarding failures.
  }
}

function bindResizeHandling() {
  if (resizeBound || !process.stdout.isTTY) return;
  resizeBound = true;
  process.stdout.on('resize', onTerminalResize);
}

function unbindResizeHandling() {
  if (!resizeBound || !process.stdout.isTTY) return;
  resizeBound = false;
  process.stdout.off('resize', onTerminalResize);
}

function onTerminalResize() {
  if (!activePty) return;
  try {
    activePty.resize(getTerminalColumns(), getTerminalRows());
  } catch {
    // Ignore resize failures caused by race conditions during exit.
  }
}

function getTerminalColumns() {
  return process.stdout.columns || 120;
}

function getTerminalRows() {
  return process.stdout.rows || 30;
}

function bindProcessCleanup() {
  process.on('SIGINT', () => cleanupAndExit(130));
  process.on('SIGTERM', () => cleanupAndExit(143));
  process.on('SIGHUP', () => cleanupAndExit(129));
  process.on('exit', () => restoreTerminal());
  process.on('uncaughtException', (error) => failWithCleanup(error));
  process.on('unhandledRejection', (error) => failWithCleanup(error instanceof Error ? error : new Error(String(error))));
}

function disposeActiveListeners() {
  for (const disposable of activeDisposables.splice(0)) {
    try {
      disposable?.dispose?.();
    } catch {
      // Ignore listener disposal failures.
    }
  }
}

function cleanupAndExit(code) {
  if (shuttingDown) return;
  shuttingDown = true;

  clearContinueTimer();
  clearRestartTimer();
  disposeActiveListeners();

  try {
    activePty?.kill?.();
  } catch {
    // Ignore kill failures.
  }
  activePty = null;

  restoreTerminal();
  process.exit(code);
}

function restoreTerminal() {
  unbindUserInput();
  unbindResizeHandling();
}

function failWithCleanup(error) {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(`\n[fatal] ${message}\n`);
  cleanupAndExit(1);
}

function isEnabled(value, defaultValue) {
  if (value == null) return defaultValue;
  return value !== '0' && value.toLowerCase() !== 'false';
}

function toNumber(value, defaultValue) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function parseJsonArrayEnv(value) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
      throw new Error('expected a JSON array of strings');
    }
    return parsed;
  } catch (error) {
    throw new Error(
      `GEMINI_WRAPPER_ARGS_JSON is invalid: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function safeStat(filePath) {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

function safeReadFirstLine(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    try {
      const buffer = Buffer.alloc(512);
      const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
      const snippet = buffer.subarray(0, bytesRead).toString('utf8');
      return snippet.split(/\n/, 1)[0] || '';
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return null;
  }
}

function isSpawnLaunchFailure(error) {
  const message = error?.message || '';
  return /posix_spawnp failed|spawn-helper|ENOENT|EACCES|Unknown system error/i.test(message);
}

function buildLaunchFailureMessage(targetSpec, strategies, lastError) {
  const lines = [];
  lines.push('All PTY launch strategies failed.');
  lines.push(`Target: ${targetSpec.resolvedCommand}`);
  lines.push(`Original wrapper: ${targetSpec.originalCommand}`);
  lines.push(`Exists: ${targetSpec.exists ? 'yes' : 'no'}`);

  if (targetSpec.stat) {
    lines.push(`Mode: ${formatMode(targetSpec.stat.mode)}`);
    lines.push(`Executable: ${targetSpec.isExecutableFile ? 'yes' : 'no'}`);
  }

  if (targetSpec.firstLine) {
    lines.push(`First line: ${targetSpec.firstLine}`);
  }

  if (targetSpec.shebang?.usesEnvSplit) {
    lines.push('Detected /usr/bin/env -S shebang. That form is not portable on macOS BSD env when executing scripts directly.');
  }

  if (activePtyModuleRoot) {
    for (const helperPath of findSpawnHelpers(activePtyModuleRoot)) {
      const helperStat = safeStat(helperPath);
      if (helperStat) {
        lines.push(`spawn-helper: ${helperPath} mode=${formatMode(helperStat.mode)}`);
      }
    }
  }

  lines.push(`Tried strategies: ${strategies.map((strategy) => strategy.kind).join(', ')}`);
  if (lastError) {
    lines.push(`Last error: ${lastError.message}`);
  }

  const fileInfo = runCommandCapture('file', ['-b', targetSpec.resolvedCommand]);
  if (fileInfo) {
    lines.push(`file(1): ${fileInfo}`);
  }

  if (AUTO_SIGN_HINT && process.platform === 'darwin') {
    lines.push('macOS checks worth trying:');
    lines.push('  chmod +x node_modules/node-pty/prebuilds/darwin-*/spawn-helper');
    lines.push('  xattr -dr com.apple.quarantine node_modules/node-pty');
    lines.push('  codesign --force --sign - node_modules/node-pty/prebuilds/darwin-*/spawn-helper');
  }

  lines.push('If your wrapper is a shell script, force shell launch with: PTY_SHELL=/bin/bash PTY_SHELL_LOGIN=0');
  lines.push('If your wrapper is a Node script, bypass the wrapper and point GEMINI_WRAPPER at node plus GEMINI_WRAPPER_ARGS_JSON for the script path.');

  return lines.join('\n');
}

function formatMode(mode) {
  return `0${(mode & 0o777).toString(8)}`;
}

function runCommandCapture(command, args) {
  try {
    const result = spawnSync(command, args, { encoding: 'utf8' });
    if (result.status === 0) {
      return (result.stdout || '').trim();
    }
  } catch {
    // Ignore diagnostic command failures.
  }
  return null;
}
