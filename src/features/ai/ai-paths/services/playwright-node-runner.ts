import 'server-only';

import { randomUUID } from 'crypto';
import { createRequire } from 'module';
import os from 'os';
import path from 'path';
import vm from 'vm';

import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { ImageStudioRunStatus } from '@/shared/contracts/image-studio';
import {
  PLAYWRIGHT_PERSONA_SETTINGS_KEY,
  playwrightSettingsSchema,
  type PlaywrightPersona,
  type PlaywrightSettings,
} from '@/shared/contracts/playwright';
import { getSettingValue } from '@/shared/lib/ai/server-settings';
import { buildAiPathsContextRegistrySystemPrompt } from '@/shared/lib/ai-paths/context-registry/system-prompt';
import { defaultPlaywrightSettings } from '@/shared/lib/playwright/settings';
import { evaluateOutboundUrlPolicy } from '@/shared/lib/security/outbound-url-policy';
import { getFsPromises, joinRuntimePath } from '@/shared/lib/files/runtime-fs';
import { isObjectRecord } from '@/shared/utils/object-utils';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import type {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  BrowserType,
  LaunchOptions,
  Page,
} from 'playwright';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const RUN_ROOT_DIR = path.join(os.tmpdir(), 'ai-paths-playwright-runs');
const RUN_TTL_MS = 24 * 60 * 60 * 1000;
const nodeFs = getFsPromises();

const getPlaywright = (): typeof import('playwright') => {
  const requireFn = createRequire(import.meta.url);
  return requireFn('playwright') as typeof import('playwright');
};

const safeStringify = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  try {
    return JSON.stringify(value);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return '[unserializable]';
  }
};

const resolveRunStatePath = (runId: string): string => path.join(RUN_ROOT_DIR, `${runId}.json`);

const resolveRunArtifactsDir = (runId: string): string => path.join(RUN_ROOT_DIR, runId);

const ensureRunRoot = async (): Promise<void> => {
  await nodeFs.mkdir(RUN_ROOT_DIR, { recursive: true });
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
    if (timeoutRef) clearTimeout(timeoutRef);
  }
};

const cleanupOldRuns = async (): Promise<void> => {
  try {
    await ensureRunRoot();
    const now = Date.now();
    const entries = await nodeFs.readdir(RUN_ROOT_DIR, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const targetPath = path.join(RUN_ROOT_DIR, entry.name);
        const stat = await nodeFs.stat(targetPath).catch(() => null);
        if (!stat) return;
        if (now - stat.mtimeMs < RUN_TTL_MS) return;
        await nodeFs.rm(targetPath, { recursive: true, force: true }).catch(() => undefined);
      })
    );
  } catch (error) {
    void ErrorSystem.captureException(error);
  
    // best effort cleanup only
  }
};

export type PlaywrightNodeRunArtifact = {
  name: string;
  path: string;
  mimeType?: string | null;
  kind?: string | null;
};

export type PlaywrightNodeRunRecord = {
  runId: string;
  ownerUserId: string | null;
  status: ImageStudioRunStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  result?: unknown;
  error?: string | null;
  artifacts: PlaywrightNodeRunArtifact[];
  logs: string[];
};

export type PlaywrightNodeRunRequest = {
  script: string;
  input?: Record<string, unknown> | undefined;
  startUrl?: string | undefined;
  timeoutMs?: number | undefined;
  browserEngine?: 'chromium' | 'firefox' | 'webkit' | undefined;
  personaId?: string | undefined;
  settingsOverrides?: Record<string, unknown> | undefined;
  launchOptions?: Record<string, unknown> | undefined;
  contextOptions?: Record<string, unknown> | undefined;
  contextRegistry?: ContextRegistryConsumerEnvelope | null | undefined;
  capture?:
    | {
        screenshot?: boolean | undefined;
        html?: boolean | undefined;
        video?: boolean | undefined;
        trace?: boolean | undefined;
      }
    | undefined;
};

export type PlaywrightNodeArtifactReadResult = {
  artifact: PlaywrightNodeRunArtifact;
  content: Buffer;
};

const writeRunState = async (run: PlaywrightNodeRunRecord): Promise<void> => {
  await ensureRunRoot();
  const targetPath = resolveRunStatePath(run.runId);
  const tempPath = `${targetPath}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await nodeFs.writeFile(tempPath, `${JSON.stringify(run, null, 2)}\n`, 'utf8');
  await nodeFs.rename(tempPath, targetPath);
};

const nowIso = (): string => new Date().toISOString();

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
    artifacts: [],
    logs: [],
  };
};

const updateRunState = async (
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
    artifacts: patch.artifacts ?? base.artifacts ?? [],
    logs: patch.logs ?? base.logs ?? [],
  };
  await writeRunState(next);
  return next;
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

const buildLaunchOptions = (
  settings: PlaywrightSettings,
  launchOverrides: Record<string, unknown>,
  capture: PlaywrightNodeRunRequest['capture']
): LaunchOptions => {
  const base: LaunchOptions = {
    headless: settings.headless,
    slowMo: settings.slowMo,
  };
  if (settings.proxyEnabled && settings.proxyServer) {
    base.proxy = {
      server: settings.proxyServer,
      ...(settings.proxyUsername ? { username: settings.proxyUsername } : {}),
      ...(settings.proxyPassword ? { password: settings.proxyPassword } : {}),
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

const buildContextOptions = (
  playwright: typeof import('playwright'),
  settings: PlaywrightSettings,
  runArtifactsDir: string,
  contextOverrides: Record<string, unknown>,
  capture: PlaywrightNodeRunRequest['capture']
): BrowserContextOptions => {
  const devicePreset =
    settings.emulateDevice && settings.deviceName
      ? playwright.devices?.[settings.deviceName]
      : undefined;
  const base: BrowserContextOptions = {
    ...(devicePreset ?? {}),
  };
  if (capture?.video) {
    base.recordVideo = {
      dir: runArtifactsDir,
      size: {
        width: 1280,
        height: 720,
      },
    };
  }
  return {
    ...base,
    ...(contextOverrides as BrowserContextOptions),
  };
};

const parseUserScript = (
  source: string,
  logs: string[]
): ((context: Record<string, unknown>) => Promise<unknown>) => {
  const normalizedSource = source.replace(/^\s*export\s+default\s+/m, 'const defaultExport = ');
  const bootstrap = `
    "use strict";
    let __playwrightNodeFn = null;
    const module = { exports: {} };
    const exports = module.exports;
    ${normalizedSource}
    if (typeof run === 'function') __playwrightNodeFn = run;
    if (!__playwrightNodeFn && typeof defaultExport === 'function') __playwrightNodeFn = defaultExport;
    if (!__playwrightNodeFn && typeof module.exports === 'function') __playwrightNodeFn = module.exports;
    if (!__playwrightNodeFn && module.exports && typeof module.exports.default === 'function') __playwrightNodeFn = module.exports.default;
    if (!__playwrightNodeFn && exports && typeof exports.default === 'function') __playwrightNodeFn = exports.default;
    __playwrightNodeFn;
  `;
  const script = new vm.Script(bootstrap, {
    filename: 'ai-paths-playwright-node.user.js',
  });
  const sandbox = {
    console: {
      log: (...args: unknown[]) => logs.push(`[console.log] ${args.map(safeStringify).join(' ')}`),
      info: (...args: unknown[]) =>
        logs.push(`[console.info] ${args.map(safeStringify).join(' ')}`),
      warn: (...args: unknown[]) =>
        logs.push(`[console.warn] ${args.map(safeStringify).join(' ')}`),
      error: (...args: unknown[]) =>
        logs.push(`[console.error] ${args.map(safeStringify).join(' ')}`),
    },
    setTimeout,
    clearTimeout,
    URL,
    TextEncoder,
    TextDecoder,
  };
  const resolved: unknown = script.runInNewContext(sandbox, { timeout: 250 });
  if (typeof resolved !== 'function') {
    throw new Error('Playwright script must export a default async function or define `run`.');
  }
  return resolved as (context: Record<string, unknown>) => Promise<unknown>;
};

const registerOutboundPolicyRoute = async (
  context: BrowserContext,
  logs: string[]
): Promise<void> => {
  await context.route('**/*', async (route) => {
    const requestUrl = route.request().url();
    let parsed: URL;
    try {
      parsed = new URL(requestUrl);
    } catch (error) {
      void ErrorSystem.captureException(error);
      await route.continue();
      return;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
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

const resolveRelativeArtifactPath = (artifactPath: string): string =>
  path.relative(RUN_ROOT_DIR, artifactPath).replace(/\\/g, '/');

const saveFileArtifact = async (
  runArtifactsDir: string,
  name: string,
  extension: string,
  content: string | Buffer,
  mimeType: string,
  kind: string
): Promise<PlaywrightNodeRunArtifact> => {
  const safeName = name.trim().replace(/[^a-zA-Z0-9-_]+/g, '_') || kind;
  const fileName = `${safeName}-${Date.now()}.${extension}`;
  const filePath = joinRuntimePath(runArtifactsDir, fileName);
  await nodeFs.writeFile(filePath, content);
  return {
    name,
    path: resolveRelativeArtifactPath(filePath),
    mimeType,
    kind,
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
  await updateRunState(runId, {
    status: 'running',
    startedAt,
    logs,
    artifacts,
  });

  const playwright = getPlaywright();
  const personaSettings = await resolvePersonaSettings(request.personaId);
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
  const contextOptions = buildContextOptions(
    playwright,
    effectiveSettings,
    runArtifactsDir,
    request.contextOptions ?? {},
    request.capture
  );
  const timeoutMs = Math.max(1_000, request.timeoutMs ?? 120_000);
  const browserEngine = request.browserEngine ?? 'chromium';
  const contextRegistry = request.contextRegistry ?? null;
  const contextRegistryPrompt = buildAiPathsContextRegistrySystemPrompt(
    contextRegistry?.resolved ?? null
  );

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  try {
    logs.push(`[runtime] Launching ${browserEngine} browser.`);
    browser = await getBrowserType(playwright, browserEngine).launch(launchOptions);
    context = await browser.newContext(contextOptions);
    context.setDefaultTimeout(effectiveSettings.timeout);
    context.setDefaultNavigationTimeout(effectiveSettings.navigationTimeout);
    await registerOutboundPolicyRoute(context, logs);

    if (request.capture?.trace) {
      await context.tracing.start({
        screenshots: true,
        snapshots: true,
        sources: true,
      });
      logs.push('[runtime] Trace capture started.');
    }

    page = await context.newPage();

    if (request.startUrl?.trim()) {
      const decision = evaluateOutboundUrlPolicy(request.startUrl);
      if (!decision.allowed) {
        throw new Error(
          `Blocked outbound URL (${decision.reason ?? 'policy_violation'}): ${request.startUrl}`
        );
      }
      logs.push(`[runtime] Navigating to start URL: ${request.startUrl}`);
      await page.goto(request.startUrl, {
        waitUntil: 'domcontentloaded',
        timeout: effectiveSettings.navigationTimeout,
      });
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
    const userScript = parseUserScript(request.script, logs);
    const userContext = {
      browser,
      context,
      page,
      input: request.input ?? {},
      contextRegistry,
      contextRegistryPrompt: contextRegistryPrompt || null,
      emit: (port: string, value: unknown): void => {
        const normalizedPort = port.trim();
        if (!normalizedPort) return;
        emittedOutputs[normalizedPort] = value;
      },
      artifacts: {
        screenshot: async (name: string = 'screenshot'): Promise<string> => {
          if (!page) throw new Error('Page is not available.');
          const artifact = await saveFileArtifact(
            runArtifactsDir,
            name,
            'png',
            await page.screenshot({ fullPage: true }),
            'image/png',
            'screenshot'
          );
          artifacts.push(artifact);
          return artifact.path;
        },
        html: async (name: string = 'page'): Promise<string> => {
          if (!page) throw new Error('Page is not available.');
          const artifact = await saveFileArtifact(
            runArtifactsDir,
            name,
            'html',
            await page.content(),
            'text/html',
            'html'
          );
          artifacts.push(artifact);
          return artifact.path;
        },
        json: async (name: string, value: unknown): Promise<string> => {
          const artifact = await saveFileArtifact(
            runArtifactsDir,
            name || 'artifact',
            'json',
            `${JSON.stringify(value, null, 2)}\n`,
            'application/json',
            'json'
          );
          artifacts.push(artifact);
          return artifact.path;
        },
        add: (name: string, value: unknown): void => {
          inlineArtifacts.push({ name: name.trim() || 'artifact', value });
        },
      },
      log: (...args: unknown[]): void => {
        logs.push(`[user] ${args.map(safeStringify).join(' ')}`);
      },
      helpers: {
        sleep: async (ms: number): Promise<void> => {
          const safeMs = Math.max(0, Math.trunc(ms));
          await new Promise<void>((resolve) => setTimeout(resolve, safeMs));
        },
      },
    };

    const returnValue = await withTimeout(
      Promise.resolve(userScript(userContext)),
      timeoutMs,
      'Playwright script timed out.'
    );

    if (request.capture?.screenshot) {
      const screenshotArtifact = await saveFileArtifact(
        runArtifactsDir,
        'final',
        'png',
        await page.screenshot({ fullPage: true }),
        'image/png',
        'screenshot'
      );
      artifacts.push(screenshotArtifact);
    }
    if (request.capture?.html) {
      const htmlArtifact = await saveFileArtifact(
        runArtifactsDir,
        'final',
        'html',
        await page.content(),
        'text/html',
        'html'
      );
      artifacts.push(htmlArtifact);
    }

    if (request.capture?.trace && context) {
      const tracePath = path.join(runArtifactsDir, `trace-${Date.now()}.zip`);
      await context.tracing.stop({ path: tracePath });
      artifacts.push({
        name: 'trace',
        path: resolveRelativeArtifactPath(tracePath),
        mimeType: 'application/zip',
        kind: 'trace',
      });
      logs.push('[runtime] Trace capture saved.');
    }

    const completedAt = nowIso();
    const existingRun = await readPlaywrightNodeRun(runId);
    const result = {
      returnValue,
      outputs: emittedOutputs,
      inlineArtifacts,
      finalUrl: page.url(),
      title: await page.title().catch(() => ''),
    };
    const finalState: PlaywrightNodeRunRecord = {
      runId,
      ownerUserId: existingRun?.ownerUserId ?? null,
      status: 'completed',
      startedAt,
      completedAt,
      createdAt: existingRun?.createdAt ?? startedAt,
      updatedAt: completedAt,
      result,
      error: null,
      artifacts,
      logs,
    };
    await writeRunState(finalState);
    return finalState;
  } catch (error) {
    void ErrorSystem.captureException(error);
    const completedAt = nowIso();
    const existingRun = await readPlaywrightNodeRun(runId);
    const message = error instanceof Error ? error.message : String(error);
    logs.push(`[runtime][error] ${message}`);
    const failedState: PlaywrightNodeRunRecord = {
      runId,
      ownerUserId: existingRun?.ownerUserId ?? null,
      status: 'failed',
      startedAt,
      completedAt,
      createdAt: existingRun?.createdAt ?? startedAt,
      updatedAt: completedAt,
      result: null,
      error: message,
      artifacts,
      logs,
    };
    await writeRunState(failedState);
    return failedState;
  } finally {
    let shouldPersistArtifacts = false;
    if (page && request.capture?.video) {
      try {
        const video = page.video();
        if (video) {
          const videoPath = await video.path();
          const targetVideoPath = path.join(runArtifactsDir, `video-${Date.now()}.webm`);
          await nodeFs.copyFile(videoPath, targetVideoPath);
          artifacts.push({
            name: 'video',
            path: resolveRelativeArtifactPath(targetVideoPath),
            mimeType: 'video/webm',
            kind: 'video',
          });
          logs.push('[runtime] Video capture saved.');
          shouldPersistArtifacts = true;
        }
      } catch (error) {
        void ErrorSystem.captureException(error);
      
        // best effort
      }
    }
    if (shouldPersistArtifacts) {
      await updateRunState(runId, { artifacts, logs }).catch(() => undefined);
    }
    if (context) {
      await context.close().catch(() => undefined);
    }
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
};

export const enqueuePlaywrightNodeRun = async (input: {
  request: PlaywrightNodeRunRequest;
  waitForResult: boolean;
  ownerUserId?: string | null;
}): Promise<PlaywrightNodeRunRecord> => {
  await cleanupOldRuns();
  const runId = randomUUID();
  const queuedState = {
    ...buildBaseRunState(runId),
    ownerUserId: input.ownerUserId?.trim() || null,
  };
  await writeRunState(queuedState);

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
    };
  } catch (error) {
    void ErrorSystem.captureException(error);
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
    void ErrorSystem.captureException(error);
    return null;
  }
};
