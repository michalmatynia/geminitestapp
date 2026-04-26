import 'server-only';

import { createHash, randomUUID } from 'crypto';
import path from 'path';

import {
  PLAYWRIGHT_PERSONA_SETTINGS_KEY,
  playwrightSettingsSchema,
  type PlaywrightPersona,
  type PlaywrightSettings,
} from '@/shared/contracts/playwright';
import { getSettingValue } from '@/shared/lib/ai/server-settings';
import { buildAiPathsContextRegistrySystemPrompt } from '@/shared/lib/ai-paths/context-registry/system-prompt';
import {
  buildChromiumAntiDetectionContextOptions,
  buildChromiumAntiDetectionLaunchOptions,
  installChromiumAntiDetectionInitScript,
  resolveChromiumAntiDetectionRuntimeBehavior,
} from '@/shared/lib/playwright/anti-detection';
import { applyPlaywrightProxySessionAffinity } from '@/shared/lib/playwright/proxy-affinity';
import { sanitizePlaywrightStorageState } from '@/shared/lib/playwright/storage-state';
import { defaultPlaywrightSettings } from '@/shared/lib/playwright/settings';
import { recordPlaywrightActionRunSnapshot } from '@/shared/lib/playwright/action-run-history-recorder.server';
import { evaluateOutboundUrlPolicy } from '@/shared/lib/security/outbound-url-policy';
import { getFsPromises } from '@/shared/lib/files/runtime-fs';
import { isObjectRecord } from '@/shared/utils/object-utils';
import { parseJsonSetting } from '@/shared/utils/settings-json';
import type { PlaywrightActionRunRequestSummary } from '@/shared/contracts/playwright-action-runs';

import {
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
} from '@/shared/lib/browser-execution/amazon-runtime-constants';

import { parseUserScript, safeStringify } from './playwright-node-runner.parser';
import {
  evaluateStepWithAI,
  injectCodeWithAI,
} from '@/features/playwright/server/ai-step-service';
import { executeAmazonReverseImageScanRuntime } from './playwright-node-runner.amazon-runtime';
import {
  executeSupplier1688ProbeScanRuntime,
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY,
} from './playwright-node-runner.supplier-1688-runtime';
export { validatePlaywrightNodeScript } from './playwright-node-runner.parser';
export * from './playwright-node-runner.types';
import type {
  PlaywrightNodeRunArtifact,
  PlaywrightNodeRunInstance,
  PlaywrightNodeRunRecord,
  PlaywrightNodeRunRequest,
  PlaywrightNodeArtifactReadResult,
} from './playwright-node-runner.types';
import { isPlaywrightNodeRuntimeRunRequest } from './playwright-node-runner.types';

import type {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  BrowserType,
  LaunchOptions,
  Page,
} from 'playwright';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import {
  RUN_ROOT_DIR,
  RUN_TTL_MS,
  getPlaywright,
  type PlaywrightHelperTarget,
  pickDelayInRange,
  pickSignedOffset,
  clampNumber,
  resolveRunStatePath,
  resolveRunArtifactsDir,
} from './playwright-node-runner.helpers';

const nodeFs = getFsPromises();
const STICKY_SESSION_ROOT_DIR = path.join(RUN_ROOT_DIR, 'sticky-sessions');
const STICKY_SESSION_TTL_MS = RUN_TTL_MS;
const PLAYWRIGHT_PERSONA_SETTINGS_TIMEOUT_MS = (() => {
  const raw = Number(process.env['PLAYWRIGHT_PERSONA_SETTINGS_TIMEOUT_MS']);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 2_000;
})();
const PLAYWRIGHT_STARTUP_TIMEOUT_MS = (() => {
  const raw = Number(process.env['PLAYWRIGHT_STARTUP_TIMEOUT_MS']);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 45_000;
})();
const HOSTILE_STICKY_IDENTITY_PROFILES = new Set<PlaywrightSettings['identityProfile']>([
  'search',
  'marketplace',
]);
const chromiumRuntimePacingChains = new Map<string, Promise<void>>();
const chromiumRuntimePacingNextAllowedAt = new Map<string, number>();

type StickySessionDescriptor = {
  key: string;
  path: string;
  profile: PlaywrightSettings['identityProfile'];
  origin: string;
  scopeLabel: string;
};

type ChromiumRuntimePacingDescriptor = {
  key: string;
  label: string;
  profile: PlaywrightSettings['identityProfile'];
};

type RuntimePostureSnapshot = {
  browser: {
    engine: 'chromium' | 'firefox' | 'webkit';
    label: string;
    headless: boolean;
    slowMo: number;
    channel: string | null;
    executablePathLabel: string | null;
  };
  antiDetection: {
    identityProfile: PlaywrightSettings['identityProfile'];
    locale: string | null;
    timezoneId: string | null;
    userAgent: string | null;
    acceptLanguage: string | null;
    chromiumDefaultsApplied: boolean;
    runtimePacingScope: string | null;
    runtimeBehavior: {
      prewarmUrl: string | null;
      prewarmWaitMs: number;
      postStartUrlWaitMs: number;
      launchCooldownMs: number;
    };
    stickyStorageState: {
      enabled: boolean;
      loaded: boolean;
      scopeLabel: string | null;
      origin: string | null;
    };
    proxy: {
      enabled: boolean;
      providerPreset: PlaywrightSettings['proxyProviderPreset'];
      sessionAffinityEnabled: boolean;
      sessionMode: PlaywrightSettings['proxySessionMode'];
      applied: boolean;
      reason:
        | 'disabled'
        | 'no-proxy'
        | 'no-scope'
        | 'no-placeholder'
        | 'applied'
        | null;
      serverHost: string | null;
      hasUsername: boolean;
      scopeLabel: string | null;
      origin: string | null;
      mutations: Array<{
        field: 'server' | 'username' | 'password';
        source: 'placeholder' | 'provider_preset';
      }>;
    };
  };
};

const ensureRunRoot = async (): Promise<void> => {
  await nodeFs.mkdir(RUN_ROOT_DIR, { recursive: true });
};

const ensureStickySessionRoot = async (): Promise<void> => {
  await nodeFs.mkdir(STICKY_SESSION_ROOT_DIR, { recursive: true });
};

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> => {
  let timeoutRef: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutRef = setTimeout(() => {
          reject(new Error(message));
        }, timeoutMs);
      }),
    ]);
    } finally {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (timeoutRef !== null) clearTimeout(timeoutRef);
    }
    };

const shouldHoldBrowserOpenForFailure = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('auth_required') ||
    normalized.includes('manual verification') ||
    normalized.includes('captcha')
  );
};

    const cleanupOldRuns = async (): Promise<void> => {
  try {
    await ensureRunRoot();
    const now = Date.now();
    const entries = await nodeFs.readdir(RUN_ROOT_DIR, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        if (entry.name === path.basename(STICKY_SESSION_ROOT_DIR)) {
          return;
        }
        const targetPath = path.join(RUN_ROOT_DIR, entry.name);
        const stat = await nodeFs.stat(targetPath).catch(() => null);
        if (!stat) return;
        if (now - stat.mtimeMs < RUN_TTL_MS) return;
        await nodeFs.rm(targetPath, { recursive: true, force: true }).catch(() => undefined);
      })
    );
    await ensureStickySessionRoot();
    const stickyEntries = await nodeFs.readdir(STICKY_SESSION_ROOT_DIR, { withFileTypes: true });
    await Promise.all(
      stickyEntries.map(async (entry) => {
        const targetPath = path.join(STICKY_SESSION_ROOT_DIR, entry.name);
        const stat = await nodeFs.stat(targetPath).catch(() => null);
        if (!stat) return;
        if (now - stat.mtimeMs < STICKY_SESSION_TTL_MS) return;
        await nodeFs.rm(targetPath, { recursive: true, force: true }).catch(() => undefined);
      })
    );
  } catch (error) {
    await ErrorSystem.captureException(error);
    // best effort cleanup only
  }
  };

  const isLocalStickySessionHost = (hostname: string): boolean => {

  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized.endsWith('.localhost')
  );
};

const resolveUrlRuntimePacing = (input: {
  identityProfile: PlaywrightSettings['identityProfile'];
  url: string;
}): ChromiumRuntimePacingDescriptor | null => {
  try {
    const parsed = new URL(input.url);
    const protocol = parsed.protocol;
    if (protocol !== 'http:' && protocol !== 'https:') {
      return null;
    }
    const hostname = parsed.hostname;
    if (isLocalStickySessionHost(hostname)) {
      return null;
    }
    const host = parsed.host.toLowerCase();
    return {
      key: `${input.identityProfile}:${host}`,
      label: `${input.identityProfile}/${host}`,
      profile: input.identityProfile,
    };
  } catch {
    return {
      key: `${input.identityProfile}:global`,
      label: `${input.identityProfile}/global`,
      profile: input.identityProfile,
    };
  }
};

const resolveChromiumRuntimePacingDescriptor = (input: {
  identityProfile: PlaywrightSettings['identityProfile'];
  startUrl: string | undefined;
}): ChromiumRuntimePacingDescriptor | null => {
  if (!HOSTILE_STICKY_IDENTITY_PROFILES.has(input.identityProfile)) {
    return null;
  }

  const normalizedStartUrl =
    typeof input.startUrl === 'string' && input.startUrl.trim().length > 0 ? input.startUrl.trim() : null;

  if (normalizedStartUrl === null) {
    return {
      key: `${input.identityProfile}:global`,
      label: `${input.identityProfile}/global`,
      profile: input.identityProfile,
    };
  }

  return resolveUrlRuntimePacing({
    identityProfile: input.identityProfile,
    url: normalizedStartUrl,
  });
};


const waitForChromiumRuntimePacing = async (input: {
  descriptor: ChromiumRuntimePacingDescriptor | null;
  cooldownMs: number;
  logs: string[];
  sleep: (ms: number) => Promise<void>;
}): Promise<void> => {
  if (!input.descriptor || input.cooldownMs <= 0) {
    return;
  }

  const previous = chromiumRuntimePacingChains.get(input.descriptor.key) ?? Promise.resolve();
  let releaseCurrent!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseCurrent = resolve;
  });
  const currentChain = previous.catch(() => undefined).then(() => gate);
  chromiumRuntimePacingChains.set(input.descriptor.key, currentChain);

  await previous.catch(() => undefined);

  try {
    const now = Date.now();
    const waitMs = Math.max(
      0,
      (chromiumRuntimePacingNextAllowedAt.get(input.descriptor.key) ?? now) - now
    );
    if (waitMs > 0) {
      input.logs.push(
        `[runtime] Applied Chromium anti-detection cooldown (${input.descriptor.label}) for ${waitMs}ms.`
      );
      await input.sleep(waitMs);
    }
    chromiumRuntimePacingNextAllowedAt.set(
      input.descriptor.key,
      Date.now() + input.cooldownMs
    );
  } finally {
    releaseCurrent();
    if (chromiumRuntimePacingChains.get(input.descriptor.key) === currentChain) {
      chromiumRuntimePacingChains.delete(input.descriptor.key);
    }
  }
};

const resolveStickyScope = (input: {
  instance: PlaywrightNodeRunInstance | null;
  ownerUserId: string | null;
}): { value: string; label: string } | null => {
  const inst = input.instance;
  const connectionId = inst !== null ? inst.connectionId : undefined;
  if (connectionId !== undefined && connectionId !== null && connectionId.trim() !== '') {
    const cid = connectionId.trim();
    return { value: cid, label: `connection:${cid}` };
  }
  const ownerUserId = input.ownerUserId;
  if (ownerUserId !== null && ownerUserId.trim() !== '') {
    const oid = ownerUserId.trim();
    return { value: oid, label: `owner:${oid}` };
  }
  const integrationId = inst !== null ? inst.integrationId : undefined;
  if (integrationId !== undefined && integrationId !== null && integrationId.trim() !== '') {
    const iid = integrationId.trim();
    return { value: iid, label: `integration:${iid}` };
  }
  return null;
};

const resolveStickyOrigin = (startUrl: string | undefined): string | null => {
  const normalized = typeof startUrl === 'string' && startUrl.trim().length > 0 ? startUrl.trim() : null;
  if (normalized === null) return null;
  try {
    const parsed = new URL(normalized);
    const protocol = parsed.protocol;
    if (protocol !== 'http:' && protocol !== 'https:') {
      return null;
    }
    if (isLocalStickySessionHost(parsed.hostname)) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
};

const resolveStickySessionDescriptor = (input: {
  ownerUserId: string | null;
  instance: PlaywrightNodeRunInstance | null;
  personaId: string | undefined;
  identityProfile: PlaywrightSettings['identityProfile'];
  startUrl: string | undefined;
  explicitStorageState: BrowserContextOptions['storageState'] | undefined;
}): StickySessionDescriptor | null => {
  if (
    input.explicitStorageState !== undefined &&
    input.explicitStorageState !== null ||
    !HOSTILE_STICKY_IDENTITY_PROFILES.has(input.identityProfile)
  ) {
    return null;
  }

  const scope = resolveStickyScope({
    instance: input.instance,
    ownerUserId: input.ownerUserId,
  });
  if (scope === null) return null;

  const origin = resolveStickyOrigin(input.startUrl);
  if (origin === null) return null;

  const personaId = (input.personaId?.trim() ?? '') !== '' ? (input.personaId?.trim() as string) : 'default-persona';
  const key = createHash('sha256')
    .update(
      JSON.stringify({
        scopeLabel: scope.label,
        profile: input.identityProfile,
        origin,
        personaId,
      })
    )
    .digest('hex');

  return {
    key,
    path: path.join(STICKY_SESSION_ROOT_DIR, `${key}.json`),
    profile: input.identityProfile,
    origin,
    scopeLabel: scope.label,
  };
};

const loadStickySessionStorageState = async (
  descriptor: StickySessionDescriptor,
  logs: string[]
): Promise<BrowserContextOptions['storageState'] | undefined> => {
  try {
    const raw = await nodeFs.readFile(descriptor.path, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    const candidate = isObjectRecord(parsed) ? parsed['storageState'] : parsed;
    if (typeof candidate === 'string') {
      return undefined;
    }
    const sanitized = sanitizePlaywrightStorageState(candidate as BrowserContextOptions['storageState'], {
      fallbackOrigin: descriptor.origin,
    });
    if (!sanitized) {
      await nodeFs.rm(descriptor.path, { force: true }).catch(() => undefined);
      return undefined;
    }
    const now = new Date();
    await nodeFs.utimes(descriptor.path, now, now).catch(() => undefined);
    logs.push(
      `[runtime] Loaded sticky storage state (${descriptor.profile}) for ${descriptor.scopeLabel} at ${descriptor.origin}.`
    );
    return sanitized as BrowserContextOptions['storageState'];
  } catch {
    return undefined;
  }
};

const persistStickySessionStorageState = async (input: {
  context: BrowserContext | null;
  descriptor: StickySessionDescriptor | null;
  logs: string[];
}): Promise<void> => {
  if (!input.context || !input.descriptor || typeof input.context.storageState !== 'function') {
    return;
  }

  try {
    const rawStorageState = await input.context.storageState();
    const sanitized = sanitizePlaywrightStorageState(rawStorageState, {
      fallbackOrigin: input.descriptor.origin,
    });
    if (!sanitized) {
      return;
    }
    await ensureStickySessionRoot();
    await nodeFs.writeFile(
      input.descriptor.path,
      `${JSON.stringify(
        {
          version: 1,
          profile: input.descriptor.profile,
          origin: input.descriptor.origin,
          scopeLabel: input.descriptor.scopeLabel,
          updatedAt: nowIso(),
          storageState: sanitized,
        },
        null,
        2
      )}\n`,
      'utf8'
    );
    input.logs.push(
      `[runtime] Saved sticky storage state (${input.descriptor.profile}) for ${input.descriptor.scopeLabel} at ${input.descriptor.origin}.`
    );
  } catch (error) {
    await ErrorSystem.captureException(error);
  }
};


const writeRunState = async (run: PlaywrightNodeRunRecord): Promise<void> => {
  await ensureRunRoot();
  const targetPath = resolveRunStatePath(run.runId);
  const tempPath = `${targetPath}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await nodeFs.writeFile(tempPath, `${JSON.stringify(run, null, 2)}\n`, 'utf8');
  await nodeFs.rename(tempPath, targetPath);
};

export const nowIso = (): string => new Date().toISOString();

const buildBaseRunState = (runId: string): PlaywrightNodeRunRecord => {
  const now = nowIso();
  return {
    runId,
    ownerUserId: null,
    status: 'queued',
    startedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    instance: null,
    artifacts: [],
    logs: [],
    requestSummary: null,
  };
};

const normalizeRunInstance = (
  value: PlaywrightNodeRunInstance | null | undefined
): PlaywrightNodeRunInstance | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const normalizedKind = typeof value.kind === 'string' ? value.kind.trim() : '';
  if (!normalizedKind) {
    return null;
  }

  const toOptionalString = (entry: unknown): string | null =>
    typeof entry === 'string' && entry.trim().length > 0 ? entry.trim() : null;

  const normalizedTags = Array.isArray(value.tags)
    ? value.tags
        .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
        .filter((tag) => tag.length > 0)
    : [];
  const normalizedFamily = toOptionalString(value.family) as PlaywrightNodeRunInstance['family'];

  return {
    kind: normalizedKind as PlaywrightNodeRunInstance['kind'],
    family: normalizedFamily ?? null,
    label: toOptionalString(value.label),
    connectionId: toOptionalString(value.connectionId),
    integrationId: toOptionalString(value.integrationId),
    listingId: toOptionalString(value.listingId),
    nodeId: toOptionalString(value.nodeId),
    tags: normalizedTags.length > 0 ? normalizedTags : null,
  };
};

export const updateRunState = async (
  runId: string,
  patch: Partial<PlaywrightNodeRunRecord>
): Promise<PlaywrightNodeRunRecord> => {
  const existing = await readPlaywrightNodeRun(runId);
  const base = existing ?? buildBaseRunState(runId);
  const next: PlaywrightNodeRunRecord = {
    ...base,
    ...patch,
    runId,
    updatedAt: nowIso(),
    instance:
      patch.instance === undefined
        ? (base.instance ?? null)
        : normalizeRunInstance(patch.instance ?? null),
    requestSummary:
      patch.requestSummary === undefined
        ? (base.requestSummary ?? null)
        : (patch.requestSummary ?? null),
    artifacts: patch.artifacts ?? base.artifacts,
    logs: patch.logs ?? base.logs,
  };
  await writeRunState(next);
  await recordPlaywrightActionRunSnapshot(next).catch(async (error: unknown) => {
    await ErrorSystem.captureException(error, {
      service: 'playwright-node-runner',
      action: 'record-action-run-history',
      runId,
    });
  });
  return next;
};

const summarizePlaywrightRunRequest = (
  request: PlaywrightNodeRunRequest
): PlaywrightActionRunRequestSummary => {
  const summary: PlaywrightActionRunRequestSummary = {};
  if (request.startUrl) summary.startUrl = request.startUrl;
  if (request.browserEngine) summary.browserEngine = request.browserEngine;
  if (typeof request.timeoutMs === 'number') summary.timeoutMs = request.timeoutMs;
  if (isPlaywrightNodeRuntimeRunRequest(request)) summary.runtimeKey = request.runtimeKey;
  if (request.actionId) summary.actionId = request.actionId;
  if (request.actionName) summary.actionName = request.actionName;
  if (request.selectorProfile) summary.selectorProfile = request.selectorProfile;
  if (request.input && isObjectRecord(request.input)) summary.input = request.input;
  if (request.personaId) {
    summary.input = {
      ...(summary.input ?? {}),
      personaId: request.personaId,
    };
  }
  if (request.capture && isObjectRecord(request.capture)) summary.capture = request.capture;
  return summary;
};

const normalizeSettingsOverrides = (
  overrides: Record<string, unknown> | undefined
): Partial<PlaywrightSettings> => {
  if (!overrides) {
    return {};
  }
  const parsed = playwrightSettingsSchema.partial().safeParse(overrides);
  if (!parsed.success) {
    return {};
  }
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }
  return sanitized as Partial<PlaywrightSettings>;
};

const resolvePersonaSettings = async (
  personaId: string | undefined
): Promise<PlaywrightSettings> => {
  if (!personaId?.trim()) return { ...defaultPlaywrightSettings };
  const raw = await getSettingValue(PLAYWRIGHT_PERSONA_SETTINGS_KEY);
  const parsed = parseJsonSetting<unknown>(raw, null);
  if (!Array.isArray(parsed)) return { ...defaultPlaywrightSettings };
  const persona = parsed.find((entry: unknown): entry is PlaywrightPersona => {
    if (!isObjectRecord(entry)) return false;
    return entry['id'] === personaId;
  });
  if (!persona || !isObjectRecord(persona.settings)) {
    return { ...defaultPlaywrightSettings };
  }
  return {
    ...defaultPlaywrightSettings,
    ...(persona.settings as Partial<PlaywrightSettings>),
  };
};

const getBrowserType = (
  playwright: typeof import('playwright'),
  engine: 'chromium' | 'firefox' | 'webkit'
): BrowserType =>
  engine === 'firefox'
    ? playwright.firefox
    : engine === 'webkit'
      ? playwright.webkit
      : playwright.chromium;

const isChromiumBrowserEngine = (
  engine: 'chromium' | 'firefox' | 'webkit'
): boolean => engine === 'chromium';

const buildLaunchOptions = (
  settings: PlaywrightSettings,
  launchOverrides: LaunchOptions,
  capture: PlaywrightNodeRunRequest['capture']
): LaunchOptions => {
  const base: LaunchOptions = {
    headless: settings.headless,
    slowMo: settings.slowMo,
  };
  if (settings.proxyEnabled && (settings.proxyServer ?? '') !== '') {
    base.proxy = {
      server: settings.proxyServer as string,
      ...((settings.proxyUsername ?? '') !== '' ? { username: settings.proxyUsername } : {}),
      ...((settings.proxyPassword ?? '') !== '' ? { password: settings.proxyPassword } : {}),
    };
  }
  const merged = {
    ...base,
    ...launchOverrides,
  } as LaunchOptions;

  // Video can be controlled from context only; keep launch clean.
  if (capture?.video && merged.headless === false) {
    // no-op, explicit to document behavior
  }
  return merged;
};

const buildBaseContextOptions = (
  playwright: typeof import('playwright'),
  settings: PlaywrightSettings
): BrowserContextOptions => {
  const devicePreset =
    settings.emulateDevice && (settings.deviceName ?? '') !== ''
      ? playwright.devices?.[settings.deviceName as string]
      : undefined;
  return {
    ...(devicePreset ?? {}),
    ...((settings.locale ?? '') !== '' ? { locale: settings.locale } : {}),
    ...((settings.timezoneId ?? '') !== '' ? { timezoneId: settings.timezoneId } : {}),
  };
};

const resolveStorageStateOption = (
  storageState: BrowserContextOptions['storageState'],
  startUrl: string | undefined
): BrowserContextOptions['storageState'] | undefined => {
  if (typeof storageState !== 'string' && storageState !== undefined && storageState !== null) {
    const sanitized = sanitizePlaywrightStorageState(storageState, {
      fallbackOrigin: startUrl ?? null,
    });
    if (sanitized !== undefined && sanitized !== null) {
      return sanitized as BrowserContextOptions['storageState'];
    }
    return undefined;
  }
  return storageState;
};

const resolveViewportWithJitter = (
  viewport: BrowserContextOptions['viewport'],
  settings: PlaywrightSettings,
  isViewportOverridden: boolean
): BrowserContextOptions['viewport'] => {
  const jitterBudget = Math.max(0, Math.trunc(settings.viewportJitterPx ?? 0));
  if (
    jitterBudget > 0 &&
    viewport !== undefined &&
    viewport !== null &&
    typeof viewport === 'object' &&
    typeof (viewport as { width: number }).width === 'number' &&
    typeof (viewport as { height: number }).height === 'number' &&
    !isViewportOverridden
  ) {
    const v = viewport as { width: number; height: number };
    return {
      width: Math.max(320, v.width + pickSignedOffset(jitterBudget)),
      height: Math.max(240, v.height + pickSignedOffset(jitterBudget)),
    };
  }
  return viewport;
};

const buildContextOptions = (
  playwright: typeof import('playwright'),
  settings: PlaywrightSettings,
  runArtifactsDir: string,
  contextOverrides: BrowserContextOptions,
  capture: PlaywrightNodeRunRequest['capture'],
  startUrl?: string
): BrowserContextOptions => {
  const base = buildBaseContextOptions(playwright, settings);
  const videoOptions: BrowserContextOptions = capture?.video === true
    ? { recordVideo: { dir: runArtifactsDir, size: { width: 1280, height: 720 } } }
    : {};

  const merged: BrowserContextOptions = {
    ...base,
    ...videoOptions,
    ...(contextOverrides),
  };

  return {
    ...merged,
    storageState: resolveStorageStateOption(merged.storageState, startUrl),
    viewport: resolveViewportWithJitter(merged.viewport, settings, contextOverrides.viewport !== undefined),
  };
};

const readOptionalTrimmedString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const isNodeErrorWithCode = (error: unknown, code: string): boolean =>
  isObjectRecord(error) && error['code'] === code;

const resolveBrowserLaunchLabel = (input: {
  browserEngine: 'chromium' | 'firefox' | 'webkit';
  launchOptions: LaunchOptions;
}): { label: string; channel: string | null; executablePathLabel: string | null } => {
  const channel = readOptionalTrimmedString(input.launchOptions.channel);
  const executablePath = readOptionalTrimmedString(input.launchOptions.executablePath);
  const executablePathLabel = executablePath ? path.basename(executablePath) : null;

  if (input.browserEngine === 'firefox') {
    return { label: 'Firefox', channel, executablePathLabel };
  }
  if (input.browserEngine === 'webkit') {
    return { label: 'WebKit', channel, executablePathLabel };
  }
  if (channel === 'chrome') {
    return { label: 'Chrome', channel, executablePathLabel };
  }
  if (executablePathLabel?.toLowerCase().includes('brave')) {
    return { label: 'Brave', channel, executablePathLabel };
  }
  if (executablePathLabel) {
    return {
      label: `Chromium (${executablePathLabel})`,
      channel,
      executablePathLabel,
    };
  }
  return {
    label: 'Chromium (bundled)',
    channel,
    executablePathLabel,
  };
};

const resolveProxyServerHost = (value: unknown): string | null => {
  const server = readOptionalTrimmedString(value);
  if (!server) {
    return null;
  }

  try {
    return new URL(server).host || server;
  } catch {
    return server;
  }
};

const resolveAcceptLanguageHeader = (contextOptions: BrowserContextOptions): string | null => {
  const header = Object.entries(contextOptions.extraHTTPHeaders ?? {}).find(
    ([key]) => key.trim().toLowerCase() === 'accept-language'
  );
  return typeof header?.[1] === 'string' ? header[1] : null;
};

const buildAntiDetectionSnapshot = (input: {
  browserEngine: 'chromium' | 'firefox' | 'webkit';
  effectiveContextOptions: BrowserContextOptions;
  effectiveSettings: PlaywrightSettings;
  runtimeAntiDetectionBehavior: ReturnType<typeof resolveChromiumAntiDetectionRuntimeBehavior>;
  runtimePacingDescriptor: ChromiumRuntimePacingDescriptor | null;
  acceptLanguage: string | null;
}): RuntimePostureSnapshot['antiDetection'] => ({
  identityProfile: input.effectiveSettings.identityProfile,
  locale: readOptionalTrimmedString(input.effectiveContextOptions.locale),
  timezoneId: readOptionalTrimmedString(input.effectiveContextOptions.timezoneId),
  userAgent: readOptionalTrimmedString(input.effectiveContextOptions.userAgent),
  acceptLanguage: input.acceptLanguage,
  chromiumDefaultsApplied: isChromiumBrowserEngine(input.browserEngine),
  runtimePacingScope: input.runtimePacingDescriptor?.label ?? null,
  runtimeBehavior: {
    prewarmUrl: input.runtimeAntiDetectionBehavior.prewarmUrl,
    prewarmWaitMs: input.runtimeAntiDetectionBehavior.prewarmWaitMs,
    postStartUrlWaitMs: input.runtimeAntiDetectionBehavior.postStartUrlWaitMs,
    launchCooldownMs: input.runtimeAntiDetectionBehavior.launchCooldownMs,
  },
  stickyStorageState: {
    enabled: false, // will be updated
    loaded: false, // will be updated
    scopeLabel: null, // will be updated
    origin: null, // will be updated
  },
  proxy: {
    enabled: false, // will be updated
    providerPreset: input.effectiveSettings.proxyProviderPreset,
    sessionAffinityEnabled: input.effectiveSettings.proxySessionAffinity,
    sessionMode: input.effectiveSettings.proxySessionMode,
    applied: false, // will be updated
    reason: null, // will be updated
    serverHost: null, // will be updated
    hasUsername: false, // will be updated
    scopeLabel: null, // will be updated
    origin: null, // will be updated
    mutations: [], // will be updated
  },
});

const buildRuntimePostureSnapshot = (input: {
  browserEngine: 'chromium' | 'firefox' | 'webkit';
  effectiveLaunchOptions: LaunchOptions;
  effectiveContextOptions: BrowserContextOptions;
  effectiveSettings: PlaywrightSettings;
  runtimeAntiDetectionBehavior: ReturnType<typeof resolveChromiumAntiDetectionRuntimeBehavior>;
  runtimePacingDescriptor: ChromiumRuntimePacingDescriptor | null;
  stickySessionDescriptor: StickySessionDescriptor | null;
  stickySessionStorageState: BrowserContextOptions['storageState'] | undefined;
  proxyAffinityResult: ReturnType<typeof applyPlaywrightProxySessionAffinity>;
}): RuntimePostureSnapshot => {
  const browserLaunch = resolveBrowserLaunchLabel({
    browserEngine: input.browserEngine,
    launchOptions: input.effectiveLaunchOptions,
  });
  const acceptLanguage = resolveAcceptLanguageHeader(input.effectiveContextOptions);

  const snapshot: RuntimePostureSnapshot = {
    browser: {
      engine: input.browserEngine,
      label: browserLaunch.label,
      headless: input.effectiveLaunchOptions.headless !== false,
      slowMo: typeof input.effectiveLaunchOptions.slowMo === 'number' ? input.effectiveLaunchOptions.slowMo : 0,
      channel: browserLaunch.channel,
      executablePathLabel: browserLaunch.executablePathLabel,
    },
    antiDetection: buildAntiDetectionSnapshot({
      browserEngine: input.browserEngine,
      effectiveContextOptions: input.effectiveContextOptions,
      effectiveSettings: input.effectiveSettings,
      runtimeAntiDetectionBehavior: input.runtimeAntiDetectionBehavior,
      runtimePacingDescriptor: input.runtimePacingDescriptor,
      acceptLanguage,
    }),
  };

  const ad = snapshot.antiDetection;
  ad.stickyStorageState = {
    enabled: input.stickySessionDescriptor !== null,
    loaded: input.stickySessionStorageState !== undefined && input.stickySessionStorageState !== null,
    scopeLabel: input.stickySessionDescriptor?.scopeLabel ?? null,
    origin: input.stickySessionDescriptor?.origin ?? null,
  };

  ad.proxy = {
    enabled: (input.effectiveLaunchOptions.proxy?.server ?? '') !== '',
    providerPreset: input.effectiveSettings.proxyProviderPreset,
    sessionAffinityEnabled: input.effectiveSettings.proxySessionAffinity,
    sessionMode: input.effectiveSettings.proxySessionMode,
    applied: input.proxyAffinityResult.applied,
    reason: input.proxyAffinityResult.reason,
    serverHost: resolveProxyServerHost(input.effectiveLaunchOptions.proxy?.server),
    hasUsername: (readOptionalTrimmedString(input.effectiveLaunchOptions.proxy?.username) ?? '') !== '',
    scopeLabel: input.proxyAffinityResult.descriptor?.scopeLabel ?? null,
    origin: input.proxyAffinityResult.descriptor?.origin ?? null,
    mutations: [...input.proxyAffinityResult.mutations],
  };

  return snapshot;
};


const normalizePolicyAllowedHosts = (hosts: string[] | undefined): Set<string> => {
  if (!Array.isArray(hosts) || hosts.length === 0) {
    return new Set<string>();
  }

  return new Set(
    hosts
      .map((host) => host.trim().toLowerCase())
      .filter((host) => host.length > 0)
  );
};

const isPolicyAllowedHost = (requestUrl: string, allowedHosts: Set<string>): boolean => {
  if (allowedHosts.size === 0) {
    return false;
  }

  try {
    const parsed = new URL(requestUrl);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
      return false;
    }

    return allowedHosts.has(parsed.host.toLowerCase());
  } catch {
    return false;
  }
};

const registerOutboundPolicyRoute = async (
  context: BrowserContext,
  logs: string[],
  allowedHosts: Set<string>
): Promise<void> => {
  await context.route('**/*', async (route) => {
    const requestUrl = route.request().url();
    let parsed: URL;
    try {
      parsed = new URL(requestUrl);
    } catch (error) {
      await ErrorSystem.captureException(error);
      await route.continue();
      return;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      await route.continue();
      return;
    }
    if (allowedHosts.has(parsed.host.toLowerCase())) {
      await route.continue();
      return;
    }
    const decision = evaluateOutboundUrlPolicy(requestUrl);
    if (!decision.allowed) {
      logs.push(
        `[policy] Blocked outbound URL: ${requestUrl} (${decision.reason ?? 'policy_violation'})`
      );
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });
};

import {
  saveFileArtifact,
  createLiveRunStateCoordinator,
  captureFinalRunArtifacts,
  buildCompletedRunState,
  captureFailureArtifacts,
  buildFailedRunState,
  persistVideoArtifact
} from './playwright-node-runner.artifacts';

const prepareRunConfiguration = async (params: {
  runId: string;
  request: PlaywrightNodeRunRequest;
  queuedRun: PlaywrightNodeRunRecord | null;
  runArtifactsDir: string;
  logs: string[];
}): Promise<{
  effectiveSettings: PlaywrightSettings;
  launchOptions: LaunchOptions;
  contextOptions: BrowserContextOptions;
  proxyAffinityResult: ReturnType<typeof applyPlaywrightProxySessionAffinity>;
}> => {
  const { runId, request, queuedRun, runArtifactsDir, logs } = params;
  const playwright = getPlaywright();
  const personaSettings = await withTimeout(
    resolvePersonaSettings(request.personaId),
    PLAYWRIGHT_PERSONA_SETTINGS_TIMEOUT_MS,
    'Timed out resolving Playwright persona settings.'
  ).catch(async (error) => {
    logs.push('[runtime][warn] Timed out resolving Playwright persona settings. Using defaults.');
    await ErrorSystem.captureException(error, {
      service: 'playwright-node-runner',
      action: 'resolvePersonaSettings',
      runId,
      personaId: request.personaId ?? null,
      timeoutMs: PLAYWRIGHT_PERSONA_SETTINGS_TIMEOUT_MS,
    });
    return { ...defaultPlaywrightSettings };
  });
  const settingsOverrides = normalizeSettingsOverrides(request.settingsOverrides);
  const effectiveSettings: PlaywrightSettings = {
    ...personaSettings,
    ...settingsOverrides,
  };
  const launchOptions = buildLaunchOptions(
    effectiveSettings,
    request.launchOptions ?? {},
    request.capture
  );
  const proxyAffinityResult = applyPlaywrightProxySessionAffinity({
    enabled: effectiveSettings.proxySessionAffinity,
    mode: effectiveSettings.proxySessionMode,
    providerPreset: effectiveSettings.proxyProviderPreset,
    launchOptions,
    identityProfile: effectiveSettings.identityProfile,
    connectionId: queuedRun?.instance?.connectionId ?? null,
    ownerUserId: queuedRun?.ownerUserId ?? null,
    integrationId: queuedRun?.instance?.integrationId ?? null,
    personaId: request.personaId,
    startUrl: request.startUrl,
    runScopeKey: runId,
  });
  if (effectiveSettings.proxySessionAffinity) {
    if (proxyAffinityResult.reason === 'applied' && proxyAffinityResult.descriptor !== null) {
      logs.push(
        `[runtime] Applied ${proxyAffinityResult.descriptor.mode} proxy session (${effectiveSettings.identityProfile}) for ${proxyAffinityResult.descriptor.scopeLabel}${proxyAffinityResult.descriptor.origin !== null ? ` at ${proxyAffinityResult.descriptor.origin}` : ''}.`
      );
    } else if (proxyAffinityResult.reason === 'no-placeholder') {
      logs.push(
        '[runtime] Sticky proxy session is enabled, but the proxy configuration has no session placeholder.'
      );
    } else if (proxyAffinityResult.reason === 'no-scope') {
      logs.push(
        '[runtime] Sticky proxy session is enabled, but this run has no stable scope for proxy affinity.'
      );
    }
  }
  const contextOptions = buildContextOptions(
    playwright,
    effectiveSettings,
    runArtifactsDir,
    request.contextOptions ?? {},
    request.capture,
    request.startUrl
  );

  return {
    effectiveSettings,
    launchOptions,
    contextOptions,
    proxyAffinityResult,
  };
};

const executePlaywrightNodeRun = async (
  runId: string,
  request: PlaywrightNodeRunRequest
): Promise<PlaywrightNodeRunRecord> => {
  const startedAt = nowIso();
  const logs: string[] = [];
  const artifacts: PlaywrightNodeRunArtifact[] = [];
  const runArtifactsDir = resolveRunArtifactsDir(runId);
  await nodeFs.mkdir(runArtifactsDir, { recursive: true });
  const queuedRun = await readPlaywrightNodeRun(runId);
  await updateRunState(runId, {
    status: 'running',
    startedAt,
    logs,
    artifacts,
  });
  const liveRunState = createLiveRunStateCoordinator(runId);
  const queueLiveStateSnapshot = (): void => {
    liveRunState.queueUpdate(() => ({
      logs: [...logs],
      artifacts: [...artifacts],
    }));
  };
  const sleep = async (ms: number): Promise<void> => {
    const safeMs = Math.max(0, Math.trunc(ms));
    await new Promise<void>((resolve) => setTimeout(resolve, safeMs));
  };

  const playwright = getPlaywright();
  const { effectiveSettings, contextOptions, proxyAffinityResult } = await prepareRunConfiguration({
    runId,
    request,
    queuedRun,
    runArtifactsDir,
    logs,
  });
  logs.push('[runtime] Prepared Playwright runtime configuration.');
  queueLiveStateSnapshot();

  const timeoutMs = Math.max(1_000, request.timeoutMs ?? 120_000);

  const browserEngine = request.browserEngine ?? 'chromium';
  const effectiveLaunchOptions = isChromiumBrowserEngine(browserEngine)
    ? buildChromiumAntiDetectionLaunchOptions(proxyAffinityResult.launchOptions)
    : proxyAffinityResult.launchOptions;
  const stickySessionDescriptor = isChromiumBrowserEngine(browserEngine)
    ? resolveStickySessionDescriptor({
        ownerUserId: queuedRun?.ownerUserId ?? null,
        instance: queuedRun?.instance ?? null,
        personaId: request.personaId,
        identityProfile: effectiveSettings.identityProfile,
        startUrl: request.startUrl,
        explicitStorageState:
          typeof contextOptions.storageState === 'string' ? undefined : contextOptions.storageState,
      })
    : null;
  const stickySessionStorageState = stickySessionDescriptor !== null
    ? await loadStickySessionStorageState(stickySessionDescriptor, logs)
    : undefined;
  const contextOptionsWithStickyState =
    stickySessionStorageState !== undefined &&
    stickySessionStorageState !== null &&
    contextOptions.storageState === undefined
      ? {
          ...contextOptions,
          storageState: stickySessionStorageState,
        }
      : contextOptions;

  const effectiveContextOptions = isChromiumBrowserEngine(browserEngine)
    ? buildChromiumAntiDetectionContextOptions(
        contextOptionsWithStickyState,
        effectiveSettings.identityProfile
      )
    : contextOptionsWithStickyState;
  const runtimeAntiDetectionBehavior = isChromiumBrowserEngine(browserEngine)
    ? resolveChromiumAntiDetectionRuntimeBehavior({
        identityProfile: effectiveSettings.identityProfile,
        startUrl: request.startUrl,
        overrides: {
          launchCooldownMs: effectiveSettings.launchCooldownMs,
          prewarmWaitMs: effectiveSettings.prewarmWaitMs,
          postStartUrlWaitMs: effectiveSettings.postStartUrlWaitMs,
        },
      })
    : {
        prewarmUrl: null,
        prewarmWaitMs: 0,
        postStartUrlWaitMs: 0,
        launchCooldownMs: 0,
      };
  const runtimePacingDescriptor = isChromiumBrowserEngine(browserEngine)
    ? resolveChromiumRuntimePacingDescriptor({
        identityProfile: effectiveSettings.identityProfile,
        startUrl: request.startUrl,
      })
    : null;
  const policyAllowedHosts = normalizePolicyAllowedHosts(request.policyAllowedHosts);
  const contextRegistry = request.contextRegistry ?? null;
  const contextRegistryPrompt = buildAiPathsContextRegistrySystemPrompt(
    contextRegistry?.resolved ?? null
  );
  const runtimePostureSnapshot = buildRuntimePostureSnapshot({
    browserEngine,
    effectiveLaunchOptions,
    effectiveContextOptions,
    effectiveSettings,
    runtimeAntiDetectionBehavior,
    runtimePacingDescriptor,
    stickySessionDescriptor,
    stickySessionStorageState,
    proxyAffinityResult,
  });
  try {
    artifacts.push(
      await saveFileArtifact({
        runArtifactsDir,
        name: 'runtime-posture',
        extension: 'json',
        content: `${JSON.stringify(runtimePostureSnapshot, null, 2)}\n`,
        mimeType: 'application/json',
        kind: 'json',
      })
    );
  } catch (error) {

    await ErrorSystem.captureException(error);
  }

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  const runtimeLifecycle = {
    browserDisconnected: false,
    contextClosed: false,
    pageClosed: false,
    pageCrashed: false,
  };
  const logRuntimeLifecycle = (
    key: keyof typeof runtimeLifecycle,
    message: string
  ): void => {
    if (runtimeLifecycle[key]) {
      return;
    }
    runtimeLifecycle[key] = true;
    logs.push(message);
  };
  let stickySessionStatePersisted = false;
  let videoArtifactPersisted = false;
  let pageCleanupAttempted = false;
  let runtimeCleanupAttempted = false;
  const isRunnerPageOpen = (): boolean =>
    page !== null &&
    runtimeLifecycle.pageClosed === false &&
    runtimeLifecycle.pageCrashed === false &&
    (typeof page.isClosed !== 'function' || page.isClosed() === false);
  const persistStickySessionStorageStateOnce = async (): Promise<void> => {
    if (stickySessionStatePersisted) {
      return;
    }
    stickySessionStatePersisted = true;
    await persistStickySessionStorageState({
      context,
      descriptor: stickySessionDescriptor,
      logs,
    });
  };
  const persistVideoArtifactOnce = async (): Promise<boolean> => {
    if (videoArtifactPersisted) {
      return false;
    }
    videoArtifactPersisted = true;
    return persistVideoArtifact({
      artifacts,
      logs,
      page,
      request,
      runArtifactsDir,
    });
  };
  const closeRunnerPageOnce = async (): Promise<void> => {
    if (pageCleanupAttempted) {
      return;
    }
    pageCleanupAttempted = true;
    if (!isRunnerPageOpen()) {
      return;
    }
    await page
      ?.close({ runBeforeUnload: false })
      .catch(() => undefined);
    if (page !== null && typeof page.isClosed === 'function' && page.isClosed()) {
      logRuntimeLifecycle('pageClosed', '[runtime] Runner page closed.');
    }
  };
  const closePlaywrightRuntimeOnce = async (): Promise<void> => {
    if (runtimeCleanupAttempted) {
      return;
    }
    runtimeCleanupAttempted = true;
    await closeRunnerPageOnce();
    if (context) {
      const contextClosed = await context.close().then(() => true).catch(() => false);
      if (contextClosed) {
        logRuntimeLifecycle('contextClosed', '[runtime] Browser context closed.');
      }
    }
    if (browser) {
      const browserClosed = await browser.close().then(() => true).catch(() => false);
      if (browserClosed) {
        logRuntimeLifecycle('browserDisconnected', '[runtime] Browser disconnected.');
      }
    }
  };
  try {
    await waitForChromiumRuntimePacing({
      descriptor: runtimePacingDescriptor,
      cooldownMs: runtimeAntiDetectionBehavior.launchCooldownMs,
      logs,
      sleep,
    });
    logs.push(`[runtime] Launching ${browserEngine} browser.`);
    logs.push(
      `[runtime] Anti-detection posture: browser=${runtimePostureSnapshot.browser.label}, profile=${runtimePostureSnapshot.antiDetection.identityProfile}, locale=${runtimePostureSnapshot.antiDetection.locale ?? 'default'}, timezone=${runtimePostureSnapshot.antiDetection.timezoneId ?? 'default'}, proxy=${runtimePostureSnapshot.antiDetection.proxy.enabled ? `${runtimePostureSnapshot.antiDetection.proxy.providerPreset}/${runtimePostureSnapshot.antiDetection.proxy.sessionMode}/${runtimePostureSnapshot.antiDetection.proxy.reason}` : 'disabled'}.`
    );
    queueLiveStateSnapshot();
    browser = await withTimeout(
      getBrowserType(playwright, browserEngine).launch(effectiveLaunchOptions),
      PLAYWRIGHT_STARTUP_TIMEOUT_MS,
      `Timed out launching ${browserEngine} browser.`
    );
    browser.on('disconnected', () => {
      logRuntimeLifecycle('browserDisconnected', '[runtime] Browser disconnected.');
    });
    context = await withTimeout(
      browser.newContext(effectiveContextOptions),
      PLAYWRIGHT_STARTUP_TIMEOUT_MS,
      'Timed out creating Playwright browser context.'
    );
    context.on('close', () => {
      logRuntimeLifecycle('contextClosed', '[runtime] Browser context closed.');
    });
    context.setDefaultTimeout(effectiveSettings.timeout);
    context.setDefaultNavigationTimeout(effectiveSettings.navigationTimeout);
    await registerOutboundPolicyRoute(context, logs, policyAllowedHosts);
    if (isChromiumBrowserEngine(browserEngine)) {
      await installChromiumAntiDetectionInitScript(context, {
        locale: effectiveContextOptions.locale,
        userAgent: effectiveContextOptions.userAgent,
      });
      logs.push(
        `[runtime] Applied Chromium anti-detection defaults (profile: ${effectiveSettings.identityProfile}).`
      );
    }

    if (request.capture?.trace === true) {
      await withTimeout(
        context.tracing.start({
          screenshots: true,
          snapshots: true,
          sources: true,
        }),
        PLAYWRIGHT_STARTUP_TIMEOUT_MS,
        'Timed out starting Playwright trace capture.'
      );
      logs.push('[runtime] Trace capture started.');
      queueLiveStateSnapshot();
    }

    page = await withTimeout(
      context.newPage(),
      PLAYWRIGHT_STARTUP_TIMEOUT_MS,
      'Timed out creating Playwright page.'
    );
    page.on('close', () => {
      logRuntimeLifecycle('pageClosed', '[runtime] Runner page closed.');
    });
    page.on('crash', () => {
      logRuntimeLifecycle('pageCrashed', '[runtime] Runner page crashed.');
    });
    queueLiveStateSnapshot();

    if (request.preventNewPages === true) {
      const runnerPage = page;
      context.on('page', async (newPage: Page) => {
        if (newPage === runnerPage) {
          return;
        }
        logs.push('[runtime] Blocked new page/tab — scripts must use the provided page.');
        await newPage.close().catch(() => undefined);
      });
    }

    const trimmedStartUrl = request.startUrl?.trim() ?? '';
    if (trimmedStartUrl !== '') {

      const newTabSettleMs = pickDelayInRange(
        effectiveSettings.actionDelayMin,
        effectiveSettings.actionDelayMax
      );
      if (newTabSettleMs > 0) {
        logs.push(`[runtime] New tab opened — settling ${newTabSettleMs}ms before focusing the address bar.`);
        await sleep(newTabSettleMs);
      }
      const allowedByPolicyOverride = isPolicyAllowedHost(trimmedStartUrl, policyAllowedHosts);
      const decision = allowedByPolicyOverride
        ? { allowed: true, reason: null }
        : evaluateOutboundUrlPolicy(trimmedStartUrl);
      if (decision.allowed === false) {
        throw new Error(
          `Blocked outbound URL (${decision.reason ?? 'policy_violation'}): ${trimmedStartUrl}`
        );
      }

      if ((runtimeAntiDetectionBehavior.prewarmUrl ?? '') !== '') {
        logs.push(`[runtime] Prewarming target origin: ${runtimeAntiDetectionBehavior.prewarmUrl as string}`);
        await page.goto(runtimeAntiDetectionBehavior.prewarmUrl as string, {
          waitUntil: 'domcontentloaded',
          timeout: effectiveSettings.navigationTimeout,
        });
        if (runtimeAntiDetectionBehavior.prewarmWaitMs > 0) {
          await sleep(runtimeAntiDetectionBehavior.prewarmWaitMs);
          logs.push(
            `[runtime] Settled prewarm navigation for ${runtimeAntiDetectionBehavior.prewarmWaitMs}ms.`
          );
        }
      }
      const perCharTypingDelay = pickDelayInRange(
        effectiveSettings.inputDelayMin,
        effectiveSettings.inputDelayMax
      );
      const typingDurationMs = trimmedStartUrl.length * perCharTypingDelay;
      const preEnterReviewMs = pickDelayInRange(
        effectiveSettings.actionDelayMin,
        effectiveSettings.actionDelayMax
      );
      logs.push(
        `[runtime] Simulating address bar typing for ${trimmedStartUrl.length} chars @ ~${perCharTypingDelay}ms/char (${typingDurationMs}ms) + ${preEnterReviewMs}ms pre-Enter pause.`
      );
      if (typingDurationMs > 0) {
        await sleep(typingDurationMs);
      }
      if (preEnterReviewMs > 0) {
        await sleep(preEnterReviewMs);
      }
      logs.push(`[runtime] Navigating to start URL: ${trimmedStartUrl}`);
      await page.goto(trimmedStartUrl, {
        waitUntil: 'load',
        timeout: effectiveSettings.navigationTimeout,
      });
      if (runtimeAntiDetectionBehavior.postStartUrlWaitMs > 0) {
        await sleep(runtimeAntiDetectionBehavior.postStartUrlWaitMs);
        logs.push(
          `[runtime] Settled start URL navigation for ${runtimeAntiDetectionBehavior.postStartUrlWaitMs}ms.`
        );
      }
      const viewportSize =
        effectiveSettings.postLoadNudgeEnabled !== false &&
        typeof page.viewportSize === 'function'
          ? page.viewportSize()
          : null;
      if (viewportSize) {
        const baselineX = Math.trunc(viewportSize.width * 0.45);
        const baselineY = Math.trunc(viewportSize.height * 0.35);
        const nudgeX = clampNumber(baselineX + pickSignedOffset(80), 4, viewportSize.width - 4);
        const nudgeY = clampNumber(baselineY + pickSignedOffset(60), 4, viewportSize.height - 4);
        await page.mouse
          .move(nudgeX, nudgeY, { steps: 10 + Math.floor(Math.random() * 8) })
          .catch(() => undefined);
        const nudgeSettleMs = pickDelayInRange(
          effectiveSettings.clickDelayMin,
          effectiveSettings.clickDelayMax
        );
        if (nudgeSettleMs > 0) {
          await sleep(nudgeSettleMs);
        }
        logs.push(
          `[runtime] Nudged cursor to (${nudgeX}, ${nudgeY}) after load (+${nudgeSettleMs}ms settle).`
        );
      }
    }

    if (contextRegistry) {
      logs.push(
        `[context] Loaded Context Registry bundle with ${contextRegistry.refs.length} refs and ${
          contextRegistry.resolved?.documents.length ?? 0
        } runtime documents.`
      );
    }

    const emittedOutputs: Record<string, unknown> = {};
    const inlineArtifacts: Array<{ name: string; value: unknown }> = [];
    const buildLiveResultSnapshot = (): {
      outputs: Record<string, unknown>;
      inlineArtifacts: Array<{ name: string; value: unknown }>;
    } => ({
      outputs: { ...emittedOutputs },
      inlineArtifacts: [...inlineArtifacts],
    });
    const pauseForRange = async (min: number, max: number): Promise<number> => {
      const delayMs = pickDelayInRange(min, max);
      if (delayMs > 0) {
        await sleep(delayMs);
      }
      return delayMs;
    };
    const pauseForAction = async (): Promise<number> =>
      pauseForRange(effectiveSettings.actionDelayMin, effectiveSettings.actionDelayMax);
    const typeText = async (
      value: string,
      options?: {
        delayMs?: number | null;
        typeOptions?: Record<string, unknown>;
      }
    ): Promise<void> => {
      if (!page?.keyboard?.type) {
        throw new Error('Playwright keyboard.type is not available.');
      }
      const typeOptions = { ...(options?.typeOptions ?? {}) };
      const delayMs =
        options?.delayMs == null
          ? pickDelayInRange(effectiveSettings.inputDelayMin, effectiveSettings.inputDelayMax)
          : Math.max(0, Math.trunc(options.delayMs));
      if (delayMs > 0 && typeOptions['delay'] === undefined) {
        typeOptions['delay'] = delayMs;
      }
      await page.keyboard.type(value, typeOptions);
    };
    const pressKey = async (
      key: string,
      options?: {
        delayMs?: number | null;
        pressOptions?: Record<string, unknown>;
      }
    ): Promise<void> => {
      if (!page?.keyboard?.press) {
        throw new Error('Playwright keyboard.press is not available.');
      }
      const pressOptions = { ...(options?.pressOptions ?? {}) };
      const delayMs =
        options?.delayMs == null
          ? pickDelayInRange(effectiveSettings.inputDelayMin, effectiveSettings.inputDelayMax)
          : Math.max(0, Math.trunc(options.delayMs));
      if (delayMs > 0 && pressOptions['delay'] === undefined) {
        pressOptions['delay'] = delayMs;
      }
      await page.keyboard.press(key, pressOptions);
    };
    const moveMouseToTarget = async (target: PlaywrightHelperTarget): Promise<boolean> => {
      if (!effectiveSettings.humanizeMouse || !page?.mouse || typeof target?.boundingBox !== 'function') {
        return false;
      }
      const box = await Promise.resolve(target.boundingBox()).catch(() => null);
      if (
        !box ||
        !Number.isFinite(box.x) ||
        !Number.isFinite(box.y) ||
        !Number.isFinite(box.width) ||
        !Number.isFinite(box.height)
      ) {
        return false;
      }
      const jitter = Math.max(0, Math.trunc(effectiveSettings.mouseJitter));
      const safeWidth = Math.max(2, box.width);
      const safeHeight = Math.max(2, box.height);
      const centerX = box.x + safeWidth / 2;
      const centerY = box.y + safeHeight / 2;
      const offsetX = pickSignedOffset(jitter);
      const offsetY = pickSignedOffset(jitter);
      const targetX = clampNumber(centerX + offsetX, box.x + 1, box.x + safeWidth - 1);
      const targetY = clampNumber(centerY + offsetY, box.y + 1, box.y + safeHeight - 1);
      const steps = Math.max(6, Math.min(24, 8 + jitter));
      await page.mouse.move(targetX, targetY, { steps });
      return true;
    };
    const focusTarget = async (
      target: PlaywrightHelperTarget,
      options?: {
        scroll?: boolean;
        clickDelayMs?: number | null;
        clickOptions?: Record<string, unknown>;
      }
    ): Promise<boolean> => {
      if (!target) {
        throw new Error('Playwright helper target is required.');
      }
      if (options?.scroll !== false && typeof target.scrollIntoViewIfNeeded === 'function') {
        await Promise.resolve(target.scrollIntoViewIfNeeded()).catch(() => undefined);
      }
      await moveMouseToTarget(target).catch(() => false);
      if (typeof target.click !== 'function') {
        return false;
      }
      const clickOptions = { ...(options?.clickOptions ?? {}) };
      const clickDelay =
        options?.clickDelayMs == null
          ? pickDelayInRange(effectiveSettings.clickDelayMin, effectiveSettings.clickDelayMax)
          : Math.max(0, Math.trunc(options.clickDelayMs));
      if (clickDelay > 0 && clickOptions['delay'] === undefined) {
        clickOptions['delay'] = clickDelay;
      }
      await Promise.resolve(target.click(clickOptions));
      return true;
    };
    const clearFocusedField = async (): Promise<void> => {
      await pressKey('ControlOrMeta+A', { delayMs: 0 });
      await pressKey('Delete', { delayMs: 0 });
      await pressKey('Backspace', { delayMs: 0 });
    };
    const aiRuntime: Record<string, unknown> = {};
    const userContext = {
      browser,
      context,
      page,
      input: request.input ?? {},
      runtime: aiRuntime,
      contextRegistry,
      contextRegistryPrompt: contextRegistryPrompt !== '' ? contextRegistryPrompt : null,
      emit: (port: string, value: unknown): void => {
        const normalizedPort = port.trim();
        if (normalizedPort === '') return;
        emittedOutputs[normalizedPort] = value;
        liveRunState.queueUpdate(() => ({
          result: buildLiveResultSnapshot(),
        }));
      },
      artifacts: {
        screenshot: async (name: string = 'screenshot'): Promise<string> => {
          if (page === null) throw new Error('Page is not available.');
          const artifact = await saveFileArtifact({
            runArtifactsDir,
            name,
            extension: 'png',
            content: await page.screenshot({ fullPage: true }),
            mimeType: 'image/png',
            kind: 'screenshot',
          });
          artifacts.push(artifact);
          return artifact.path;
        },
        file: async (
          name: string,
          value: string | Buffer,
          options?: { extension?: string; mimeType?: string; kind?: string }
        ): Promise<string> => {
          const extension = (options?.extension?.trim() ?? '') !== '' ? (options?.extension?.trim() as string) : 'bin';
          const mimeType = (options?.mimeType?.trim() ?? '') !== '' ? (options?.mimeType?.trim() as string) : 'application/octet-stream';
          const kind = (options?.kind?.trim() ?? '') !== '' ? (options?.kind?.trim() as string) : 'file';
          const artifact = await saveFileArtifact({
            runArtifactsDir,
            name,
            extension,
            content: value,
            mimeType,
            kind,
          });
          artifacts.push(artifact);
          return artifact.path;
        },
        html: async (name: string = 'page'): Promise<string> => {
          if (page === null) throw new Error('Page is not available.');
          const artifact = await saveFileArtifact({
            runArtifactsDir,
            name,
            extension: 'html',
            content: await page.content(),
            mimeType: 'text/html',
            kind: 'html',
          });
          artifacts.push(artifact);
          return artifact.path;
        },
        json: async (name: string, value: unknown): Promise<string> => {
          const artifact = await saveFileArtifact({
            runArtifactsDir,
            name: (name ?? '') !== '' ? name : 'artifact',
            extension: 'json',
            content: `${JSON.stringify(value, null, 2)}\n`,
            mimeType: 'application/json',
            kind: 'json',
          });
          artifacts.push(artifact);
          return artifact.path;
        },
        add: (name: string, value: unknown): void => {
          inlineArtifacts.push({ name: (name.trim() ?? '') !== '' ? name.trim() : 'artifact', value });
          liveRunState.queueUpdate(() => ({
            result: buildLiveResultSnapshot(),
          }));
        },
      },
      log: (...args: unknown[]): void => {
        logs.push(`[user] ${args.map(safeStringify).join(' ')}`);
      },
      helpers: {
        sleep,
        actionPause: async (): Promise<number> => pauseForAction(),
        click: async (
          target: PlaywrightHelperTarget,
          options?: {
            scroll?: boolean;
            pauseBefore?: boolean;
            pauseAfter?: boolean;
            delayMs?: number | null;
            clickOptions?: Record<string, unknown>;
          }
        ): Promise<void> => {
          if (options?.pauseBefore !== false) {
            await pauseForAction();
          }
          await focusTarget(target, {
            scroll: options?.scroll,
            clickDelayMs: options?.delayMs,
            clickOptions: options?.clickOptions,
          });
          if (options?.pauseAfter !== false) {
            await pauseForAction();
          }
        },
        fill: async (
          target: PlaywrightHelperTarget,
          value: string,
          options?: {
            scroll?: boolean;
            pauseBefore?: boolean;
            pauseAfter?: boolean;
            delayMs?: number | null;
            clear?: boolean;
            clickOptions?: Record<string, unknown>;
          }
        ): Promise<void> => {
          if (options?.pauseBefore !== false) {
            await pauseForAction();
          }
          const focused = await focusTarget(target, {
            scroll: options?.scroll,
            clickDelayMs: options?.delayMs,
            clickOptions: options?.clickOptions,
          });
          if (!focused) {
            throw new Error('Playwright fill helper target is not focusable.');
          }
          if (options?.clear !== false) {
            await clearFocusedField();
          }
          if (value) {
            await typeText(String(value), {
              delayMs: options?.delayMs,
            });
          }
          if (options?.pauseAfter !== false) {
            await pauseForAction();
          }
        },
        type: async (
          value: string,
          options?: {
            pauseBefore?: boolean;
            pauseAfter?: boolean;
            delayMs?: number | null;
            typeOptions?: Record<string, unknown>;
          }
        ): Promise<void> => {
          if (options?.pauseBefore !== false) {
            await pauseForAction();
          }
          await typeText(String(value), {
            delayMs: options?.delayMs,
            typeOptions: options?.typeOptions,
          });
          if (options?.pauseAfter !== false) {
            await pauseForAction();
          }
        },
        press: async (
          key: string,
          options?: {
            pauseBefore?: boolean;
            pauseAfter?: boolean;
            delayMs?: number | null;
            pressOptions?: Record<string, unknown>;
          }
        ): Promise<void> => {
          if (options?.pauseBefore !== false) {
            await pauseForAction();
          }
          await pressKey(key, {
            delayMs: options?.delayMs,
            pressOptions: options?.pressOptions,
          });
          if (options?.pauseAfter !== false) {
            await pauseForAction();
          }
        },
        aiEvaluate: async (opts: {
          inputSource: 'screenshot' | 'html' | 'text_content' | 'selector_text';
          data: string;
          systemPrompt?: string | null | undefined;
        }): Promise<{ output: string; modelId: string }> => {
          return evaluateStepWithAI(opts);
        },
        aiInject: async (opts: {
          goal: string;
          systemPrompt?: string | null | undefined;
          context: {
            iteration: number;
            maxIterations: number;
            url: string;
            dom?: string | null | undefined;
            priorEvaluation?: string | null | undefined;
            priorInjectorReasoning?: string | null | undefined;
          };
        }): Promise<{ code: string; done: boolean; reasoning: string; modelId: string }> => {
          return injectCodeWithAI(opts);
        },
        aiInjectExecute: async (code: string): Promise<void> => {
          if (!code.trim()) return;
          const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (...args: string[]) => (...args: unknown[]) => Promise<unknown>;
          const fn = new AsyncFunction('page', 'runtime', code);
          await fn(page, aiRuntime);
        },
      },
    };

    const isSupplier1688RuntimeRequest =
      isPlaywrightNodeRuntimeRunRequest(request) &&
      request.runtimeKey === SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY;
    const isAmazonReverseImageScanRuntimeRequest =
      isPlaywrightNodeRuntimeRunRequest(request) &&
      (
        request.runtimeKey === AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY ||
        request.runtimeKey === AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY ||
        request.runtimeKey === AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY
      );

    const returnValue = await withTimeout(
      (() => {
        if (isAmazonReverseImageScanRuntimeRequest) {
          return executeAmazonReverseImageScanRuntime({
            page,
            runtimeKey: request.runtimeKey,
            input: request.input ?? {},
            emit: userContext.emit,
            log: userContext.log,
            artifacts: userContext.artifacts,
            helpers: userContext.helpers,
          });
        }
        if (isSupplier1688RuntimeRequest) {
          return executeSupplier1688ProbeScanRuntime({
            page,
            input: request.input ?? {},
            emit: userContext.emit,
            log: userContext.log,
            artifacts: userContext.artifacts,
            helpers: userContext.helpers,
          });
        }
        if (isPlaywrightNodeRuntimeRunRequest(request)) {
          throw new Error(`Unsupported Playwright runtime request: ${request.runtimeKey}`);
        }
        return Promise.resolve(parseUserScript(request.script, logs)(userContext));
      })(),
      timeoutMs,
      isSupplier1688RuntimeRequest
        ? '1688 supplier probe runtime timed out.'
        : isAmazonReverseImageScanRuntimeRequest
          ? 'Amazon reverse-image runtime timed out.'
          : 'Playwright script timed out.'
    );

    await captureFinalRunArtifacts({
      artifacts,
      context,
      logs,
      page,
      request,
      runArtifactsDir,
    });

    await liveRunState.flush();
    liveRunState.finalize();
    const existingRun = await readPlaywrightNodeRun(runId);
    const finalState = await buildCompletedRunState({
      artifacts,
      emittedOutputs,
      existingRun,
      inlineArtifacts,
      logs,
      page,
      returnValue,
      runtimePosture: runtimePostureSnapshot,
      runId,
      startedAt,
    });
    await persistStickySessionStorageStateOnce();
    await closeRunnerPageOnce();
    await persistVideoArtifactOnce();
    await closePlaywrightRuntimeOnce();
    finalState.artifacts = artifacts;
    finalState.logs = logs;
    await writeRunState(finalState);
    return finalState;
  } catch (error) {
    await ErrorSystem.captureException(error);
    await liveRunState.flush();
    liveRunState.finalize();
    const existingRun = await readPlaywrightNodeRun(runId);
    const message = error instanceof Error ? error.message : String(error);
    await captureFailureArtifacts({
      artifacts,
      browserDisconnected: runtimeLifecycle.browserDisconnected,
      contextClosed: runtimeLifecycle.contextClosed,
      errorMessage: message,
      page,
      pageClosed: runtimeLifecycle.pageClosed,
      pageCrashed: runtimeLifecycle.pageCrashed,
      runArtifactsDir,
    });
    logs.push(`[runtime][error] ${message}`);
    const failureHoldOpenMs =
      typeof request.failureHoldOpenMs === 'number' &&
      Number.isFinite(request.failureHoldOpenMs)
        ? Math.max(0, Math.trunc(request.failureHoldOpenMs))
        : 0;
    const shouldHoldBrowserOpenOnFailure =
      failureHoldOpenMs > 0 &&
      shouldHoldBrowserOpenForFailure(message) &&
      effectiveSettings.headless === false &&
      browser !== null &&
      context !== null &&
      page !== null &&
      runtimeLifecycle.browserDisconnected === false &&
      runtimeLifecycle.contextClosed === false &&
      runtimeLifecycle.pageClosed === false &&
      runtimeLifecycle.pageCrashed === false &&
      (typeof page.isClosed !== 'function' || page.isClosed() === false);
    if (shouldHoldBrowserOpenOnFailure) {
      logs.push(
        `[runtime] Holding headed browser open for ${failureHoldOpenMs}ms after failure.`
      );
    }
    if (shouldHoldBrowserOpenOnFailure) {
      await sleep(failureHoldOpenMs);
    }
    await persistStickySessionStorageStateOnce();
    await closeRunnerPageOnce();
    await persistVideoArtifactOnce();
    await closePlaywrightRuntimeOnce();
    const failedState = buildFailedRunState({
      artifacts,
      errorMessage: message,
      existingRun,
      logs,
      runtimePosture: runtimePostureSnapshot,
      runId,
      startedAt,
    });
    await writeRunState(failedState);
    return failedState;
  } finally {
    await persistStickySessionStorageStateOnce();
    await closeRunnerPageOnce();
    await persistVideoArtifactOnce();
    await closePlaywrightRuntimeOnce();
    await updateRunState(runId, { artifacts, logs }).catch(() => undefined);
  }
};

export const enqueuePlaywrightNodeRun = async (input: {
  request: PlaywrightNodeRunRequest;
  waitForResult: boolean;
  ownerUserId?: string | null;
  instance?: PlaywrightNodeRunInstance | null;
}): Promise<PlaywrightNodeRunRecord> => {
  await cleanupOldRuns();
  const runId = randomUUID();
  const queuedState = {
    ...buildBaseRunState(runId),
    ownerUserId: input.ownerUserId?.trim() || null,
    instance: normalizeRunInstance(input.instance ?? null),
    requestSummary: summarizePlaywrightRunRequest(input.request),
  };
  await writeRunState(queuedState);
  await recordPlaywrightActionRunSnapshot(queuedState).catch(async (error: unknown) => {
    await ErrorSystem.captureException(error, {
      service: 'playwright-node-runner',
      action: 'record-action-run-history',
      runId,
    });
  });

  if (input.waitForResult) {
    return executePlaywrightNodeRun(runId, input.request);
  }

  void executePlaywrightNodeRun(runId, input.request).catch(async (error) => {
    const message = error instanceof Error ? error.message : String(error);
    await updateRunState(runId, {
      status: 'failed',
      completedAt: nowIso(),
      error: message,
      logs: [`[runtime][error] ${message}`],
    });
  });
  return queuedState;
};

export const readPlaywrightNodeRun = async (
  runId: string
): Promise<PlaywrightNodeRunRecord | null> => {
  const statePath = resolveRunStatePath(runId);
  try {
    const raw = await nodeFs.readFile(statePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!isObjectRecord(parsed)) return null;
    if (parsed['runId'] !== runId) return null;
    return {
      ...(parsed as PlaywrightNodeRunRecord),
      ownerUserId: typeof parsed['ownerUserId'] === 'string' ? parsed['ownerUserId'] : null,
      instance: normalizeRunInstance(
        isObjectRecord(parsed['instance']) ? (parsed['instance'] as PlaywrightNodeRunInstance) : null
      ),
    };
  } catch (error) {
    if (isNodeErrorWithCode(error, 'ENOENT')) {
      return null;
    }
    await ErrorSystem.captureException(error);
    return null;
  }
};

const sanitizeArtifactFileName = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (path.basename(trimmed) !== trimmed) return null;
  if (trimmed.includes('/') || trimmed.includes('\\')) return null;
  return trimmed;
};

export const readPlaywrightNodeArtifact = async (input: {
  runId: string;
  fileName: string;
}): Promise<PlaywrightNodeArtifactReadResult | null> => {
  const runId = input.runId.trim();
  const fileName = sanitizeArtifactFileName(input.fileName);
  if (!runId || !fileName) return null;

  const run = await readPlaywrightNodeRun(runId);
  if (!run) return null;

  const relativeArtifactPath = `${runId}/${fileName}`;
  const artifact =
    run.artifacts.find((candidate) => candidate.path === relativeArtifactPath) ?? null;
  if (!artifact) return null;

  const runRootDir = path.join(RUN_ROOT_DIR, runId);
  const absoluteArtifactPath = path.resolve(RUN_ROOT_DIR, artifact.path);
  if (
    absoluteArtifactPath !== runRootDir &&
    !absoluteArtifactPath.startsWith(`${runRootDir}${path.sep}`)
  ) {
    return null;
  }

  try {
    const stat = await nodeFs.stat(absoluteArtifactPath);
    if (!stat.isFile()) return null;
    const content = await nodeFs.readFile(absoluteArtifactPath);
    return {
      artifact,
      content,
    };
  } catch (error) {
    await ErrorSystem.captureException(error);
    return null;
  }
};
