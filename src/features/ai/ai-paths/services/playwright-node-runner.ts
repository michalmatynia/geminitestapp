import 'server-only';

import { randomUUID } from 'crypto';
import { createRequire } from 'module';
import os from 'os';
import path from 'path';

import {
  PLAYWRIGHT_PERSONA_SETTINGS_KEY,
  playwrightSettingsSchema,
  type PlaywrightPersona,
  type PlaywrightSettings,
} from '@/shared/contracts/playwright';
import { getSettingValue } from '@/shared/lib/ai/server-settings';
import { buildAiPathsContextRegistrySystemPrompt } from '@/shared/lib/ai-paths/context-registry/system-prompt';
import { sanitizePlaywrightStorageState } from '@/shared/lib/playwright/storage-state';
import { defaultPlaywrightSettings } from '@/shared/lib/playwright/settings';
import { evaluateOutboundUrlPolicy } from '@/shared/lib/security/outbound-url-policy';
import { getFsPromises } from '@/shared/lib/files/runtime-fs';
import { isObjectRecord } from '@/shared/utils/object-utils';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { parseUserScript, safeStringify } from './playwright-node-runner.parser';
export { validatePlaywrightNodeScript } from './playwright-node-runner.parser';
export * from './playwright-node-runner.types';
import type {
  PlaywrightNodeRunArtifact,
  PlaywrightNodeRunRecord,
  PlaywrightNodeRunRequest,
  PlaywrightNodeArtifactReadResult,
} from './playwright-node-runner.types';

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
  getPlaywright,
  type PlaywrightHelperTarget,
  pickDelayInRange,
  pickSignedOffset,
  clampNumber,
  resolveRunStatePath,
  resolveRunArtifactsDir,
} from './playwright-node-runner.helpers';

const nodeFs = getFsPromises();

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
    artifacts: [],
    logs: [],
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
  capture: PlaywrightNodeRunRequest['capture'],
  startUrl?: string
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
  const merged = {
    ...base,
    ...(contextOverrides as BrowserContextOptions),
  };
  if (typeof merged.storageState !== 'string' && merged.storageState) {
    const sanitizedStorageState = sanitizePlaywrightStorageState(merged.storageState, {
      fallbackOrigin: startUrl ?? null,
    });
    if (sanitizedStorageState) {
      merged.storageState = sanitizedStorageState as BrowserContextOptions['storageState'];
    } else {
      delete merged.storageState;
    }
  }
  return merged;
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
      void ErrorSystem.captureException(error);
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
  const liveRunState = createLiveRunStateCoordinator(runId);

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
    request.capture,
    request.startUrl
  );
  const timeoutMs = Math.max(1_000, request.timeoutMs ?? 120_000);
  const browserEngine = request.browserEngine ?? 'chromium';
  const policyAllowedHosts = normalizePolicyAllowedHosts(request.policyAllowedHosts);
  const contextRegistry = request.contextRegistry ?? null;
  const contextRegistryPrompt = buildAiPathsContextRegistrySystemPrompt(
    contextRegistry?.resolved ?? null
  );

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
  try {
    logs.push(`[runtime] Launching ${browserEngine} browser.`);
    browser = await getBrowserType(playwright, browserEngine).launch(launchOptions);
    browser.on('disconnected', () => {
      logRuntimeLifecycle('browserDisconnected', '[runtime] Browser disconnected.');
    });
    context = await browser.newContext(contextOptions);
    context.on('close', () => {
      logRuntimeLifecycle('contextClosed', '[runtime] Browser context closed.');
    });
    context.setDefaultTimeout(effectiveSettings.timeout);
    context.setDefaultNavigationTimeout(effectiveSettings.navigationTimeout);
    await registerOutboundPolicyRoute(context, logs, policyAllowedHosts);

    if (request.capture?.trace) {
      await context.tracing.start({
        screenshots: true,
        snapshots: true,
        sources: true,
      });
      logs.push('[runtime] Trace capture started.');
    }

    page = await context.newPage();
    page.on('close', () => {
      logRuntimeLifecycle('pageClosed', '[runtime] Runner page closed.');
    });
    page.on('crash', () => {
      logRuntimeLifecycle('pageCrashed', '[runtime] Runner page crashed.');
    });

    if (request.preventNewPages) {
      const runnerPage = page;
      context.on('page', async (newPage: Page) => {
        if (newPage === runnerPage) {
          return;
        }
        logs.push('[runtime] Blocked new page/tab — scripts must use the provided page.');
        await newPage.close().catch(() => undefined);
      });
    }

    if (request.startUrl?.trim()) {
      const allowedByPolicyOverride = isPolicyAllowedHost(request.startUrl, policyAllowedHosts);
      const decision = allowedByPolicyOverride
        ? { allowed: true, reason: null }
        : evaluateOutboundUrlPolicy(request.startUrl);
      if (!decision.allowed) {
        throw new Error(
          `Blocked outbound URL (${decision.reason ?? 'policy_violation'}): ${request.startUrl}`
        );
      }
      logs.push(`[runtime] Navigating to start URL: ${request.startUrl}`);
      await page.goto(request.startUrl, {
        waitUntil: 'load',
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
    const buildLiveResultSnapshot = (): {
      outputs: Record<string, unknown>;
      inlineArtifacts: Array<{ name: string; value: unknown }>;
    } => ({
      outputs: { ...emittedOutputs },
      inlineArtifacts: [...inlineArtifacts],
    });
    const userScript = parseUserScript(request.script, logs);
    const sleep = async (ms: number): Promise<void> => {
      const safeMs = Math.max(0, Math.trunc(ms));
      await new Promise<void>((resolve) => setTimeout(resolve, safeMs));
    };
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
        liveRunState.queueUpdate(() => ({
          result: buildLiveResultSnapshot(),
        }));
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
        file: async (
          name: string,
          value: string | Buffer,
          options?: { extension?: string; mimeType?: string; kind?: string }
        ): Promise<string> => {
          const extension = options?.extension?.trim() || 'bin';
          const mimeType = options?.mimeType?.trim() || 'application/octet-stream';
          const kind = options?.kind?.trim() || 'file';
          const artifact = await saveFileArtifact(
            runArtifactsDir,
            name,
            extension,
            value,
            mimeType,
            kind
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
      },
    };

    const returnValue = await withTimeout(
      Promise.resolve(userScript(userContext)),
      timeoutMs,
      'Playwright script timed out.'
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
      runId,
      startedAt,
    });
    await writeRunState(finalState);
    return finalState;
  } catch (error) {
    void ErrorSystem.captureException(error);
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
    const failedState = buildFailedRunState({
      artifacts,
      errorMessage: message,
      existingRun,
      logs,
      runId,
      startedAt,
    });
    await writeRunState(failedState);
    return failedState;
  } finally {
    const shouldPersistArtifacts = await persistVideoArtifact({
      artifacts,
      logs,
      page,
      request,
      runArtifactsDir,
    });
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
