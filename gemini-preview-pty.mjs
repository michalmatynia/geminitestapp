#!/usr/bin/env node
// @ts-check


import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const CLI_FLAVOR = 'preview';
const FLAVOR_LABEL = 'gemini-preview-pty';
const DEFAULT_WRAPPER = 'gemini-preview-iso';
const DEFAULT_ISO_HOME = path.join(os.homedir(), '.gemini-preview-home');

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
const MANUAL_OVERRIDE_MS = toNumber(process.env.MANUAL_OVERRIDE_MS, 20000);
const AUTOMATION_COOLDOWN_MS = toNumber(process.env.AUTOMATION_COOLDOWN_MS, 60000);
const FORCE_KILL_AFTER_MS = toNumber(process.env.FORCE_KILL_AFTER_MS, 1200);
const CAPACITY_RETRY_MS = toNumber(process.env.CAPACITY_RETRY_MS, 5000);
const MAX_CAPACITY_RETRY_MS = toNumber(process.env.MAX_CAPACITY_RETRY_MS, 30000);
const CAPACITY_EVENT_RESET_MS = toNumber(process.env.CAPACITY_EVENT_RESET_MS, 25000);
const CAPACITY_RECENT_MS = toNumber(process.env.CAPACITY_RECENT_MS, 15000);
const AUTO_CONTINUE_MAX_PER_EVENT = toNumber(process.env.AUTO_CONTINUE_MAX_PER_EVENT, 4);
const AUTO_RESTART_MAX_PER_WINDOW = toNumber(process.env.AUTO_RESTART_MAX_PER_WINDOW, 3);
const AUTO_RESTART_WINDOW_MS = toNumber(process.env.AUTO_RESTART_WINDOW_MS, 120000);
const RAW_TAIL_MAX = toNumber(process.env.RAW_TAIL_MAX, 48000);
const NORMALIZED_TAIL_MAX = toNumber(process.env.NORMALIZED_TAIL_MAX, 16000);
const HOTKEY_TIMEOUT_MS = toNumber(process.env.HOTKEY_TIMEOUT_MS, 3000);
const STATIC_RECHECK_MS = toNumber(process.env.STATIC_RECHECK_MS, 1800);
const ACTION_RETRY_MIN_MS = toNumber(process.env.ACTION_RETRY_MIN_MS, 2600);
const PERMISSION_RETRY_MIN_MS = toNumber(process.env.PERMISSION_RETRY_MIN_MS, 1400);
const SCREEN_MAX_BUFFER_ROWS = toNumber(process.env.SCREEN_MAX_BUFFER_ROWS, 420);
const SCREEN_MAX_COLS = toNumber(process.env.SCREEN_MAX_COLS, 260);
const SCREEN_CAPTURE_LINES = toNumber(process.env.SCREEN_CAPTURE_LINES, 140);
const MENU_SELECT_MIN_MS = toNumber(process.env.MENU_SELECT_MIN_MS, 280);
const MENU_CONFIRM_MIN_MS = toNumber(process.env.MENU_CONFIRM_MIN_MS, 650);
const MENU_FALLBACK_AFTER_SELECTS = toNumber(process.env.MENU_FALLBACK_AFTER_SELECTS, 2);
const QUICK_RECHECK_MS = toNumber(process.env.QUICK_RECHECK_MS, 220);
const DIALOG_BOTTOM_WINDOW_LINES = toNumber(process.env.DIALOG_BOTTOM_WINDOW_LINES, 36);
const DIALOG_CONTEXT_LINES = toNumber(process.env.DIALOG_CONTEXT_LINES, 6);
const CHAT_PROMPT_WINDOW_LINES = toNumber(process.env.CHAT_PROMPT_WINDOW_LINES, 8);
const MENU_ACTION_LIMIT = toNumber(process.env.MENU_ACTION_LIMIT, 6);
const MENU_NAV_MAX_ATTEMPTS = toNumber(process.env.MENU_NAV_MAX_ATTEMPTS, 4);
const MENU_NUMERIC_MAX_ATTEMPTS = toNumber(process.env.MENU_NUMERIC_MAX_ATTEMPTS, 1);
const MENU_CONFIRM_MAX_ATTEMPTS = toNumber(process.env.MENU_CONFIRM_MAX_ATTEMPTS, 2);

const AUTO_CONTINUE_MODE = ((process.env.AUTO_CONTINUE_MODE || 'prompt_only').trim().toLowerCase());
const AUTO_CONTINUE_ON_CAPACITY = isEnabled(process.env.AUTO_CONTINUE_ON_CAPACITY, true);
const AUTO_ALLOW_SESSION_PERMISSIONS = isEnabled(process.env.AUTO_ALLOW_SESSION_PERMISSIONS, true);
const AUTO_DISABLE_ON_USAGE_LIMIT = isEnabled(process.env.AUTO_DISABLE_ON_USAGE_LIMIT, true);
const AUTOMATION_DEFAULT_ENABLED = isEnabled(process.env.AUTOMATION_ENABLED, true);
const NEVER_SWITCH = isEnabled(process.env.NEVER_SWITCH, false);
const DEBUG_AUTOMATION = isEnabled(process.env.DEBUG_AUTOMATION, false);
const DEBUG_LAUNCH = isEnabled(process.env.DEBUG_LAUNCH, false);
const QUIET_CHILD_NODE_WARNINGS = isEnabled(process.env.QUIET_CHILD_NODE_WARNINGS, true);
const SET_HOME_TO_ISO = isEnabled(process.env.PTY_SET_HOME_TO_ISO, false);
const RAW_OUTPUT = isEnabled(process.env.RAW_OUTPUT, false);
const RESUME_DEFAULT = isEnabled(process.env.RESUME_LATEST, true);

const GEMINI_WRAPPER_ENV = process.env.GEMINI_WRAPPER || DEFAULT_WRAPPER;
const GEMINI_WRAPPER_ARGS = parseJsonArrayEnv(process.env.GEMINI_WRAPPER_ARGS_JSON);
const ISO_HOME =
  process.env.GEMINI_ISO_HOME ||
  process.env.GEMINI_PREVIEW_ISO_HOME ||
  DEFAULT_ISO_HOME;

// Shell fallback should be clean and non-login by default so user zsh startup files
// cannot break the child with stray output or errors.
const SHELL_EXECUTABLE = resolveExecutable(
  process.env.PTY_SHELL_EXECUTABLE || process.env.PTY_SHELL || '/bin/sh'
);
const WRAPPER_LAUNCH_MODE = ((process.env.WRAPPER_LAUNCH_MODE || 'auto').trim().toLowerCase());

const DEFAULT_HOTKEY_PREFIX = process.platform === 'darwin' ? 'ctrl-g' : 'ctrl-]';
const HOTKEY_PREFIX_NAME = (process.env.HOTKEY_PREFIX || DEFAULT_HOTKEY_PREFIX).trim().toLowerCase();
const { byte: HOTKEY_PREFIX_BYTE, label: HOTKEY_PREFIX_LABEL } = resolveHotkeyPrefix(HOTKEY_PREFIX_NAME);

const CONTINUE_COMMAND = process.env.CONTINUE_COMMAND || 'continue';
const PERMISSION_OPTION_LABEL = (process.env.PERMISSION_OPTION_LABEL || 'allow for this session').trim().toLowerCase();
const KEEP_LABELS = splitListEnv(process.env.KEEP_OPTION_LABELS, [
  'keep trying',
  'try again',
  'continue waiting',
]);
const SWITCH_LABELS = splitListEnv(process.env.SWITCH_OPTION_LABELS, [
  'switch to',
  'switch model',
  'change model',
  'use gemini',
]);
const STOP_LABELS = splitListEnv(process.env.STOP_OPTION_LABELS, ['stop']);

// -----------------------------------------------------------------------------
// Runtime state
// -----------------------------------------------------------------------------

let loadedPty = null;
let loadedPtyModuleName = null;
let activePty = null;
let activeDisposables = [];
let shuttingDown = false;
let resumeEnabledThisRun = RESUME_DEFAULT;
let modelIndex = 0;
let activeRunId = 0;
let lastLaunchPlan = null;

let rawTail = '';
let normalizedTail = '';
let stateGeneration = 0;
let currentSnapshot = makeSnapshot('normal');
let sawNoResumeSession = false;

let automationEnabled = AUTOMATION_DEFAULT_ENABLED;
let automationDisabledReason = automationEnabled ? '' : 'manual';
let automationPausedUntil = 0;

let hotkeyAwaitingCommand = false;
let hotkeyTimer = null;
let stdinBound = false;
let resizeBound = false;

let continueTimer = null;
let restartTimer = null;
let forceKillTimer = null;
let automationResumeTimer = null;
let staticRecheckTimer = null;

let demandHits = 0;
let lastDemandTs = 0;
let lastCapacityAt = 0;
let autoContinueAttempts = 0;
let autoRestartHistory = [];
let plannedAction = null;
let switching = false;
let menuPlan = null;
let screenModel = null;

// Recently attempted actions keyed by `${kind}:${fingerprint}` with timestamps
const recentActionKeys = new Map();

const IS_MAIN = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (IS_MAIN) {
  main().catch((error) => {
    failWithCleanup(error instanceof Error ? error : new Error(String(error)));
  });
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main() {
  validateConfig();
  fs.mkdirSync(ISO_HOME, { recursive: true });
  screenModel = new VirtualScreen(SCREEN_MAX_BUFFER_ROWS, SCREEN_MAX_COLS);

  const { pty, moduleName } = await loadPtyModule();
  loadedPty = pty;
  loadedPtyModuleName = moduleName;

  bindUserInput();
  bindResizeHandling();
  bindProcessCleanup();

  spawnGemini();
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

      return { pty: candidate, moduleName };
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

function spawnGemini() {
  if (!loadedPty) throw new Error('PTY module has not been loaded.');

  clearAllTimers();
  disposeActiveListeners();
  activePty = null;
  plannedAction = null;
  switching = false;

  activeRunId += 1;
  screenModel?.reset();
  clearMenuPlan();
  rawTail = '';
  normalizedTail = '';
  demandHits = 0;
  lastDemandTs = 0;
  lastCapacityAt = 0;
  autoContinueAttempts = 0;
  sawNoResumeSession = false;
  stateGeneration = 0;
  currentSnapshot = makeSnapshot('normal');
  recentActionKeys.clear();

  if (automationDisabledReason === 'usage_limit') {
    automationEnabled = AUTOMATION_DEFAULT_ENABLED;
    automationDisabledReason = automationEnabled ? '' : 'manual';
  }

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
    ptyProcess = loadedPty.spawn(launchPlan.file, launchPlan.args, buildPtyOptions(env));
  } catch (error) {
    const fallback = maybeBuildFallbackLaunchPlan(error, wrapperInfo, launchArgs, launchPlan);
    if (!fallback) {
      throw wrapSpawnError(error, wrapperInfo, launchPlan);
    }
    lastLaunchPlan = fallback;
    console.error(`[${FLAVOR_LABEL}] Direct spawn failed, retrying via clean shell exec: ${error instanceof Error ? error.message : String(error)}`);
    ptyProcess = loadedPty.spawn(fallback.file, fallback.args, buildPtyOptions(env));
  }

  activePty = ptyProcess;
  const runId = activeRunId;

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
      clearAllTimers();
      disposeActiveListeners();
      handleChildExit({ runId, exitCode, signal });
    })
  );
}

function buildPtyOptions(env) {
  return {
    name: process.env.TERM || 'xterm-256color',
    cols: getTerminalColumns(),
    rows: getTerminalRows(),
    cwd: process.cwd(),
    env,
  };
}

// -----------------------------------------------------------------------------
// Launch planning
// -----------------------------------------------------------------------------

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
    if (typeof value === 'string') env[key] = value;
  }

  env.GEMINI_ISO_HOME = ISO_HOME;
  env.GEMINI_PREVIEW_ISO_HOME = ISO_HOME;
  if (SET_HOME_TO_ISO) env.HOME = ISO_HOME;
  if (QUIET_CHILD_NODE_WARNINGS && !env.NODE_NO_WARNINGS) {
    env.NODE_NO_WARNINGS = '1';
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

function buildLaunchPlan(wrapperInfo, launchArgs) {
  if (WRAPPER_LAUNCH_MODE === 'shell') return makeShellLaunchPlan(wrapperInfo, launchArgs);
  if (WRAPPER_LAUNCH_MODE === 'direct') return makeDirectLaunchPlan(wrapperInfo, launchArgs);

  if (wrapperInfo.kind === 'script' || wrapperInfo.hasCRLFShebang || !wrapperInfo.isExecutable) {
    return makeShellLaunchPlan(wrapperInfo, launchArgs);
  }

  return makeDirectLaunchPlan(wrapperInfo, launchArgs);
}

function maybeBuildFallbackLaunchPlan(error, wrapperInfo, launchArgs, currentPlan) {
  if (currentPlan.mode === 'shell') return null;
  const message = error instanceof Error ? error.message : String(error);
  if (/posix_spawnp failed/i.test(message) || /ENOENT|EACCES|ENOEXEC/i.test(message)) {
    return makeShellLaunchPlan(wrapperInfo, launchArgs);
  }
  return null;
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
    file: SHELL_EXECUTABLE,
    args: ['-c', command],
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

  if (!resolved.exists || !resolved.resolvedPath) return result;

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

    result.kind = /^[\x00-\x7F]*$/.test(sample) ? 'text' : 'binary';
  } catch (error) {
    result.readError = error instanceof Error ? error.message : String(error);
  }

  return result;
}

function resolveExecutableDetailed(cmd, pathEnv) {
  const result = { resolvedPath: null, exists: false, isExecutable: false };
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

function resolveExecutable(cmd) {
  const pathEnv = process.env.PATH || '';
  return resolveExecutableDetailed(cmd, pathEnv).resolvedPath || cmd;
}

function wrapSpawnError(error, wrapperInfo, launchPlan) {
  const parts = [
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

  if (wrapperInfo.shebang) parts.push(`Shebang: ${wrapperInfo.shebang}${wrapperInfo.hasCRLFShebang ? ' [CRLF detected]' : ''}`);
  if (!wrapperInfo.exists) parts.push('Hint: wrapper not found. Check GEMINI_WRAPPER and PATH.');
  else if (!wrapperInfo.isExecutable) parts.push('Hint: wrapper exists but is not executable. Try chmod +x <wrapper>.');
  else if (wrapperInfo.hasCRLFShebang) parts.push('Hint: wrapper shebang has CRLF. Convert it to LF.');
  else if (wrapperInfo.kind === 'script') parts.push('Hint: script wrappers are more reliable through clean shell exec mode.');

  return new Error(parts.join('\n'));
}

function logLaunchBanner({ model, canResume, wrapperInfo, launchPlan }) {
  const lines = [
    `\n[${FLAVOR_LABEL}] Launching model: ${model}${canResume ? ' (resuming latest)' : ' (fresh)'}${RAW_OUTPUT ? ' [raw-output]' : ''}`,
    `[${FLAVOR_LABEL}] Flavor: ${CLI_FLAVOR}`,
    `[${FLAVOR_LABEL}] ISO home: ${ISO_HOME}`,
    `[${FLAVOR_LABEL}] Wrapper request: ${GEMINI_WRAPPER_ENV}`,
    `[${FLAVOR_LABEL}] Wrapper resolved: ${wrapperInfo.resolvedPath || '(not found on PATH yet)'}${wrapperInfo.exists ? '' : ' [missing]'}`,
    `[${FLAVOR_LABEL}] Wrapper kind: ${wrapperInfo.kind}`,
    `[${FLAVOR_LABEL}] Launch mode: ${launchPlan.mode}`,
    `[${FLAVOR_LABEL}] Shell fallback executable: ${SHELL_EXECUTABLE}`,
    `[${FLAVOR_LABEL}] Auto-continue mode: ${AUTO_CONTINUE_MODE}`,
    `[${FLAVOR_LABEL}] Auto-approve session permissions: ${AUTO_ALLOW_SESSION_PERMISSIONS ? 'ON' : 'OFF'}`,
    `[${FLAVOR_LABEL}] PTY backend: ${loadedPtyModuleName}`,
    `[${FLAVOR_LABEL}] Local controls: ${HOTKEY_PREFIX_LABEL} h help, ${HOTKEY_PREFIX_LABEL} a toggle auto, ${HOTKEY_PREFIX_LABEL} s switch model, ${HOTKEY_PREFIX_LABEL} q quit`,
  ];

  if (wrapperInfo.kind === 'script' && wrapperInfo.shebang) {
    lines.push(`[${FLAVOR_LABEL}] Script shebang: ${wrapperInfo.shebang}${wrapperInfo.hasCRLFShebang ? ' [CRLF detected]' : ''}`);
  }
  if (QUIET_CHILD_NODE_WARNINGS) {
    lines.push(`[${FLAVOR_LABEL}] Child Node warnings: suppressed`);
  }
  if (DEBUG_LAUNCH) {
    lines.push(`[${FLAVOR_LABEL}] Launch file: ${launchPlan.file}`);
    lines.push(`[${FLAVOR_LABEL}] Launch args: ${JSON.stringify(launchPlan.args)}`);
  }

  console.error(lines.join('\n') + '\n');
}

// -----------------------------------------------------------------------------
// Terminal parsing and detection
// -----------------------------------------------------------------------------

function handleTerminalData(runId, chunk) {
  screenModel?.feed(chunk);

  rawTail += chunk;
  if (rawTail.length > RAW_TAIL_MAX) rawTail = rawTail.slice(-RAW_TAIL_MAX);
  normalizedTail = normalizeTerminalText(rawTail);
  if (normalizedTail.length > NORMALIZED_TAIL_MAX) normalizedTail = normalizedTail.slice(-NORMALIZED_TAIL_MAX);

  if (/no\s+previous\s+sessions\s+found/i.test(normalizedTail)) {
    sawNoResumeSession = true;
  }

  const snapshot = detectCurrentSnapshot();
  updateCurrentSnapshot(snapshot);
  maybeAutomate(runId, snapshot);
}

function normalizeTerminalText(input) {
  const trimmed = stripTrailingIncompleteEscape(input);
  let text = trimmed
    // OSC ... BEL or ESC \
    .replace(/\u001B\][^\u0007\u001B]*(?:\u0007|\u001B\\)/g, '')
    // CSI
    .replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '')
    // DCS/PM/APC/SOS terminated by ST or BEL (best-effort)
    .replace(/\u001B[PX^_][\s\S]*?(?:\u0007|\u001B\\)/g, '')
    // Two-byte escape sequences and stray ESC-prefixed controls
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

function stripTrailingIncompleteEscape(text) {
  const lastEsc = text.lastIndexOf('\u001B');
  if (lastEsc < 0) return text;
  const suffix = text.slice(lastEsc);
  if (isCompleteEscapeSequence(suffix)) return text;
  return text.slice(0, lastEsc);
}

function isCompleteEscapeSequence(suffix) {
  if (!suffix.startsWith('\u001B')) return true;
  if (suffix === '\u001B') return false;

  if (suffix.startsWith('\u001B[')) {
    return /\u001B\[[0-?]*[ -/]*[@-~]$/.test(suffix);
  }

  if (suffix.startsWith('\u001B]')) {
    return /(?:\u0007|\u001B\\)$/.test(suffix);
  }

  if (suffix.startsWith('\u001BP') || suffix.startsWith('\u001B^') || suffix.startsWith('\u001B_')) {
    return /(?:\u0007|\u001B\\)$/.test(suffix);
  }

  return suffix.length >= 2;
}

function detectCurrentSnapshot() {
  const screenText = screenModel?.renderText(SCREEN_CAPTURE_LINES) || '';
  const screenSnapshot = detectSnapshotFromText(screenText, 'screen');
  if (screenSnapshot.kind !== 'normal') return screenSnapshot;

  const rawSnapshot = detectSnapshotFromText(normalizedTail.slice(-NORMALIZED_TAIL_MAX), 'raw');
  if (rawSnapshot.kind !== 'normal') return rawSnapshot;

  return screenSnapshot;
}

function detectSnapshotFromText(text, source) {
  const rawLines = String(text || '').split('\n').slice(-SCREEN_CAPTURE_LINES).map((line) => line.replace(/\s+$/g, ''));
  const tail = rawLines.join('\n').slice(-NORMALIZED_TAIL_MAX);
  const menuBlocks = extractMenuBlocks(rawLines);
  const chatPromptActive = detectChatPromptActive(rawLines);

  const permissionBlock = findPermissionMenuBlock(rawLines, menuBlocks, chatPromptActive);
  if (permissionBlock) {
    const allowSession = permissionBlock.options.find((option) => option.canonical.includes(PERMISSION_OPTION_LABEL));
    if (allowSession) {
      return {
        kind: 'permission',
        source,
        reason: 'permission prompt',
        targetOption: allowSession,
        targetOptionText: allowSession.numberText,
        targetSelected: allowSession.selected,
        selectedOption: permissionBlock.selectedOption,
        fingerprint: fingerprintFromBlock(permissionBlock, ['action required', 'allow execution of:', allowSession.canonical]),
        options: permissionBlock.options,
        blockStart: permissionBlock.start,
        blockEnd: permissionBlock.end,
        chatPromptActive,
        blockMode: permissionBlock.mode,
      };
    }
  }

  const recentLines = rawLines.slice(-Math.max(12, DIALOG_BOTTOM_WINDOW_LINES));
  const recentTail = recentLines.join('\n');
  const usagePatterns = [
    /you(?:'ve| have)\s+(?:reached|hit)\s+(?:your\s+)?(?:usage|quota|request|rate)\s+limit/i,
    /usage\s+limit\s+reached/i,
    /quota\s+(?:reached|exceeded|used\s+up)/i,
    /rate\s+limit\s+exceeded/i,
    /try\s+again\s+(?:later|tomorrow)/i,
    /come\s+back\s+(?:later|tomorrow)/i,
  ];
  if (usagePatterns.some((pattern) => pattern.test(recentTail))) {
    return {
      kind: 'usage_limit',
      source,
      reason: 'usage limit reached',
      fingerprint: fingerprintFromLines(compactLines(recentTail), ['usage limit', 'quota', 'rate limit']),
      options: [],
      chatPromptActive,
    };
  }

  const capacityPatterns = [
    /we\s+are\s+currently\s+experiencing\s+high\s+demand/i,
    /no\s+capacity\s+available/i,
    /high\s+demand\s+right\s+now/i,
    /temporarily\s+unavailable/i,
  ];

  const hasCapacity = capacityPatterns.some((pattern) => pattern.test(recentTail));

  const capacityBlock = hasCapacity ? findCapacityMenuBlock(rawLines, menuBlocks, chatPromptActive) : null;
  if (capacityBlock) {
    const keepOption = findMenuOption(capacityBlock.options, KEEP_LABELS);
    const switchOption = findMenuOption(capacityBlock.options, SWITCH_LABELS);
    const stopOption = findMenuOption(capacityBlock.options, STOP_LABELS);
    if (keepOption) {
      return {
        kind: 'capacity_menu',
        source,
        reason: 'capacity menu',
        keepOption,
        keepOptionText: keepOption.numberText,
        keepSelected: keepOption.selected,
        switchOption: switchOption || null,
        switchOptionText: switchOption?.numberText || '',
        stopOptionText: stopOption?.numberText || '',
        selectedOption: capacityBlock.selectedOption,
        fingerprint: fingerprintFromBlock(capacityBlock, [
          keepOption.canonical,
          switchOption?.canonical || '',
          stopOption?.canonical || '',
          'high demand',
          'no capacity',
        ]),
        options: capacityBlock.options,
        blockStart: capacityBlock.start,
        blockEnd: capacityBlock.end,
        chatPromptActive,
        blockMode: capacityBlock.mode,
      };
    }
  }

  if (!hasCapacity) return makeSnapshot('normal', source);

  const continuePrompt = detectContinuePrompt(recentTail);
  if (continuePrompt) {
    return {
      kind: 'capacity_continue',
      source,
      reason: continuePrompt.reason,
      continueAction: continuePrompt.action,
      fingerprint: fingerprintFromLines(compactLines(recentTail), [continuePrompt.anchor]),
      options: [],
      chatPromptActive,
    };
  }

  return {
    kind: 'capacity_info',
    source,
    reason: 'capacity info',
    fingerprint: fingerprintFromLines(compactLines(recentTail), ['high demand', 'no capacity']),
    options: [],
    chatPromptActive,
  };
}

function makeSnapshot(kind, source = 'none') {
  return {
    kind,
    source,
    reason: kind,
    fingerprint: `${source}:${kind}`,
    options: [],
  };
}

function compactLines(text) {
  const rawLines = String(text || '').split('\n').slice(-180);
  const out = [];
  for (const raw of rawLines) {
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;
    if (out[out.length - 1] === cleaned) continue;
    out.push(cleaned);
  }
  return out;
}

function parseOptionLine(rawLine, index) {
  const trimmedRight = String(rawLine || '').replace(/\s+$/g, '');
  if (!trimmedRight) return null;

  const withoutBox = trimmedRight.replace(/^[│║┃|\s]+/u, '');
  const selected = /^[•●◦○▪◆▶➜»›>*-]+\s*/u.test(withoutBox);
  const stripped = withoutBox.replace(/^[•●◦○▪◆▶➜»›>*-]+\s*/u, '').trim();
  const match = stripped.match(/^(\d+)\s*[.):-]?\s+(.+)$/u);
  if (!match) return null;

  const canonical = normalizeLabel(match[2]);
  if (!canonical) return null;

  return {
    index,
    numberText: match[1],
    label: match[2].trim(),
    canonical,
    raw: rawLine,
    selected,
  };
}

function extractMenuBlocks(rawLines) {
  const indexedOptions = [];
  for (let index = 0; index < rawLines.length; index += 1) {
    const option = parseOptionLine(rawLines[index], index);
    if (option) indexedOptions.push(option);
  }
  if (indexedOptions.length === 0) return [];

  const groups = [];
  let current = [indexedOptions[0]];
  for (let i = 1; i < indexedOptions.length; i += 1) {
    const prev = current[current.length - 1];
    const next = indexedOptions[i];
    if (next.index - prev.index <= 2) {
      current.push(next);
      continue;
    }
    groups.push(current);
    current = [next];
  }
  groups.push(current);

  return groups.map((options) => {
    const start = Math.max(0, options[0].index - DIALOG_CONTEXT_LINES);
    const end = Math.min(rawLines.length - 1, options[options.length - 1].index + DIALOG_CONTEXT_LINES);
    const contextLines = rawLines.slice(start, end + 1);
    const selectedOption = options.find((option) => option.selected) || null;
    return {
      start,
      end,
      options,
      contextLines,
      selectedOption,
      mode: selectedOption ? 'radio' : 'plain',
    };
  });
}

function normalizeLabel(text) {
  return String(text)
    .toLowerCase()
    .replace(/^[?]+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectChatPromptActive(rawLines) {
  const window = rawLines.slice(-Math.max(2, CHAT_PROMPT_WINDOW_LINES));
  return window.some((line) => {
    const trimmed = String(line || '').trim();
    return /^>\s*$/.test(trimmed) || /^>\s+.+/.test(trimmed);
  });
}

function isBlockNearBottom(block, totalLines) {
  return block.end >= Math.max(0, totalLines - DIALOG_BOTTOM_WINDOW_LINES);
}

function isActionableDialogBlock(block, totalLines, chatPromptActive) {
  if (!isBlockNearBottom(block, totalLines)) return false;
  if (chatPromptActive && block.end < totalLines - 4) return false;
  return true;
}

function findPermissionMenuBlock(rawLines, blocks, chatPromptActive) {
  for (const block of blocks) {
    if (!isActionableDialogBlock(block, rawLines.length, chatPromptActive)) continue;
    const target = findMenuOption(block.options, [PERMISSION_OPTION_LABEL]);
    if (!target) continue;

    const context = block.contextLines.map((line) => normalizeLabel(line)).join(' | ');
    const hasAnchor =
      context.includes('allow execution of:') ||
      context.includes('action required') ||
      context.includes('toggle auto-edit') ||
      context.includes('tip: toggle auto-edit');
    const hasSiblingPermissionOption = block.options.some((option) =>
      /allow once|suggest changes|allow for this session/.test(option.canonical)
    );
    const hasSelectionCue = Boolean(block.selectedOption) || /[•●◦○▪◆▶➜»›]/u.test(block.contextLines.join('\n'));

    if (hasAnchor && hasSiblingPermissionOption && hasSelectionCue) return block;
  }
  return null;
}

function findCapacityMenuBlock(rawLines, blocks, chatPromptActive) {
  for (const block of blocks) {
    if (!isActionableDialogBlock(block, rawLines.length, chatPromptActive)) continue;
    const keepOption = findMenuOption(block.options, KEEP_LABELS);
    if (!keepOption) continue;

    const context = block.contextLines.map((line) => normalizeLabel(line)).join(' | ');
    const hasCapacityAnchor =
      context.includes('high demand') ||
      context.includes('no capacity') ||
      context.includes('temporarily unavailable') ||
      context.includes('currently experiencing');
    const hasSelectionCue = Boolean(block.selectedOption) || /[•●◦○▪◆▶➜»›]/u.test(block.contextLines.join('\n'));
    if (hasCapacityAnchor && hasSelectionCue) return block;
  }
  return null;
}

function findMenuOption(options, labels) {
  const normalizedLabels = labels.map(normalizeLabel).filter(Boolean);
  for (const option of options) {
    for (const label of normalizedLabels) {
      if (option.canonical === label) return option;
      if (option.canonical.includes(label)) return option;
    }
  }
  return null;
}

function detectContinuePrompt(tail) {
  const patterns = [
    {
      action: 'command',
      reason: 'continue prompt',
      anchor: 'type continue',
      match:
        /(?:(?:type|enter|send|write)\s+["'`]?continue["'`]?\s+(?:to|for)\b[^\n]*|(?:to|for)\s+(?:keep\s+trying|continue\s+waiting|retry)[^\n]*\btype\s+["'`]?continue["'`]?)/i,
    },
    {
      action: 'enter',
      reason: 'press enter prompt',
      anchor: 'press enter',
      match:
        /(?:(?:press|hit)\s+(?:enter|return)\s+(?:to|for)\b[^\n]*(?:keep\s+trying|continue\s+waiting|retry|try\s+again)|(?:keep\s+trying|continue\s+waiting|retry|try\s+again)[^\n]*(?:press|hit)\s+(?:enter|return))/i,
    },
  ];

  for (const pattern of patterns) {
    if (pattern.match.test(tail)) return pattern;
  }
  return null;
}

function fingerprintFromLines(lines, anchors) {
  const usableAnchors = anchors.map((anchor) => normalizeLabel(anchor)).filter(Boolean);
  const selected = [];
  for (const line of lines.slice(-60)) {
    const canonical = normalizeLabel(line);
    if (!canonical) continue;
    if (usableAnchors.length === 0 || usableAnchors.some((anchor) => canonical.includes(anchor))) {
      selected.push(canonical);
    }
  }
  if (selected.length === 0) {
    return lines.slice(-10).map((line) => normalizeLabel(line)).filter(Boolean).join(' | ');
  }
  return selected.join(' | ');
}

function fingerprintFromBlock(block, anchors) {
  return fingerprintFromLines(block.contextLines, anchors);
}

function updateCurrentSnapshot(next) {
  const prev = currentSnapshot;
  if (prev.kind !== next.kind || prev.fingerprint !== next.fingerprint) {
    currentSnapshot = next;
    stateGeneration += 1;
    clearContinueTimer();
    clearMenuPlan();
    if (DEBUG_AUTOMATION) {
      console.error(`[${FLAVOR_LABEL}][state] ${prev.kind}/${prev.source} -> ${next.kind}/${next.source} (#${stateGeneration}) ${next.fingerprint}`);
    }
    if (next.kind !== 'capacity_menu') {
      demandHits = 0;
      lastDemandTs = 0;
    }
    if (next.kind !== 'capacity_continue') {
      autoContinueAttempts = 0;
    }
    recentActionKeys.clear();
    return;
  }
  currentSnapshot = next;
}

class VirtualScreen {
  constructor(maxRows, maxCols) {
    this.maxRows = Math.max(40, maxRows || 400);
    this.maxCols = Math.max(80, maxCols || 240);
    this.reset();
  }

  reset() {
    this.lines = [[]];
    this.row = 0;
    this.col = 0;
    this.savedRow = 0;
    this.savedCol = 0;
    this.carry = '';
  }

  feed(chunk) {
    const input = this.carry + String(chunk || '');
    this.carry = '';

    for (let i = 0; i < input.length; i += 1) {
      const ch = input[i];
      if (ch === '\u001B') {
        const consumed = this.handleEscape(input, i);
        if (consumed == null) {
          this.carry = input.slice(i);
          break;
        }
        i += consumed - 1;
        continue;
      }

      if (ch === '\r') {
        this.col = 0;
        continue;
      }
      if (ch === '\n') {
        this.row += 1;
        this.ensureRow(this.row);
        this.trimOverflow();
        continue;
      }
      if (ch === '\b') {
        this.col = Math.max(0, this.col - 1);
        continue;
      }
      if (ch === '\t') {
        const spaces = 4 - (this.col % 4 || 0);
        for (let s = 0; s < spaces; s += 1) this.writeChar(' ');
        continue;
      }
      if (ch < ' ' || ch === '\u007F') continue;

      this.writeChar(ch);
    }
  }

  handleEscape(text, start) {
    if (start + 1 >= text.length) return null;
    const next = text[start + 1];

    if (next === '[') return this.handleCsi(text, start);
    if (next === ']') return this.skipTerminatedEscape(text, start, 2);
    if (next === 'P' || next === '^' || next === '_') return this.skipTerminatedEscape(text, start, 2);
    if (next === '7') {
      this.savedRow = this.row;
      this.savedCol = this.col;
      return 2;
    }
    if (next === '8') {
      this.row = this.savedRow;
      this.col = this.savedCol;
      this.ensureRow(this.row);
      return 2;
    }

    return 2;
  }

  skipTerminatedEscape(text, start, prefixLength) {
    for (let i = start + prefixLength; i < text.length; i += 1) {
      if (text[i] === '\u0007') return i - start + 1;
      if (text[i] === '\u001B' && text[i + 1] === '\\') return i - start + 2;
    }
    return null;
  }

  handleCsi(text, start) {
    let end = start + 2;
    while (end < text.length) {
      const code = text.charCodeAt(end);
      if (code >= 0x40 && code <= 0x7E) break;
      end += 1;
    }
    if (end >= text.length) return null;

    const final = text[end];
    const paramsRaw = text.slice(start + 2, end);
    this.applyCsi(final, paramsRaw);
    return end - start + 1;
  }

  applyCsi(final, paramsRaw) {
    const privateMode = paramsRaw.startsWith('?');
    const clean = privateMode ? paramsRaw.slice(1) : paramsRaw;
    const parts = clean.length === 0
      ? []
      : clean.split(';').map((part) => {
          const value = Number(part);
          return Number.isFinite(value) ? value : undefined;
        });
    const p = (index, fallback = 1) => {
      const value = parts[index];
      return Number.isFinite(value) ? value : fallback;
    };

    switch (final) {
      case 'A':
        this.row = Math.max(0, this.row - p(0));
        break;
      case 'B':
        this.row += p(0);
        this.ensureRow(this.row);
        this.trimOverflow();
        break;
      case 'C':
        this.col = Math.min(this.maxCols - 1, this.col + p(0));
        break;
      case 'D':
        this.col = Math.max(0, this.col - p(0));
        break;
      case 'E':
        this.row += p(0);
        this.col = 0;
        this.ensureRow(this.row);
        this.trimOverflow();
        break;
      case 'F':
        this.row = Math.max(0, this.row - p(0));
        this.col = 0;
        break;
      case 'G':
        this.col = Math.max(0, Math.min(this.maxCols - 1, p(0) - 1));
        break;
      case 'H':
      case 'f':
        this.row = Math.max(0, p(0) - 1);
        this.col = Math.max(0, Math.min(this.maxCols - 1, p(1, 1) - 1));
        this.ensureRow(this.row);
        this.trimOverflow();
        break;
      case 'J':
        this.eraseScreen(p(0, 0));
        break;
      case 'K':
        this.eraseLine(p(0, 0));
        break;
      case 'P':
        this.deleteChars(p(0));
        break;
      case 'X':
        this.eraseChars(p(0));
        break;
      case '@':
        this.insertBlankChars(p(0));
        break;
      case 's':
        this.savedRow = this.row;
        this.savedCol = this.col;
        break;
      case 'u':
        this.row = this.savedRow;
        this.col = this.savedCol;
        this.ensureRow(this.row);
        break;
      case 'h':
      case 'l':
        if (privateMode && /^(?:1047|1048|1049)$/.test(clean)) {
          this.lines = [[]];
          this.row = 0;
          this.col = 0;
        }
        break;
      default:
        break;
    }
  }

  writeChar(ch) {
    if (this.col >= this.maxCols) return;
    this.ensureRow(this.row);
    const line = this.lines[this.row];
    while (line.length < this.col) line.push(' ');
    line[this.col] = ch;
    this.col += 1;
  }

  ensureRow(row) {
    while (this.lines.length <= row) this.lines.push([]);
  }

  trimOverflow() {
    if (this.lines.length <= this.maxRows) return;
    const overflow = this.lines.length - this.maxRows;
    this.lines.splice(0, overflow);
    this.row = Math.max(0, this.row - overflow);
    this.savedRow = Math.max(0, this.savedRow - overflow);
  }

  eraseLine(mode) {
    this.ensureRow(this.row);
    const line = this.lines[this.row];
    if (mode === 2) {
      this.lines[this.row] = [];
      return;
    }
    if (mode === 1) {
      for (let i = 0; i <= this.col && i < line.length; i += 1) line[i] = ' ';
      return;
    }
    line.length = Math.min(line.length, this.col);
  }

  eraseScreen(mode) {
    if (mode === 2) {
      this.lines = [[]];
      this.row = 0;
      this.col = 0;
      return;
    }

    this.ensureRow(this.row);
    if (mode === 1) {
      for (let r = 0; r < this.row; r += 1) this.lines[r] = [];
      const line = this.lines[this.row];
      for (let i = 0; i <= this.col && i < line.length; i += 1) line[i] = ' ';
      return;
    }

    this.eraseLine(0);
    for (let r = this.row + 1; r < this.lines.length; r += 1) this.lines[r] = [];
  }

  deleteChars(count) {
    this.ensureRow(this.row);
    const line = this.lines[this.row];
    line.splice(this.col, Math.max(1, count));
  }

  eraseChars(count) {
    this.ensureRow(this.row);
    const line = this.lines[this.row];
    for (let i = 0; i < Math.max(1, count); i += 1) {
      const index = this.col + i;
      if (index >= line.length) break;
      line[index] = ' ';
    }
  }

  insertBlankChars(count) {
    this.ensureRow(this.row);
    const line = this.lines[this.row];
    line.splice(this.col, 0, ...Array.from({ length: Math.max(1, count) }, () => ' '));
    if (line.length > this.maxCols) line.length = this.maxCols;
  }

  renderText(maxLines = 120) {
    const slice = this.lines.slice(-Math.max(20, maxLines));
    const rendered = slice
      .map((line) => line.join('').replace(/\s+$/g, ''))
      .filter((line, index, arr) => !(line === '' && index === 0 && arr.length > 1));
    return rendered.join('\n');
  }
}
// -----------------------------------------------------------------------------
// Automation engine
// -----------------------------------------------------------------------------

function maybeAutomate(runId, snapshot) {
  if (!isAutomationActive()) {
    clearContinueTimer();
    clearStaticRecheckTimer();
    clearMenuPlan();
    return;
  }

  const responders = [
    handlePermissionSnapshot,
    handleUsageLimitSnapshot,
    handleCapacityMenuSnapshot,
    handleCapacityContinueSnapshot,
  ];

  for (const responder of responders) {
    if (responder(runId, snapshot)) {
      scheduleStaticRecheck();
      return;
    }
  }

  clearContinueTimer();
  clearMenuPlan();
  scheduleStaticRecheck();
}

function handlePermissionSnapshot(runId, snapshot) {
  if (snapshot.kind !== 'permission') return false;
  clearContinueTimer();
  if (!AUTO_ALLOW_SESSION_PERMISSIONS) return true;

  return runMenuPlanForOption(runId, snapshot, snapshot.targetOption, 'allow-for-this-session');
}

function handleUsageLimitSnapshot(_runId, snapshot) {
  if (snapshot.kind !== 'usage_limit') return false;
  clearContinueTimer();
  clearStaticRecheckTimer();
  clearMenuPlan();
  if (AUTO_DISABLE_ON_USAGE_LIMIT && automationEnabled) {
    setAutomationEnabled(false, 'usage_limit');
    console.error(`\n[${FLAVOR_LABEL}] Usage limit detected — automation paused. ${hotkeySummary()}\n`);
  }
  return true;
}

function handleCapacityMenuSnapshot(runId, snapshot) {
  if (snapshot.kind !== 'capacity_menu') return false;
  clearContinueTimer();

  const now = Date.now();
  if (lastCapacityAt > 0 && now - lastCapacityAt > CAPACITY_EVENT_RESET_MS) {
    demandHits = 0;
    autoContinueAttempts = 0;
  }
  lastCapacityAt = now;

  let targetOption = snapshot.keepOption;
  let label = `keep-trying ${Math.min(demandHits + 1, KEEP_TRY_MAX)}/${KEEP_TRY_MAX}`;

  if (!NEVER_SWITCH && snapshot.switchOption && demandHits >= KEEP_TRY_MAX) {
    targetOption = snapshot.switchOption;
    label = 'switch-model';
  }

  if (hasActiveMenuPlan(snapshot, targetOption)) {
    return runMenuPlanForOption(runId, snapshot, targetOption, label);
  }

  if (now - lastDemandTs < TRY_AGAIN_MIN_INTERVAL_MS) return true;

  lastDemandTs = now;
  demandHits += 1;

  if (NEVER_SWITCH || !snapshot.switchOptionText) {
    if (demandHits > KEEP_TRY_MAX) {
      pauseAutomationTemporarily(AUTOMATION_COOLDOWN_MS, 'keep-trying loop limit reached');
      return true;
    }
    return runMenuPlanForOption(runId, snapshot, snapshot.keepOption, `keep-trying ${demandHits}/${KEEP_TRY_MAX}`);
  }

  if (demandHits <= KEEP_TRY_MAX) {
    return runMenuPlanForOption(runId, snapshot, snapshot.keepOption, `keep-trying ${demandHits}/${KEEP_TRY_MAX}`);
  }

  switching = true;
  console.error(`\n[${FLAVOR_LABEL}] Capacity still busy on ${currentModel()} — switching model...\n`);
  return runMenuPlanForOption(runId, snapshot, snapshot.switchOption, 'switch-model');
}

function handleCapacityContinueSnapshot(runId, snapshot) {
  if (snapshot.kind !== 'capacity_continue' && snapshot.kind !== 'capacity_info') return false;
  clearMenuPlan();

  if (!AUTO_CONTINUE_ON_CAPACITY || AUTO_CONTINUE_MODE === 'off') {
    clearContinueTimer();
    return true;
  }

  const explicitOnly = !(AUTO_CONTINUE_MODE === 'capacity' || AUTO_CONTINUE_MODE === 'always');
  if (explicitOnly && snapshot.kind !== 'capacity_continue') {
    clearContinueTimer();
    return true;
  }

  scheduleContinueRetry(runId, snapshot);
  return true;
}

function runMenuPlanForOption(runId, snapshot, targetOption, label) {
  if (runId !== activeRunId || !activePty) return false;
  if (!targetOption?.numberText || !targetOption?.canonical) return true;

  const target = snapshot.options.find(
    (option) => option.numberText === targetOption.numberText && option.canonical === targetOption.canonical
  ) || targetOption;

  const plan = ensureMenuPlan(snapshot, target, label);
  if (plan.totalActions >= MENU_ACTION_LIMIT) {
    pauseAutomationTemporarily(AUTOMATION_COOLDOWN_MS, `${label} action limit reached`);
    return true;
  }

  const now = Date.now();
  const selected = snapshot.selectedOption || snapshot.options.find((option) => option.selected) || null;
  const selectedIndex = selected
    ? snapshot.options.findIndex(
        (option) => option.numberText === selected.numberText && option.canonical === selected.canonical
      )
    : -1;
  const targetIndex = snapshot.options.findIndex(
    (option) => option.numberText === target.numberText && option.canonical === target.canonical
  );

  if (target.selected) {
    if (plan.confirmAttempts >= MENU_CONFIRM_MAX_ATTEMPTS) {
      pauseAutomationTemporarily(AUTOMATION_COOLDOWN_MS, `${label} confirm limit reached`);
      return true;
    }
    if (now - plan.lastSentAt < MENU_CONFIRM_MIN_MS) return true;
    plan.phase = 'confirm';
    plan.confirmAttempts += 1;
    plan.totalActions += 1;
    plan.lastSentAt = now;
    rememberAction(`${snapshot.kind}:${snapshot.fingerprint}:confirm`);
    sendRaw('\r', `${label}:confirm-enter`);
    scheduleStaticRecheck(QUICK_RECHECK_MS);
    return true;
  }

  if (now - plan.lastSentAt < MENU_SELECT_MIN_MS) return true;

  if (selectedIndex >= 0 && targetIndex >= 0 && selectedIndex !== targetIndex) {
    if (plan.navAttempts >= MENU_NAV_MAX_ATTEMPTS) {
      pauseAutomationTemporarily(AUTOMATION_COOLDOWN_MS, `${label} navigation limit reached`);
      return true;
    }
    const delta = targetIndex - selectedIndex;
    const navSequence = delta > 0 ? '\u001B[B'.repeat(delta) : '\u001B[A'.repeat(-delta);
    if (!navSequence) return true;
    plan.phase = 'nav';
    plan.navAttempts += 1;
    plan.totalActions += 1;
    plan.lastSentAt = now;
    rememberAction(`${snapshot.kind}:${snapshot.fingerprint}:nav:${delta}`);
    sendRaw(navSequence, `${label}:arrow-focus`);
    scheduleStaticRecheck(QUICK_RECHECK_MS);
    return true;
  }

  const numericAllowed = snapshot.blockMode === 'radio' && !snapshot.chatPromptActive;
  if (numericAllowed && plan.numericAttempts < MENU_NUMERIC_MAX_ATTEMPTS) {
    plan.phase = 'numeric';
    plan.numericAttempts += 1;
    plan.totalActions += 1;
    plan.lastSentAt = now;
    rememberAction(`${snapshot.kind}:${snapshot.fingerprint}:numeric:${target.numberText}`);
    sendRaw(target.numberText, `${label}:select-number`);
    scheduleStaticRecheck(QUICK_RECHECK_MS);
    return true;
  }

  pauseAutomationTemporarily(AUTOMATION_COOLDOWN_MS, `${label} could not safely focus target option`);
  return true;
}

function ensureMenuPlan(snapshot, target, label) {
  if (
    !menuPlan ||
    menuPlan.kind !== snapshot.kind ||
    menuPlan.fingerprint !== snapshot.fingerprint ||
    menuPlan.targetNumberText !== target.numberText ||
    menuPlan.targetCanonical !== target.canonical
  ) {
    menuPlan = {
      kind: snapshot.kind,
      fingerprint: snapshot.fingerprint,
      targetNumberText: target.numberText,
      targetCanonical: target.canonical,
      targetLabel: target.canonical,
      label,
      phase: 'select',
      numericAttempts: 0,
      navAttempts: 0,
      confirmAttempts: 0,
      totalActions: 0,
      lastSentAt: 0,
      createdAt: Date.now(),
    };
  }
  return menuPlan;
}

function clearMenuPlan() {
  menuPlan = null;
}

function hasActiveMenuPlan(snapshot, targetOption) {
  return Boolean(
    menuPlan &&
      menuPlan.kind === snapshot.kind &&
      menuPlan.fingerprint === snapshot.fingerprint &&
      menuPlan.targetNumberText === targetOption?.numberText &&
      menuPlan.targetCanonical === targetOption?.canonical
  );
}

function scheduleContinueRetry(runId, snapshot) {
  if (continueTimer) return;
  if (autoContinueAttempts >= AUTO_CONTINUE_MAX_PER_EVENT) {
    pauseAutomationTemporarily(AUTOMATION_COOLDOWN_MS, `too many auto-continues for ${snapshot.reason}`);
    return;
  }

  const scheduledGeneration = stateGeneration;
  const delay = Math.min(CAPACITY_RETRY_MS * 2 ** autoContinueAttempts, MAX_CAPACITY_RETRY_MS);
  const label = snapshot.kind === 'capacity_continue' && snapshot.continueAction === 'enter' ? 'Enter' : CONTINUE_COMMAND;
  console.error(`\n[${FLAVOR_LABEL}] ${snapshot.reason} — retrying in ${delay}ms (sending: ${label}) [${autoContinueAttempts + 1}/${AUTO_CONTINUE_MAX_PER_EVENT}]\n`);

  continueTimer = setTimeout(() => {
    continueTimer = null;
    if (runId !== activeRunId || !activePty || !isAutomationActive()) return;
    if (scheduledGeneration !== stateGeneration) return;

    const latest = detectCurrentSnapshot();
    updateCurrentSnapshot(latest);
    if (latest.kind !== currentSnapshot.kind || latest.fingerprint !== currentSnapshot.fingerprint) return;
    if (AUTO_CONTINUE_MODE !== 'capacity' && AUTO_CONTINUE_MODE !== 'always' && latest.kind !== 'capacity_continue') return;

    autoContinueAttempts += 1;
    if (latest.kind === 'capacity_continue' && latest.continueAction === 'enter') {
      sendChoice('', latest.reason, runId);
    } else {
      sendChoice(CONTINUE_COMMAND, latest.reason, runId);
    }
    scheduleStaticRecheck(QUICK_RECHECK_MS);
  }, delay);
}

function rememberAction(key) {
  recentActionKeys.set(key, Date.now());
}

function actionSeenRecently(key, ttlMs) {
  const ts = recentActionKeys.get(key);
  return typeof ts === 'number' && Date.now() - ts < ttlMs;
}
// -----------------------------------------------------------------------------
// Child exit / restart handling
// -----------------------------------------------------------------------------

function handleChildExit({ runId, exitCode, signal }) {
  console.error(`\n[child] exited: code=${exitCode} signal=${signal}\n`);

  if (plannedAction) {
    const action = plannedAction;
    plannedAction = null;
    if (action.kind === 'switch') {
      modelIndex += 1;
      spawnGemini();
      return;
    }
    if (action.kind === 'restart') {
      spawnGemini();
      return;
    }
    cleanupAndExit(action.code ?? 0);
    return;
  }

  if (resumeEnabledThisRun && (exitCode === 42 || sawNoResumeSession)) {
    console.error(`[${FLAVOR_LABEL}] No resumable session — retrying without --resume\n`);
    resumeEnabledThisRun = false;
    spawnGemini();
    return;
  }

  if (switching) {
    switching = false;
    modelIndex += 1;
    spawnGemini();
    return;
  }

  const canAutoRestart =
    automationEnabled &&
    automationDisabledReason !== 'usage_limit' &&
    lastCapacityAt > 0 &&
    Date.now() - lastCapacityAt <= CAPACITY_RECENT_MS;

  if (canAutoRestart) {
    if (!recordAutoRestart()) {
      console.error(`\n[${FLAVOR_LABEL}] Too many auto-restarts in a short window — stopping the loop. ${hotkeySummary()}\n`);
      cleanupAndExit(typeof exitCode === 'number' ? exitCode : 1);
      return;
    }

    console.error(`[${FLAVOR_LABEL}] Exited during/after capacity event — restarting in ${CAPACITY_RETRY_MS}ms...\n`);
    restartTimer = setTimeout(() => {
      restartTimer = null;
      if (runId !== activeRunId || shuttingDown) return;
      spawnGemini();
    }, CAPACITY_RETRY_MS);
    return;
  }

  cleanupAndExit(typeof exitCode === 'number' ? exitCode : 0);
}

function recordAutoRestart() {
  const now = Date.now();
  autoRestartHistory = autoRestartHistory.filter((ts) => now - ts <= AUTO_RESTART_WINDOW_MS);
  if (autoRestartHistory.length >= AUTO_RESTART_MAX_PER_WINDOW) return false;
  autoRestartHistory.push(now);
  return true;
}

// -----------------------------------------------------------------------------
// Input / hotkeys / resize
// -----------------------------------------------------------------------------

function bindUserInput() {
  if (stdinBound) return;
  stdinBound = true;

  process.stdin.resume();
  if (process.stdin.isTTY) process.stdin.setRawMode?.(true);
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
      // ignore
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
      clearHotkeyTimer();
      handleHotkeyCommand(byte);
      continue;
    }

    if (byte === HOTKEY_PREFIX_BYTE) {
      hotkeyAwaitingCommand = true;
      armHotkeyTimer();
      process.stderr.write(`\n[local] Prefix detected (${HOTKEY_PREFIX_LABEL}). Press h help, a auto, p pause, e recheck, i status, s switch, r restart, c Ctrl-C, q quit.\n`);
      continue;
    }

    noteManualInput();
    forwardBytes.push(byte);
  }

  if (forwardBytes.length > 0 && activePty) {
    try {
      activePty.write(Buffer.from(forwardBytes).toString('utf8'));
    } catch {
      // ignore best-effort forwarding failures
    }
  }
}

function onStdinEnd() {
  if (!activePty) return;
  try {
    activePty.write('\x04');
  } catch {
    // ignore
  }
}

function armHotkeyTimer() {
  clearHotkeyTimer();
  hotkeyTimer = setTimeout(() => {
    hotkeyTimer = null;
    if (!hotkeyAwaitingCommand) return;
    hotkeyAwaitingCommand = false;
    process.stderr.write(`\n[local] Hotkey prefix timed out. ${hotkeySummary()}\n`);
  }, HOTKEY_TIMEOUT_MS);
}

function clearHotkeyTimer() {
  if (!hotkeyTimer) return;
  clearTimeout(hotkeyTimer);
  hotkeyTimer = null;
}

function decodeHotkeyCommandByte(byte) {
  if (byte >= 1 && byte <= 26) return String.fromCharCode(96 + byte);
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
      console.error(`\n[local] Automation disabled. ${HOTKEY_PREFIX_LABEL} a to re-enable.\n`);
    } else {
      setAutomationEnabled(true);
      console.error(`\n[local] Automation enabled.\n`);
    }
    return;
  }

  if (command === 'p') {
    pauseAutomationTemporarily(AUTOMATION_COOLDOWN_MS, 'manual pause');
    return;
  }

  if (command === 'e') {
    recheckVisiblePrompt('manual hotkey');
    console.error(`\n[local] Rechecked visible prompt.\n`);
    return;
  }

  if (command === 'i') {
    printLocalStatus();
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

  console.error(`\n[local] Unknown command ${JSON.stringify(command)}. ${hotkeySummary()}\n`);
}

function noteManualInput() {
  clearContinueTimer();
  clearMenuPlan();
  if (!automationEnabled) return;
  automationPausedUntil = Math.max(automationPausedUntil, Date.now() + MANUAL_OVERRIDE_MS);
  scheduleAutomationResumeRecheck();
}

function scheduleAutomationResumeRecheck() {
  clearAutomationResumeTimer();
  if (!automationEnabled || automationPausedUntil <= Date.now()) return;
  const delay = Math.max(10, automationPausedUntil - Date.now() + 20);
  automationResumeTimer = setTimeout(() => {
    automationResumeTimer = null;
    if (!isAutomationActive()) return;
    recheckVisiblePrompt('manual override ended');
  }, delay);
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
    // ignore resize race on exited PTY
  }
}

function getTerminalColumns() {
  return Math.max(1, process.stdout.columns || 120);
}

function getTerminalRows() {
  return Math.max(1, process.stdout.rows || 30);
}
// -----------------------------------------------------------------------------
// Automation control and actions
// -----------------------------------------------------------------------------

function sendChoice(text, reason, runId) {
  if (runId !== activeRunId || !activePty) return false;
  try {
    if (DEBUG_AUTOMATION) {
      console.error(`[${FLAVOR_LABEL}][send] ${JSON.stringify(text)} (${reason})`);
    }
    if (text === '') {
      activePty.write('\r');
    } else {
      activePty.write(text + '\r');
    }
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
      console.error(`[${FLAVOR_LABEL}][raw] ${JSON.stringify(text)} (${reason})`);
    }
    activePty.write(text);
    return true;
  } catch (error) {
    console.error(`[warn] Failed to send raw input (${reason}): ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

function requestLauncherAction(kind) {
  clearAllTimers();
  clearMenuPlan();
  switching = false;
  plannedAction = { kind, code: 0 };

  if (!activePty) {
    fulfillPlannedAction();
    return;
  }

  const label = kind === 'switch'
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
      // ignore
    }
  }, FORCE_KILL_AFTER_MS);
}

function fulfillPlannedAction() {
  if (!plannedAction) return;
  const action = plannedAction;
  plannedAction = null;

  if (action.kind === 'switch') {
    modelIndex += 1;
    spawnGemini();
    return;
  }
  if (action.kind === 'restart') {
    spawnGemini();
    return;
  }
  cleanupAndExit(action.code ?? 0);
}

function setAutomationEnabled(enabled, reason = 'manual') {
  automationEnabled = enabled;
  automationDisabledReason = enabled ? '' : reason;

  if (!enabled) {
    automationPausedUntil = 0;
    clearAllTimers();
    clearMenuPlan();
    recentActionKeys.clear();
    return;
  }

  automationPausedUntil = 0;
  recentActionKeys.clear();
  clearAllTimers();
  clearMenuPlan();
  recheckVisiblePrompt('automation enabled');
}

function pauseAutomationTemporarily(ms, reason, silent = false) {
  if (!automationEnabled) return;
  clearContinueTimer();
  clearMenuPlan();
  automationPausedUntil = Math.max(automationPausedUntil, Date.now() + ms);
  scheduleAutomationResumeRecheck();
  if (!silent) {
    console.error(`\n[${FLAVOR_LABEL}] Automation paused for ${Math.round(ms / 1000)}s (${reason}). ${hotkeySummary()}\n`);
  }
}

function isAutomationActive() {
  return automationEnabled && Date.now() >= automationPausedUntil && !shuttingDown;
}

function recheckVisiblePrompt(reason = 'manual recheck') {
  if (!activePty || shuttingDown || !isAutomationActive()) return;
  if (DEBUG_AUTOMATION) {
    console.error(`[${FLAVOR_LABEL}][auto] Rechecking visible prompt (${reason})`);
  }
  const snapshot = detectCurrentSnapshot();
  updateCurrentSnapshot(snapshot);
  maybeAutomate(activeRunId, snapshot);
}

function scheduleStaticRecheck(delay = STATIC_RECHECK_MS) {
  clearStaticRecheckTimer();
  if (!activePty || shuttingDown || !isAutomationActive()) return;
  if (currentSnapshot.kind === 'normal' || currentSnapshot.kind === 'usage_limit') return;

  staticRecheckTimer = setTimeout(() => {
    staticRecheckTimer = null;
    if (!activePty || shuttingDown || !isAutomationActive()) return;
    recheckVisiblePrompt('static prompt heartbeat');
  }, Math.max(30, delay));
}

function hotkeySummary() {
  return `${HOTKEY_PREFIX_LABEL} h help | ${HOTKEY_PREFIX_LABEL} a auto on/off | ${HOTKEY_PREFIX_LABEL} p pause auto | ${HOTKEY_PREFIX_LABEL} e recheck | ${HOTKEY_PREFIX_LABEL} i status | ${HOTKEY_PREFIX_LABEL} s switch | ${HOTKEY_PREFIX_LABEL} r restart | ${HOTKEY_PREFIX_LABEL} c Ctrl-C | ${HOTKEY_PREFIX_LABEL} q quit`;
}

function printLocalHelp() {
  console.error(
    [
      '',
      `[local] ${hotkeySummary()}`,
      `[local] Press the prefix first, then the command key.`,
      `[local] Manual typing pauses automation for ${Math.round(MANUAL_OVERRIDE_MS / 1000)}s.`,
      `[local] Current model: ${currentModel()}`,
      '',
    ].join('\n')
  );
}

function printLocalStatus() {
  const pausedForMs = Math.max(0, automationPausedUntil - Date.now());
  const selection = currentSnapshot.options.find((option) => option.selected)?.label || '(none)';
  const screenSummary = screenModel?.renderText(16)?.split('\n').slice(-4).join(' | ') || '(empty)';
  console.error(
    [
      '',
      `[local] Model: ${currentModel()}`,
      `[local] Automation: ${automationEnabled ? 'enabled' : `disabled (${automationDisabledReason || 'manual'})`}`,
      `[local] Paused: ${pausedForMs > 0 ? `${Math.ceil(pausedForMs / 1000)}s remaining` : 'no'}`,
      `[local] Snapshot: ${currentSnapshot.kind}/${currentSnapshot.source}`,
      `[local] Fingerprint: ${currentSnapshot.fingerprint}`,
      `[local] Selected option: ${selection}`,
      `[local] Visible tail: ${screenSummary}`,
      '',
    ].join('\n')
  );
}
// -----------------------------------------------------------------------------
// Cleanup
// -----------------------------------------------------------------------------

function bindProcessCleanup() {
  process.on('SIGINT', () => cleanupAndExit(130));
  process.on('SIGTERM', () => cleanupAndExit(143));
  process.on('SIGHUP', () => cleanupAndExit(129));
  process.on('exit', () => restoreTerminal());
  process.on('uncaughtException', (error) => failWithCleanup(error));
  process.on('unhandledRejection', (error) => failWithCleanup(error instanceof Error ? error : new Error(String(error))));
}

function clearContinueTimer() {
  if (!continueTimer) return;
  clearTimeout(continueTimer);
  continueTimer = null;
}

function clearRestartTimer() {
  if (!restartTimer) return;
  clearTimeout(restartTimer);
  restartTimer = null;
}

function clearForceKillTimer() {
  if (!forceKillTimer) return;
  clearTimeout(forceKillTimer);
  forceKillTimer = null;
}

function clearAutomationResumeTimer() {
  if (!automationResumeTimer) return;
  clearTimeout(automationResumeTimer);
  automationResumeTimer = null;
}

function clearStaticRecheckTimer() {
  if (!staticRecheckTimer) return;
  clearTimeout(staticRecheckTimer);
  staticRecheckTimer = null;
}

function clearAllTimers() {
  clearContinueTimer();
  clearMenuPlan();
  clearRestartTimer();
  clearForceKillTimer();
  clearAutomationResumeTimer();
  clearStaticRecheckTimer();
  clearHotkeyTimer();
}

function disposeActiveListeners() {
  for (const disposable of activeDisposables.splice(0)) {
    try {
      disposable?.dispose?.();
    } catch {
      // ignore
    }
  }
}

function cleanupAndExit(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearAllTimers();
  disposeActiveListeners();

  try {
    activePty?.kill?.();
  } catch {
    // ignore
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

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function validateConfig() {
  const modes = new Set(['prompt_only', 'capacity', 'always', 'off']);
  if (!modes.has(AUTO_CONTINUE_MODE)) {
    throw new Error(`AUTO_CONTINUE_MODE=${JSON.stringify(AUTO_CONTINUE_MODE)} is invalid. Use prompt_only, capacity, always, or off.`);
  }

  const numericChecks = {
    KEEP_TRY_MAX,
    TRY_AGAIN_MIN_INTERVAL_MS,
    MANUAL_OVERRIDE_MS,
    AUTOMATION_COOLDOWN_MS,
    FORCE_KILL_AFTER_MS,
    CAPACITY_RETRY_MS,
    MAX_CAPACITY_RETRY_MS,
    CAPACITY_EVENT_RESET_MS,
    CAPACITY_RECENT_MS,
    AUTO_CONTINUE_MAX_PER_EVENT,
    AUTO_RESTART_MAX_PER_WINDOW,
    AUTO_RESTART_WINDOW_MS,
    RAW_TAIL_MAX,
    NORMALIZED_TAIL_MAX,
    HOTKEY_TIMEOUT_MS,
    STATIC_RECHECK_MS,
    ACTION_RETRY_MIN_MS,
    PERMISSION_RETRY_MIN_MS,
    SCREEN_MAX_BUFFER_ROWS,
    SCREEN_MAX_COLS,
    SCREEN_CAPTURE_LINES,
    MENU_SELECT_MIN_MS,
    MENU_CONFIRM_MIN_MS,
    MENU_FALLBACK_AFTER_SELECTS,
    QUICK_RECHECK_MS,
  };

  for (const [name, value] of Object.entries(numericChecks)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`${name} must be a non-negative number. Received ${JSON.stringify(value)}.`);
    }
  }
}

function currentModel() {
  return MODELS[modelIndex % MODELS.length];
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

  throw new Error(`Unsupported HOTKEY_PREFIX=${JSON.stringify(name)}. Use one of: ctrl-g, ctrl-], ctrl-t, ctrl-\\`);
}

function isEnabled(value, defaultValue) {
  if (value == null) return defaultValue;
  return String(value).toLowerCase() !== '0' && String(value).toLowerCase() !== 'false';
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
    throw new Error(`GEMINI_WRAPPER_ARGS_JSON is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function splitListEnv(value, defaults) {
  if (!value) return defaults.map((item) => String(item));
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function shQuote(value) {
  const s = String(value);
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

export const _test = {
  normalizeTerminalText,
  detectSnapshotFromText,
  detectContinuePrompt,
  extractMenuBlocks,
  parseOptionLine,
  normalizeLabel,
  VirtualScreen,
};
