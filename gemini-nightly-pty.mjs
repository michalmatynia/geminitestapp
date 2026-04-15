#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

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
const MAX_CAPACITY_RETRY_MS = toNumber(process.env.MAX_CAPACITY_RETRY_MS, 30000);
const CAPACITY_RECENT_MS = toNumber(process.env.CAPACITY_RECENT_MS, 15000);
const CAPACITY_EVENT_RESET_MS = toNumber(process.env.CAPACITY_EVENT_RESET_MS, 20000);
const AUTO_CONTINUE_MAX_PER_EVENT = toNumber(process.env.AUTO_CONTINUE_MAX_PER_EVENT, 6);
const AUTO_RESTART_MAX_PER_WINDOW = toNumber(process.env.AUTO_RESTART_MAX_PER_WINDOW, 4);
const AUTO_RESTART_WINDOW_MS = toNumber(process.env.AUTO_RESTART_WINDOW_MS, 120000);
const MANUAL_OVERRIDE_MS = toNumber(process.env.MANUAL_OVERRIDE_MS, 20000);
const AUTOMATION_COOLDOWN_MS = toNumber(process.env.AUTOMATION_COOLDOWN_MS, 60000);
const FORCE_KILL_AFTER_MS = toNumber(process.env.FORCE_KILL_AFTER_MS, 1200);
const RAW_TAIL_MAX = toNumber(process.env.RAW_TAIL_MAX, 24000);
const NORMALIZED_TAIL_MAX = toNumber(process.env.NORMALIZED_TAIL_MAX, 12000);

const AUTO_CONTINUE_ON_CAPACITY = isEnabled(process.env.AUTO_CONTINUE_ON_CAPACITY, true);
const AUTO_CONTINUE_MODE = ((process.env.AUTO_CONTINUE_MODE || 'prompt_only').trim().toLowerCase());
const AUTO_DISABLE_ON_USAGE_LIMIT = isEnabled(process.env.AUTO_DISABLE_ON_USAGE_LIMIT, true);
const AUTO_ALLOW_SESSION_PERMISSIONS = isEnabled(process.env.AUTO_ALLOW_SESSION_PERMISSIONS, true);
const NEVER_SWITCH = isEnabled(process.env.NEVER_SWITCH, false);
const RAW_OUTPUT = isEnabled(process.env.RAW_OUTPUT, false);
const DEBUG_AUTOMATION = isEnabled(process.env.DEBUG_AUTOMATION, false);
const DEBUG_LAUNCH = isEnabled(process.env.DEBUG_LAUNCH, false);
const SET_HOME_TO_ISO = isEnabled(process.env.PTY_SET_HOME_TO_ISO, false);

const KEEP_OPTION_TEXT = process.env.KEEP_OPTION_TEXT || '1';
const SWITCH_OPTION_TEXT = process.env.SWITCH_OPTION_TEXT || '2';
const CONTINUE_COMMAND = process.env.CONTINUE_COMMAND || 'continue';
const SESSION_PERMISSION_OPTION_TEXT = process.env.SESSION_PERMISSION_OPTION_TEXT || '2';

const GEMINI_WRAPPER_ENV = process.env.GEMINI_WRAPPER || 'gemini-preview-iso';
const GEMINI_WRAPPER_ARGS = parseJsonArrayEnv(process.env.GEMINI_WRAPPER_ARGS_JSON);
const ISO_HOME = process.env.GEMINI_PREVIEW_ISO_HOME || process.env.GEMINI_ISO_HOME || path.join(os.homedir(), '.gemini-preview-home');
const SHELL_PATH = resolveExecutable(process.env.PTY_SHELL || process.env.SHELL || '/bin/zsh');
const WRAPPER_LAUNCH_MODE = ((process.env.WRAPPER_LAUNCH_MODE && process.env.WRAPPER_LAUNCH_MODE.trim()) || (process.env.PTY_FORCE_SHELL === '1' ? 'shell' : 'auto')).toLowerCase();

const DEFAULT_HOTKEY_PREFIX_NAME = process.platform === 'darwin' ? 'ctrl-g' : 'ctrl-]';
const HOTKEY_PREFIX_NAME = (process.env.HOTKEY_PREFIX || DEFAULT_HOTKEY_PREFIX_NAME).trim().toLowerCase();
const { byte: HOTKEY_PREFIX_BYTE, label: HOTKEY_PREFIX_LABEL } = resolveHotkeyPrefix(HOTKEY_PREFIX_NAME);
const AUTOMATION_DEFAULT_ENABLED = isEnabled(process.env.AUTOMATION_ENABLED, true);

let loadedPty = null;
let resumeEnabledThisRun = isEnabled(process.env.RESUME_LATEST, true);
let modelIndex = 0;
let activeRunId = 0;
let activePty = null;
let activePtyModuleName = null;
let activeDisposables = [];
let continueTimer = null;
let restartTimer = null;
let forceKillTimer = null;
let automationResumeTimer = null;
let stdinBound = false;
let resizeBound = false;
let shuttingDown = false;
let lastLaunchPlan = null;

let automationEnabled = AUTOMATION_DEFAULT_ENABLED;
let automationDisabledReason = automationEnabled ? '' : 'manual';
let automationPausedUntil = 0;
let hotkeyAwaitingCommand = false;
let hotkeyCommandTimer = null;
let plannedAction = null;

let demandHits = 0;
let switching = false;
let lastDemandTs = 0;
let sawCapacityAt = 0;
let autoContinueAttempts = 0;
let autoRestartHistory = [];
let sawNoResumeSession = false;
let usageLimitLatched = false;
let lastMenuFingerprint = '';
let lastPermissionFingerprint = '';
let rawTail = '';
let normalizedTail = '';

main().catch((error) => {
  failWithCleanup(error instanceof Error ? error : new Error(String(error)));
});

async function main() {
  fs.mkdirSync(ISO_HOME, { recursive: true });

  const { pty, moduleName } = await loadPtyModule();
  loadedPty = pty;
  activePtyModuleName = moduleName;

  bindUserInput();
  bindResizeHandling();
  bindProcessCleanup();

  spawnGemini(pty);
}

async function loadPtyModule() {
  const errors = [];

  for (const moduleName of ['node-pty', '@lydell/node-pty']) {
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

      return { pty: candidate, moduleName };
    } catch (error) {
      errors.push(`${moduleName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(
    [
      'Could not load a PTY library.',
      'Install one of these in your project:',
      '  npm i node-pty',
      '  npm i @lydell/node-pty',
      '',
      errors.join('\n'),
    ].join('\n')
  );
}

function spawnGemini(pty) {
  clearContinueTimer();
  clearRestartTimer();
  clearForceKillTimer();
  clearAutomationResumeTimer();
  clearHotkeyCommandTimer();
  disposeActiveListeners();
  activePty = null;
  plannedAction = null;

  if (automationDisabledReason === 'usage_limit') {
    automationEnabled = AUTOMATION_DEFAULT_ENABLED;
    automationDisabledReason = automationEnabled ? '' : 'manual';
  }

  activeRunId += 1;
  const runId = activeRunId;

  resetCapacityEventState();
  rawTail = '';
  normalizedTail = '';
  sawNoResumeSession = false;
  usageLimitLatched = false;
  lastPermissionFingerprint = '';

  const model = currentModel();
  const { args, canResume } = buildGeminiArgs(model);
  const env = buildChildEnv();
  const launchArgs = [...GEMINI_WRAPPER_ARGS, ...args];
  const wrapperInfo = inspectCommandTarget(GEMINI_WRAPPER_ENV, env.PATH || process.env.PATH || '');
  const launchPlan = buildLaunchPlan(wrapperInfo, launchArgs);
  lastLaunchPlan = launchPlan;

  logLaunchBanner({ model, canResume, wrapperInfo, launchPlan });

  let ptyProcess;
  try {
    ptyProcess = pty.spawn(launchPlan.file, launchPlan.args, {
      name: process.env.TERM || 'xterm-256color',
      cols: getTerminalColumns(),
      rows: getTerminalRows(),
      cwd: process.cwd(),
      env,
    });
  } catch (error) {
    const maybeFallback = maybeBuildFallbackLaunchPlan(error, wrapperInfo, launchArgs, launchPlan);
    if (!maybeFallback) {
      throw wrapSpawnError(error, wrapperInfo, launchPlan);
    }

    lastLaunchPlan = maybeFallback;
    console.error(`[gemini-preview-pty] Direct spawn failed, retrying via shell exec: ${error instanceof Error ? error.message : String(error)}`);
    ptyProcess = pty.spawn(maybeFallback.file, maybeFallback.args, {
      name: process.env.TERM || 'xterm-256color',
      cols: getTerminalColumns(),
      rows: getTerminalRows(),
      cwd: process.cwd(),
      env,
    });
  }

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
      clearForceKillTimer();
      disposeActiveListeners();
      handleChildExit(pty, { exitCode, signal, runId });
    })
  );
}

function logLaunchBanner({ model, canResume, wrapperInfo, launchPlan }) {
  const lines = [
    `\n[gemini-preview-pty] Launching model: ${model}${canResume ? ' (resuming latest)' : ' (fresh)'}${RAW_OUTPUT ? ' [raw-output]' : ''}`,
    `[gemini-preview-pty] Wrapper request: ${GEMINI_WRAPPER_ENV}`,
    `[gemini-preview-pty] Wrapper resolved: ${wrapperInfo.resolvedPath || '(not found on PATH yet)'}${wrapperInfo.exists ? '' : ' [missing]'}`,
    `[gemini-preview-pty] Wrapper kind: ${wrapperInfo.kind}`,
    `[gemini-preview-pty] Launch mode: ${launchPlan.mode}`,
    `[gemini-preview-pty] Auto-continue mode: ${AUTO_CONTINUE_MODE}`,
    `[gemini-preview-pty] Auto-approve session permissions: ${AUTO_ALLOW_SESSION_PERMISSIONS ? 'ON' : 'OFF'}`,
    `[gemini-preview-pty] PTY backend: ${activePtyModuleName}`,
    `[gemini-preview-pty] Local controls: ${HOTKEY_PREFIX_LABEL} h help, ${HOTKEY_PREFIX_LABEL} a toggle auto, ${HOTKEY_PREFIX_LABEL} s switch model, ${HOTKEY_PREFIX_LABEL} q quit`,
  ];

  if (wrapperInfo.kind === 'script' && wrapperInfo.shebang) {
    lines.push(`[gemini-preview-pty] Script shebang: ${wrapperInfo.shebang}${wrapperInfo.hasCRLFShebang ? ' [CRLF detected]' : ''}`);
  }

  if (DEBUG_LAUNCH) {
    lines.push(`[gemini-preview-pty] Launch file: ${launchPlan.file}`);
    lines.push(`[gemini-preview-pty] Launch args: ${JSON.stringify(launchPlan.args)}`);
  }

  console.error(lines.join('\n') + '\n');
}

function maybeBuildFallbackLaunchPlan(error, wrapperInfo, launchArgs, currentPlan) {
  const message = error instanceof Error ? error.message : String(error);
  if (currentPlan.mode === 'shell') return null;

  if (/posix_spawnp failed/i.test(message) || /ENOENT/i.test(message) || /EACCES/i.test(message)) {
    return makeShellLaunchPlan(wrapperInfo, launchArgs);
  }

  return null;
}

function wrapSpawnError(error, wrapperInfo, launchPlan) {
  const details = [
    error instanceof Error ? error.stack || error.message : String(error),
    '',
    `Launch mode: ${launchPlan.mode}`,
    `Launch file: ${launchPlan.file}`,
    `Launch args: ${JSON.stringify(launchPlan.args)}`,
    `Requested wrapper: ${GEMINI_WRAPPER_ENV}`,
    `Resolved wrapper: ${wrapperInfo.resolvedPath || '(not found)'}`,
    `Exists: ${wrapperInfo.exists}`,
    `Executable: ${wrapperInfo.isExecutable}`,
    `Kind: ${wrapperInfo.kind}`,
  ];

  if (wrapperInfo.readError) {
    details.push(`Inspect error: ${wrapperInfo.readError}`);
  }
  if (wrapperInfo.shebang) {
    details.push(`Shebang: ${wrapperInfo.shebang}${wrapperInfo.hasCRLFShebang ? ' [CRLF detected]' : ''}`);
  }

  if (!wrapperInfo.exists) {
    details.push('Hint: the wrapper path could not be found. Check GEMINI_WRAPPER and PATH.');
  } else if (!wrapperInfo.isExecutable) {
    details.push('Hint: the wrapper exists but is not executable. Try: chmod +x <wrapper>.');
  } else if (wrapperInfo.hasCRLFShebang) {
    details.push('Hint: the wrapper appears to have CRLF line endings in the shebang. Run: perl -pi -e "s/\r$//" <wrapper>');
  } else if (wrapperInfo.kind === 'script') {
    details.push('Hint: this looks like a shell script wrapper. Shell exec mode is usually more reliable on macOS PTYs.');
  }

  return new Error(details.join('\n'));
}

function buildLaunchPlan(wrapperInfo, launchArgs) {
  if (WRAPPER_LAUNCH_MODE === 'shell') {
    return makeShellLaunchPlan(wrapperInfo, launchArgs);
  }

  if (WRAPPER_LAUNCH_MODE === 'direct') {
    return makeDirectLaunchPlan(wrapperInfo, launchArgs);
  }

  if (wrapperInfo.kind === 'script' || wrapperInfo.hasCRLFShebang) {
    return makeShellLaunchPlan(wrapperInfo, launchArgs);
  }

  return makeDirectLaunchPlan(wrapperInfo, launchArgs);
}

function makeDirectLaunchPlan(wrapperInfo, launchArgs) {
  return {
    mode: 'direct',
    file: wrapperInfo.execPath,
    args: launchArgs,
  };
}

function makeShellLaunchPlan(wrapperInfo, launchArgs) {
  const executable = wrapperInfo.execPath || GEMINI_WRAPPER_ENV;
  const command = ['exec', shQuote(executable), ...launchArgs.map(shQuote)].join(' ');
  return {
    mode: 'shell',
    file: SHELL_PATH,
    args: ['-lc', command],
  };
}

function inspectCommandTarget(command, pathEnv) {
  const result = {
    requested: command,
    resolvedPath: null,
    execPath: command,
    exists: false,
    isExecutable: false,
    kind: 'unknown',
    shebang: '',
    hasCRLFShebang: false,
    readError: '',
  };

  const resolved = resolveExecutableDetailed(command, pathEnv);
  result.resolvedPath = resolved.resolvedPath;
  result.execPath = resolved.resolvedPath || command;
  result.exists = resolved.exists;
  result.isExecutable = resolved.isExecutable;

  if (!resolved.exists || !resolved.resolvedPath) {
    return result;
  }

  try {
    const stat = fs.statSync(resolved.resolvedPath);
    if (stat.isDirectory()) {
      result.kind = 'directory';
      return result;
    }

    const sample = fs.readFileSync(resolved.resolvedPath, { encoding: 'utf8', flag: 'r' }).slice(0, 512);
    const firstLine = sample.split('\n', 1)[0] || '';
    const ext = path.extname(resolved.resolvedPath).toLowerCase();

    if (firstLine.startsWith('#!')) {
      result.kind = 'script';
      result.shebang = firstLine.replace(/\r$/, '');
      result.hasCRLFShebang = /\r$/.test(firstLine);
      return result;
    }

    if (['.sh', '.bash', '.zsh', '.command'].includes(ext)) {
      result.kind = 'script';
      return result;
    }

    if (/^[\x00-\x7F]*$/.test(sample)) {
      result.kind = 'text';
    } else {
      result.kind = 'binary';
    }
  } catch (error) {
    result.readError = error instanceof Error ? error.message : String(error);
    result.kind = 'unknown';
  }

  return result;
}

function resolveExecutableDetailed(cmd, pathEnv) {
  const result = {
    resolvedPath: null,
    exists: false,
    isExecutable: false,
  };

  if (!cmd) return result;

  if (cmd.includes(path.sep)) {
    result.resolvedPath = cmd;
    result.exists = fs.existsSync(cmd);
    if (result.exists) {
      try {
        fs.accessSync(cmd, fs.constants.X_OK);
        result.isExecutable = true;
      } catch {
        result.isExecutable = false;
      }
    }
    return result;
  }

  for (const dir of (pathEnv || '').split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, cmd);
    if (!fs.existsSync(candidate)) continue;
    result.resolvedPath = candidate;
    result.exists = true;
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      result.isExecutable = true;
    } catch {
      result.isExecutable = false;
    }
    return result;
  }

  return result;
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
  if (!isAutomationActive()) {
    clearContinueTimer();
    return;
  }

  const state = detectAutomationState(normalizedTail);

  if (state.hasPermissionMenu) {
    clearContinueTimer();
    lastMenuFingerprint = '';
    handlePermissionMenu(state, runId);
    return;
  }

  lastPermissionFingerprint = '';

  if (state.hasUsageLimit) {
    handleUsageLimit(state);
    return;
  }

  if (!state.hasCapacity) {
    clearContinueTimer();
    return;
  }

  const now = Date.now();
  if (sawCapacityAt > 0 && now - sawCapacityAt > CAPACITY_EVENT_RESET_MS) {
    resetCapacityEventState();
  }
  sawCapacityAt = now;

  if (state.hasKeepMenu) {
    clearContinueTimer();

    if (state.fingerprint === lastMenuFingerprint) {
      return;
    }

    if (now - lastDemandTs < TRY_AGAIN_MIN_INTERVAL_MS) {
      return;
    }

    lastDemandTs = now;
    lastMenuFingerprint = state.fingerprint;
    demandHits += 1;

    if (NEVER_SWITCH) {
      if (demandHits > KEEP_TRY_MAX) {
        pauseAutomationTemporarily(AUTOMATION_COOLDOWN_MS, 'keep-trying loop limit reached');
        return;
      }
      sendLine(KEEP_OPTION_TEXT, `keep-trying ${demandHits}/${KEEP_TRY_MAX}`, runId);
      return;
    }

    if (demandHits <= KEEP_TRY_MAX) {
      sendLine(KEEP_OPTION_TEXT, `keep-trying ${demandHits}/${KEEP_TRY_MAX}`, runId);
      return;
    }

    switching = true;
    clearContinueTimer();
    console.error(`\n[gemini-preview-pty] Capacity busy on ${currentModel()} — switching model...\n`);
    sendLine(SWITCH_OPTION_TEXT, 'switch-model', runId);
    return;
  }

  if (!shouldAutoContinue(state)) {
    clearContinueTimer();
    return;
  }

  scheduleContinueRetry(state, runId);
}

function handleUsageLimit(state) {
  if (usageLimitLatched) return;
  usageLimitLatched = true;
  switching = false;
  clearContinueTimer();
  clearRestartTimer();
  sawCapacityAt = 0;
  autoContinueAttempts = 0;
  lastMenuFingerprint = '';

  if (AUTO_DISABLE_ON_USAGE_LIMIT) {
    setAutomationEnabled(false, 'usage_limit');
    console.error(`\n[gemini-preview-pty] Usage limit detected (${state.reason}) — automation paused. ${hotkeySummary()}\n`);
  }
}

function handlePermissionMenu(state, runId) {
  if (!AUTO_ALLOW_SESSION_PERMISSIONS) return;

  const fingerprint = state.permissionFingerprint || state.fingerprint || 'permission-menu';
  if (fingerprint && fingerprint === lastPermissionFingerprint) {
    return;
  }

  const sent = sendLine(state.permissionOptionText || SESSION_PERMISSION_OPTION_TEXT, 'allow-for-this-session', runId);
  if (sent) {
    lastPermissionFingerprint = fingerprint;
  }
}

function resetAutomationTracking() {
  clearContinueTimer();
  clearRestartTimer();
  usageLimitLatched = false;
  resetCapacityEventState();
}

function recheckVisiblePrompt(reason = 'manual recheck') {
  if (!activePty || shuttingDown) return;
  if (!isAutomationActive()) return;

  if (DEBUG_AUTOMATION) {
    console.error(`[gemini-preview-pty][auto] Rechecking visible prompt (${reason})`);
  }

  maybeAutomate(activeRunId);
}

function scheduleContinueRetry(state, runId) {
  if (!AUTO_CONTINUE_ON_CAPACITY) return;
  if (continueTimer) return;

  const continueLabel = describeContinueAction(state);

  if (autoContinueAttempts >= AUTO_CONTINUE_MAX_PER_EVENT) {
    pauseAutomationTemporarily(AUTOMATION_COOLDOWN_MS, `too many auto-continues for ${state.reason}`);
    return;
  }

  const delay = Math.min(CAPACITY_RETRY_MS * 2 ** autoContinueAttempts, MAX_CAPACITY_RETRY_MS);
  console.error(`\n[gemini-preview-pty] ${state.reason} — retrying in ${delay}ms (sending: ${continueLabel}) [${autoContinueAttempts + 1}/${AUTO_CONTINUE_MAX_PER_EVENT}]\n`);
  continueTimer = setTimeout(() => {
    continueTimer = null;
    if (runId !== activeRunId || !activePty || !isAutomationActive()) return;

    const latestState = detectAutomationState(normalizedTail);
    if (!latestState.hasCapacity || latestState.hasKeepMenu || latestState.hasUsageLimit || !shouldAutoContinue(latestState)) {
      return;
    }

    autoContinueAttempts += 1;
    sendContinueAction(latestState, runId);
  }, delay);
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

function clearForceKillTimer() {
  if (forceKillTimer) {
    clearTimeout(forceKillTimer);
    forceKillTimer = null;
  }
}

function clearAutomationResumeTimer() {
  if (automationResumeTimer) {
    clearTimeout(automationResumeTimer);
    automationResumeTimer = null;
  }
}

function sendLine(text, reason, runId) {
  if (runId !== activeRunId || !activePty) return false;

  try {
    if (DEBUG_AUTOMATION) {
      console.error(`[gemini-preview-pty][auto] send ${JSON.stringify(text)} (${reason})`);
    }
    activePty.write(`${text}\r`);
    return true;
  } catch (error) {
    console.error(`[warn] Failed to send automated input (${reason}): ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

function sendRaw(text, reason = 'raw') {
  if (!activePty) return false;
  try {
    if (DEBUG_AUTOMATION) {
      console.error(`[gemini-preview-pty][raw] send ${JSON.stringify(text)} (${reason})`);
    }
    activePty.write(text);
    return true;
  } catch (error) {
    console.error(`[warn] Failed to send raw input (${reason}): ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

function shouldAutoContinue(state) {
  if (!AUTO_CONTINUE_ON_CAPACITY) return false;

  if (AUTO_CONTINUE_MODE === 'off' || AUTO_CONTINUE_MODE === '0' || AUTO_CONTINUE_MODE === 'false') {
    return false;
  }

  if (AUTO_CONTINUE_MODE === 'capacity' || AUTO_CONTINUE_MODE === 'always') {
    return true;
  }

  return state.hasExplicitContinuePrompt;
}

function describeContinueAction(state) {
  if (state.continueAction === 'enter') {
    return 'Enter';
  }
  return CONTINUE_COMMAND;
}

function sendContinueAction(state, runId) {
  if (state.continueAction === 'enter') {
    return sendLine('', state.reason, runId);
  }
  return sendLine(CONTINUE_COMMAND, state.reason, runId);
}

function handleChildExit(pty, { exitCode, signal, runId }) {
  console.error(`\n[child] exited: code=${exitCode} signal=${signal}\n`);

  if (plannedAction) {
    const action = plannedAction;
    plannedAction = null;

    if (action.kind === 'switch') {
      modelIndex += 1;
      spawnGemini(pty);
      return;
    }

    if (action.kind === 'restart') {
      spawnGemini(pty);
      return;
    }

    if (action.kind === 'exit') {
      cleanupAndExit(action.code ?? 0);
      return;
    }
  }

  const noResumeSession = resumeEnabledThisRun && (exitCode === 42 || sawNoResumeSession);
  if (noResumeSession) {
    console.error('[gemini-preview-pty] No resumable session — retrying without --resume\n');
    resumeEnabledThisRun = false;
    spawnGemini(pty);
    return;
  }

  if (switching) {
    modelIndex += 1;
    spawnGemini(pty);
    return;
  }

  const canAutoRestart =
    automationEnabled &&
    automationDisabledReason !== 'usage_limit' &&
    sawCapacityAt > 0 &&
    Date.now() - sawCapacityAt <= CAPACITY_RECENT_MS;

  if (canAutoRestart) {
    if (!recordAutoRestart()) {
      console.error(`\n[gemini-preview-pty] Too many auto-restarts in a short window — stopping the loop. ${hotkeySummary()}\n`);
      cleanupAndExit(typeof exitCode === 'number' ? exitCode : 1);
      return;
    }

    console.error(`[gemini-preview-pty] Exited during/after capacity event — restarting in ${CAPACITY_RETRY_MS}ms...\n`);
    restartTimer = setTimeout(() => {
      restartTimer = null;
      if (runId !== activeRunId || shuttingDown) return;
      spawnGemini(pty);
    }, CAPACITY_RETRY_MS);
    return;
  }

  cleanupAndExit(typeof exitCode === 'number' ? exitCode : 0);
}

function recordAutoRestart() {
  const now = Date.now();
  autoRestartHistory = autoRestartHistory.filter((ts) => now - ts <= AUTO_RESTART_WINDOW_MS);
  if (autoRestartHistory.length >= AUTO_RESTART_MAX_PER_WINDOW) {
    return false;
  }
  autoRestartHistory.push(now);
  return true;
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
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string') {
      env[key] = value;
    }
  }

  env.GEMINI_ISO_HOME = ISO_HOME;
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
  if (cmd.includes(path.sep) && fs.existsSync(cmd)) return cmd;

  const pathEnv = process.env.PATH || '';
  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, cmd);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // Continue.
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

  const defaultState = {
    hasPermissionMenu: false,
    permissionOptionText: SESSION_PERMISSION_OPTION_TEXT,
    permissionFingerprint: '',
    hasUsageLimit: false,
    hasCapacity: false,
    hasKeepMenu: false,
    hasExplicitContinuePrompt: false,
    continueAction: 'command',
    reason: 'idle',
    fingerprint: '',
  };

  const permissionPromptMatch =
    tail.match(/allow\s+execution\s+of\s*:/i) ||
    tail.match(/action\s+required/i);
  const allowSessionMatch = matchNumberedMenuOption(tail, 'allow for this session');
  const allowOnceMatch = matchNumberedMenuOption(tail, 'allow once');
  const denyMatch =
    matchNumberedMenuOption(tail, 'no, suggest changes') ||
    matchNumberedMenuOption(tail, 'deny') ||
    matchNumberedMenuOption(tail, 'reject');

  const hasPermissionPromptText =
    /allow\s+execution\s+of\s*:/i.test(tail) ||
    (/action\s+required/i.test(tail) && /allow\s+for\s+this\s+session/i.test(tail));

  if (hasPermissionPromptText && allowSessionMatch) {
    const permissionFingerprint = extractMenuFingerprint(
      tail,
      permissionPromptMatch?.index ?? allowSessionMatch.index ?? 0,
      denyMatch?.index ?? allowSessionMatch.index ?? permissionPromptMatch?.index ?? 0
    );

    return {
      ...defaultState,
      hasPermissionMenu: true,
      permissionOptionText: allowSessionMatch.optionText || SESSION_PERMISSION_OPTION_TEXT,
      permissionFingerprint,
      reason: 'permission prompt',
      fingerprint: permissionFingerprint,
    };
  }

  const usageRules = [
    [/you(?:'ve| have)\s+(?:reached|hit)\s+(?:your\s+)?(?:usage|request|quota|rate)\s+limit/i, 'usage limit reached'],
    [/(?:daily|monthly)\s+(?:usage|quota|request)\s+limit/i, 'plan limit reached'],
    [/rate\s+limit\s+exceeded/i, 'rate limit exceeded'],
    [/quota\s+(?:reached|exceeded|used\s+up)/i, 'quota exceeded'],
    [/usage\s+(?:limit|quota)\s+(?:reached|exceeded|used\s+up)/i, 'usage limit reached'],
    [/try\s+again\s+(?:later|tomorrow)\b/i, 'retry later'],
    [/come\s+back\s+(?:later|tomorrow)\b/i, 'retry later'],
  ];

  const matchedUsage = usageRules.find(([pattern]) => pattern.test(tail));
  if (matchedUsage) {
    return {
      ...defaultState,
      hasUsageLimit: true,
      reason: matchedUsage[1],
    };
  }

  const capacityRules = [
    [/we\s+are\s+currently\s+experiencing\s+high\s+demand/i, 'high demand'],
    [/no\s+capacity\s+available/i, 'no capacity'],
    [/high\s+demand\s+right\s+now/i, 'high demand'],
    [/try\s+again\s+in\s+a\s+moment/i, 'try again soon'],
    [/temporarily\s+unavailable/i, 'temporarily unavailable'],
  ];

  const matchedCapacity = capacityRules.find(([pattern]) => pattern.test(tail));
  if (!matchedCapacity) {
    return defaultState;
  }

  const keepMatch =
    tail.match(/(?:^|\n)\s*1\s*[.):-]?\s*(?:keep\s+trying|try\s+again|continue\s+waiting)\b/i) ||
    tail.match(/press\s+1\s+to\s+(?:keep\s+trying|try\s+again|continue\s+waiting)\b/i);

  const switchMatch =
    tail.match(/(?:^|\n)\s*2\s*[.):-]?\s*(?:switch|change|use)\b/i) ||
    tail.match(/press\s+2\s+to\s+(?:switch|change|use)\b/i);

  const continueCommandMatch =
    tail.match(/(?:(?:type|enter|send|write)\s+["'`]?continue["'`]?\s+(?:to|for)\b[^\n]*|(?:to|for)\s+(?:keep\s+trying|continue\s+waiting|retry)[^\n]*\btype\s+["'`]?continue["'`]?)/i) ||
    tail.match(/(?:^|\n)\s*continue\s*$/im);

  const continueEnterMatch = tail.match(/(?:(?:press|hit)\s+(?:enter|return)\s+(?:to|for)\b[^\n]*(?:keep\s+trying|continue\s+waiting|retry|try\s+again)|(?:keep\s+trying|continue\s+waiting|retry|try\s+again)[^\n]*(?:press|hit)\s+(?:enter|return))/i);

  const continueMatch = continueCommandMatch || continueEnterMatch;
  const hasExplicitContinuePrompt = Boolean(continueMatch);
  const continueAction = continueEnterMatch ? 'enter' : 'command';

  const hasKeepMenu = Boolean(keepMatch && switchMatch);
  const fingerprint = hasKeepMenu
    ? extractMenuFingerprint(tail, keepMatch.index ?? 0, switchMatch.index ?? 0)
    : hasExplicitContinuePrompt
      ? extractMenuFingerprint(tail, continueMatch.index ?? 0, continueMatch.index ?? 0)
      : '';

  return {
    ...defaultState,
    hasCapacity: true,
    hasKeepMenu,
    hasExplicitContinuePrompt,
    continueAction,
    reason: matchedCapacity[1],
    fingerprint,
  };
}

function extractMenuFingerprint(text, firstIndex, secondIndex) {
  const start = Math.max(0, Math.min(firstIndex, secondIndex) - 40);
  const end = Math.min(text.length, Math.max(firstIndex, secondIndex) + 220);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

function matchNumberedMenuOption(text, label) {
  const escapedLabel = escapeRegex(label).replace(/\s+/g, '\\s+');
  const patterns = [
    new RegExp(
      `(?:^|\\n)[^\S\n]*(?:[│║┃|][^\S\n]*)*(?:[•●◦▪◆▶➜»›>*?-][^\S\n]*)?(\\d+)\s*[.):-]?[^\S\n]*${escapedLabel}\\b`,
      'i'
    ),
    new RegExp(
      `(?:^|\\n)[^\S\n]*(?:[│║┃|][^\S\n]*)*(?:[•●◦▪◆▶➜»›>*?-][^\S\n]*)?${escapedLabel}\\b[^\S\n]*[(:-]?[^\S\n]*(\\d+)\\b`,
      'i'
    ),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      return {
        index: match.index,
        optionText: match[1] || '',
        raw: match[0],
      };
    }
  }

  const labelOnly = new RegExp(escapedLabel, 'i').exec(text);
  if (labelOnly) {
    return {
      index: labelOnly.index,
      optionText: '',
      raw: labelOnly[0],
    };
  }

  return null;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), 'utf8');
  if (buffer.length === 0) return;

  const forwardBytes = [];

  for (const byte of buffer.values()) {
    if (hotkeyAwaitingCommand) {
      hotkeyAwaitingCommand = false;
      clearHotkeyCommandTimer();
      handleHotkeyCommand(byte);
      continue;
    }

    if (byte === HOTKEY_PREFIX_BYTE) {
      hotkeyAwaitingCommand = true;
      armHotkeyCommandTimer();
      process.stderr.write(`\n[local] Prefix detected (${HOTKEY_PREFIX_LABEL}). Press a command key: h help, a auto, p pause, s switch, r restart, c Ctrl-C, q quit.\n`);
      continue;
    }

    noteManualInput();
    forwardBytes.push(byte);
  }

  if (forwardBytes.length > 0 && activePty) {
    try {
      activePty.write(Buffer.from(forwardBytes).toString('utf8'));
    } catch {
      // Ignore best-effort input forwarding failures.
    }
  }
}

function armHotkeyCommandTimer() {
  clearHotkeyCommandTimer();
  hotkeyCommandTimer = setTimeout(() => {
    hotkeyCommandTimer = null;
    if (!hotkeyAwaitingCommand) return;
    hotkeyAwaitingCommand = false;
    process.stderr.write(`\n[local] Hotkey prefix timed out. ${hotkeySummary()}\n`);
  }, 3000);
}

function clearHotkeyCommandTimer() {
  if (!hotkeyCommandTimer) return;
  clearTimeout(hotkeyCommandTimer);
  hotkeyCommandTimer = null;
}

function decodeHotkeyCommandByte(byte) {
  if (byte >= 1 && byte <= 26) {
    return String.fromCharCode(96 + byte);
  }

  return String.fromCharCode(byte).toLowerCase();
}

function handleHotkeyCommand(byte) {
  const command = decodeHotkeyCommandByte(byte);

  if (command === 'h' || command === '?') {
    printLocalHelp();
    return;
  }

  if (command === 'a') {
    if (automationEnabled) {
      setAutomationEnabled(false, 'manual');
      console.error(`\n[local] Automation disabled. ${HOTKEY_PREFIX_LABEL}a to re-enable.\n`);
    } else {
      automationPausedUntil = 0;
      setAutomationEnabled(true);
      console.error(`\n[local] Automation enabled.\n`);
    }
    return;
  }

  if (command === 'p') {
    pauseAutomationTemporarily(AUTOMATION_COOLDOWN_MS, 'manual pause');
    return;
  }

  if (command === 's') {
    requestLauncherAction('switch');
    return;
  }

  if (command === 'r') {
    requestLauncherAction('restart');
    return;
  }

  if (command === 'c') {
    pauseAutomationTemporarily(MANUAL_OVERRIDE_MS, 'manual Ctrl-C', true);
    sendRaw('\x03', 'manual-ctrl-c');
    console.error(`\n[local] Sent Ctrl-C to Gemini and paused automation for ${Math.round(MANUAL_OVERRIDE_MS / 1000)}s.\n`);
    return;
  }

  if (command === 'q') {
    requestLauncherAction('exit');
    return;
  }

  console.error(`\n[local] Unknown command byte ${byte} (${JSON.stringify(command)}). ${hotkeySummary()}\n`);
}

function noteManualInput() {
  clearContinueTimer();

  if (!automationEnabled) return;

  const nextPauseUntil = Date.now() + MANUAL_OVERRIDE_MS;
  if (nextPauseUntil > automationPausedUntil) {
    automationPausedUntil = nextPauseUntil;
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

function requestLauncherAction(kind) {
  clearContinueTimer();
  clearRestartTimer();
  clearForceKillTimer();
  clearAutomationResumeTimer();
  switching = false;
  sawCapacityAt = 0;
  plannedAction = { kind, code: 0 };

  if (!activePty) {
    fulfillPlannedAction();
    return;
  }

  const label =
    kind === 'switch'
      ? 'Switching model'
      : kind === 'restart'
        ? 'Restarting current model'
        : 'Quitting launcher';

  console.error(`\n[local] ${label}...\n`);
  sendRaw('\x03', `local-${kind}`);
  forceKillTimer = setTimeout(() => {
    if (!plannedAction || plannedAction.kind !== kind || !activePty) return;
    try {
      activePty.kill();
    } catch {
      // Ignore racey kill failures.
    }
  }, FORCE_KILL_AFTER_MS);
}

function fulfillPlannedAction() {
  if (!plannedAction) return;
  const action = plannedAction;
  plannedAction = null;

  if (action.kind === 'switch') {
    modelIndex += 1;
    if (loadedPty) spawnGemini(loadedPty);
    return;
  }

  if (action.kind === 'restart') {
    if (loadedPty) spawnGemini(loadedPty);
    return;
  }

  cleanupAndExit(action.code ?? 0);
}

function hotkeySummary() {
  return `${HOTKEY_PREFIX_LABEL} h help | ${HOTKEY_PREFIX_LABEL} a auto on/off | ${HOTKEY_PREFIX_LABEL} p pause auto | ${HOTKEY_PREFIX_LABEL} s switch | ${HOTKEY_PREFIX_LABEL} r restart | ${HOTKEY_PREFIX_LABEL} c Ctrl-C | ${HOTKEY_PREFIX_LABEL} q quit`;
}

function printLocalHelp() {
  const pauseSec = Math.round(MANUAL_OVERRIDE_MS / 1000);
  console.error(
    [
      '',
      `[local] ${hotkeySummary()}`,
      `[local] Press the prefix first, then the command key.`,
      `[local] Manual typing pauses automation for ${pauseSec}s. Auto-continue mode: ${AUTO_CONTINUE_MODE}. Session permission auto-allow: ${AUTO_ALLOW_SESSION_PERMISSIONS ? 'ON' : 'OFF'}.` + (automationEnabled ? '' : ' Automation is currently disabled.'),
      `[local] Current model: ${currentModel()}`,
      '',
    ].join('\n')
  );
}

function setAutomationEnabled(enabled, reason = 'manual') {
  automationEnabled = enabled;
  automationDisabledReason = enabled ? '' : reason;

  if (!enabled) {
    automationPausedUntil = 0;
    clearContinueTimer();
    clearRestartTimer();
    clearAutomationResumeTimer();
    return;
  }

  automationPausedUntil = 0;
  clearAutomationResumeTimer();
  resetAutomationTracking();
  recheckVisiblePrompt('automation enabled');
}

function pauseAutomationTemporarily(ms, reason, silent = false) {
  if (!automationEnabled) return;
  clearContinueTimer();
  const until = Date.now() + ms;
  if (until > automationPausedUntil) {
    automationPausedUntil = until;
  }
  if (!silent) {
    console.error(`\n[gemini-preview-pty] Automation paused for ${Math.round(ms / 1000)}s (${reason}). ${hotkeySummary()}\n`);
  }
}

function isAutomationActive() {
  return automationEnabled && Date.now() >= automationPausedUntil && !shuttingDown;
}

function resetCapacityEventState() {
  demandHits = 0;
  switching = false;
  lastDemandTs = 0;
  sawCapacityAt = 0;
  autoContinueAttempts = 0;
  lastMenuFingerprint = '';
  lastPermissionFingerprint = '';
}

function cleanupAndExit(code) {
  if (shuttingDown) return;
  shuttingDown = true;

  clearContinueTimer();
  clearRestartTimer();
  clearForceKillTimer();
  clearAutomationResumeTimer();
  clearHotkeyCommandTimer();
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

function resolveHotkeyPrefix(name) {
  const normalized = String(name || '').trim().toLowerCase();
  const mapping = {
    'ctrl-g': { byte: 0x07, label: 'Ctrl-G' },
    '^g': { byte: 0x07, label: 'Ctrl-G' },
    'ctrl-]': { byte: 0x1d, label: 'Ctrl-]' },
    '^]': { byte: 0x1d, label: 'Ctrl-]' },
    'ctrl-t': { byte: 0x14, label: 'Ctrl-T' },
    '^t': { byte: 0x14, label: 'Ctrl-T' },
    'ctrl-\\': { byte: 0x1c, label: 'Ctrl-\\' },
    '^\\': { byte: 0x1c, label: 'Ctrl-\\' },
  };

  const resolved = mapping[normalized];
  if (resolved) return resolved;

  throw new Error(
    [
      `Unsupported HOTKEY_PREFIX=${JSON.stringify(name)}.`,
      'Use one of: ctrl-g, ctrl-], ctrl-t, ctrl-\\',
    ].join(' ')
  );
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

function shQuote(value) {
  const s = String(value);
  return `'${s.replace(/'/g, `'\\''`)}'`;
}
