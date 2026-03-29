import 'server-only';

import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import sharp from 'sharp';

import {
  enqueuePlaywrightNodeRun,
  readPlaywrightNodeArtifact,
  readPlaywrightNodeRun,
  type PlaywrightNodeRunArtifact,
  type PlaywrightNodeRunRecord,
} from '@/features/ai/server';
import { uploadToConfiguredStorage } from '@/features/files/server';
import {
  normalizeKangurSocialImageAddon,
  type KangurSocialImageAddonsBatchPayload,
  type KangurSocialImageAddonsBatchResult,
  type KangurSocialImageAddon,
} from '@/shared/contracts/kangur-social-image-addons';
import type { ImageFileSelection } from '@/shared/contracts/files';
import { operationFailedError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import {
  KANGUR_CAPTURE_MODE_QUERY_PARAM,
  KANGUR_CAPTURE_MODE_SOCIAL_BATCH,
} from '@/features/kangur/shared/capture-mode';
import { KANGUR_SOCIAL_CAPTURE_PRESETS } from '@/features/kangur/shared/social-capture-presets';

import {
  findLatestAddonByPresetId,
  upsertKangurSocialImageAddon,
} from './social-image-addons-repository';
import { logger } from '@/shared/utils/logger';

const SOCIAL_BATCH_PLAYWRIGHT_SCRIPT = `
export default async function run({ page, input, artifacts, helpers, emit, log }) {
  const captures = Array.isArray(input.captures) ? input.captures : [];
  const results = [];
  let successCount = 0;
  let failureCount = 0;
  const totalCount = captures.length;

  const describeWaitReason = (reason) => {
    switch (reason) {
      case 'route_shell':
        return 'Waiting for Kangur route shell.';
      case 'transition_skeleton':
        return 'Waiting for transition skeleton to finish.';
      case 'transition_phase':
        return 'Waiting for route transition to become idle.';
      case 'route_content':
        return 'Waiting for route content to mount.';
      case 'capture_ready':
        return 'Waiting for route capture-ready flag.';
      default:
        return 'Waiting for page readiness.';
    }
  };

  const emitProgress = (payload = {}) => {
    const processedCount = successCount + failureCount;
    emit('capture_progress', {
      processedCount,
      completedCount: successCount,
      failureCount,
      remainingCount: Math.max(totalCount - processedCount, 0),
      totalCount,
      ...payload,
    });
  };

  for (let index = 0; index < captures.length; index += 1) {
    const capture = captures[index] || {};
    const id = typeof capture.id === 'string' ? capture.id : \`capture-\${index + 1}\`;
    const title =
      typeof capture.title === 'string' && capture.title.trim().length > 0
        ? capture.title.trim()
        : id;
    const url = typeof capture.url === 'string' ? capture.url : '';
    const selector = typeof capture.selector === 'string' ? capture.selector.trim() : '';
    const waitForMs = Number.isFinite(capture.waitForMs) ? Number(capture.waitForMs) : 2000;
    const waitForSelectorMs = Number.isFinite(capture.waitForSelectorMs)
      ? Number(capture.waitForSelectorMs)
      : 15000;

    emitProgress({
      currentCaptureId: id,
      currentCaptureTitle: title,
      currentCaptureStatus: 'starting',
      message: \`[\${id}] Opening \${title}.\`,
    });

    if (!url) {
      failureCount += 1;
      results.push({ id, status: 'skipped', reason: 'missing_url' });
      emitProgress({
        currentCaptureId: id,
        currentCaptureTitle: title,
        currentCaptureStatus: 'failed',
        lastCaptureId: id,
        lastCaptureStatus: 'skipped',
        message: \`[\${id}] Skipped because the capture URL is missing.\`,
      });
      continue;
    }

    try {
      log(\`[\${id}] Navigating to \${url}\`);
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      log(\`[\${id}] Load event fired — current URL: \${page.url()}\`);

      // Poll DOM until the page is fully ready. Uses only page.$() and
      // locator.count() (no waitForFunction) because Playwright scripts
      // run inside a vm sandbox where function serialization can fail.
      {
        const pollDeadline = Date.now() + waitForSelectorMs;
        let pageReady = false;
        let lastWaitReason = '';
        let lastWaitProgressAt = 0;
        log(\`[\${id}] Polling for page readiness (shell + no skeleton + transition idle + capture ready)\`);
        while (Date.now() < pollDeadline) {
          let waitReason = '';
          const hasShell = await page.$('[data-testid="kangur-route-shell"]');
          if (!hasShell) {
            waitReason = 'route_shell';
          } else {
            const skeletonCount = await page
              .locator('[data-testid="kangur-page-transition-skeleton"]')
              .count();
            if (skeletonCount > 0) {
              waitReason = 'transition_skeleton';
            } else {
              const phaseEl = await page.$('[data-route-transition-phase]');
              if (phaseEl) {
                const phase = await phaseEl.getAttribute('data-route-transition-phase');
                const busy = await phaseEl.getAttribute('aria-busy');
                if ((phase && phase !== 'idle') || busy === 'true') {
                  waitReason = 'transition_phase';
                }
              }
            }
          }

          if (!waitReason) {
            const routeContent = await page.$('[data-testid="kangur-route-content"]');
            if (!routeContent) {
              waitReason = 'route_content';
            } else {
              const captureReady = await routeContent.getAttribute('data-route-capture-ready');
              if (captureReady !== 'true') {
                waitReason = 'capture_ready';
              } else {
                pageReady = true;
                break;
              }
            }
          }

          const now = Date.now();
          if (waitReason !== lastWaitReason || now - lastWaitProgressAt >= 2000) {
            lastWaitReason = waitReason;
            lastWaitProgressAt = now;
            emitProgress({
              currentCaptureId: id,
              currentCaptureTitle: title,
              currentCaptureStatus: 'waiting_for_page_ready',
              message: \`[\${id}] \${describeWaitReason(waitReason)}\`,
            });
          }
          await helpers.sleep(400);
        }
        log(pageReady
          ? \`[\${id}] Page ready — shell stable and capture-ready\`
          : \`[\${id}] Page readiness timeout — capturing current state\`);
        if (!pageReady) {
          emitProgress({
            currentCaptureId: id,
            currentCaptureTitle: title,
            currentCaptureStatus: 'capturing_fallback',
            message: \`[\${id}] Page readiness timed out. Capturing the current state.\`,
          });
        }
      }

      if (selector) {
        log(\`[\${id}] Waiting for target selector: \${selector}\`);
        emitProgress({
          currentCaptureId: id,
          currentCaptureTitle: title,
          currentCaptureStatus: 'waiting_for_selector',
          message: \`[\${id}] Waiting for selector \${selector}.\`,
        });
        await page.waitForSelector(selector, { state: 'visible', timeout: waitForSelectorMs });
      }

      // Settling time for animations, lazy-loaded images, and late API responses
      const settleMs = Math.max(waitForMs, 3000);
      log(\`[\${id}] Waiting \${settleMs}ms for content to settle\`);
      emitProgress({
        currentCaptureId: id,
        currentCaptureTitle: title,
        currentCaptureStatus: 'settling',
        message: \`[\${id}] Settling for \${settleMs}ms before capture.\`,
      });
      await helpers.sleep(settleMs);

      const buffer = selector
        ? await page.locator(selector).screenshot({ type: 'png' })
        : await page.screenshot({ fullPage: true, type: 'png' });

      await artifacts.file(id, buffer, {
        extension: 'png',
        mimeType: 'image/png',
        kind: 'screenshot',
      });

      log(\`[\${id}] Captured successfully\`);
      successCount += 1;
      results.push({ id, status: 'ok' });
      emitProgress({
        currentCaptureId: id,
        currentCaptureTitle: title,
        currentCaptureStatus: 'captured',
        lastCaptureId: id,
        lastCaptureStatus: 'ok',
        message: \`[\${id}] Captured \${title}.\`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'capture_failed';
      log(\`Capture failed for \${id}: \${message}\`);
      failureCount += 1;
      results.push({ id, status: 'failed', reason: message });
      emitProgress({
        currentCaptureId: id,
        currentCaptureTitle: title,
        currentCaptureStatus: 'failed',
        lastCaptureId: id,
        lastCaptureStatus: 'failed',
        message: \`[\${id}] Capture failed: \${message}\`,
      });
    }
  }

  emit('capture_results', results);
}
`;

export type BatchCaptureProgressSnapshot = {
  processedCount: number;
  completedCount: number;
  failureCount: number;
  remainingCount: number;
  totalCount: number;
  currentCaptureId?: string | null;
  currentCaptureTitle?: string | null;
  currentCaptureStatus?: string | null;
  lastCaptureId?: string | null;
  lastCaptureStatus?: string | null;
  message?: string | null;
};

type BatchCaptureInput = Omit<KangurSocialImageAddonsBatchPayload, 'baseUrl' | 'presetIds'> & {
  baseUrl: string;
  presetIds?: string[] | null;
  createdBy?: string | null;
  forwardCookies?: string | null;
  onProgress?: (progress: BatchCaptureProgressSnapshot) => Promise<void> | void;
};

type BatchCapturePreset = (typeof KANGUR_SOCIAL_CAPTURE_PRESETS)[number];

type ResolvedBatchCaptureRequest = {
  baseUrl: string;
  createdBy: string | null;
  contextOptions: Record<string, unknown> | undefined;
  requestedPresets: BatchCapturePreset[];
  presets: BatchCapturePreset[];
};

export type StartedPlaywrightBatchCapture = ResolvedBatchCaptureRequest & {
  run: PlaywrightNodeRunRecord;
};

const LIVE_PROGRESS_POLL_INTERVAL_MS = 250;
const LIVE_PROGRESS_TIMEOUT_MS = 195_000;

const resolveArtifactByName = (
  artifacts: PlaywrightNodeRunArtifact[],
  name: string
): PlaywrightNodeRunArtifact | null =>
  artifacts.find((artifact) => artifact.name === name) ?? null;

const buildAddonPublicPath = (filename: string): string =>
  `/uploads/kangur/social-addons/${filename}`;

// Write batch capture screenshots to a temp directory OUTSIDE public/ so that
// Turbopack's file watcher doesn't trigger HMR page reloads during the pipeline.
// The vision handler reads from disk via the absolute path stored in imageAsset.filepath.
const BATCH_CAPTURE_TEMP_ROOT = '/var/tmp/libapp-uploads/kangur/social-addons';

const writeTempCopy = async (filename: string, buffer: Buffer): Promise<string> => {
  await fs.mkdir(BATCH_CAPTURE_TEMP_ROOT, { recursive: true });
  const diskPath = path.join(BATCH_CAPTURE_TEMP_ROOT, filename);
  await fs.writeFile(diskPath, buffer);
  return diskPath;
};

const buildServeUrl = (filename: string): string =>
  `/api/kangur/social-image-addons/serve?filename=${encodeURIComponent(filename)}`;

const toImageSelection = (params: {
  id: string;
  filename: string;
  filepath: string;
  url: string;
  width: number | null;
  height: number | null;
}): ImageFileSelection => ({
  id: params.id,
  filepath: params.filepath,
  url: params.url,
  filename: params.filename,
  width: params.width ?? null,
  height: params.height ?? null,
});

const buildCaptureUrl = (baseUrl: string, pathValue: string): string => {
  const trimmedBase = baseUrl.trim().replace(/\/+$/, '');
  const normalizedPath = pathValue.startsWith('/') ? pathValue : `/${pathValue}`;
  const href = `${trimmedBase}${normalizedPath}`;

  try {
    const parsed = new URL(href);
    parsed.searchParams.set(
      KANGUR_CAPTURE_MODE_QUERY_PARAM,
      KANGUR_CAPTURE_MODE_SOCIAL_BATCH
    );
    return parsed.toString();
  } catch {
    const separator = href.includes('?') ? '&' : '?';
    return `${href}${separator}${KANGUR_CAPTURE_MODE_QUERY_PARAM}=${encodeURIComponent(
      KANGUR_CAPTURE_MODE_SOCIAL_BATCH
    )}`;
  }
};

const parseCookiesForPlaywright = (
  cookieHeader: string,
  baseUrl: string
): Array<{ name: string; value: string; domain: string; path: string }> => {
  let domain: string;
  try {
    domain = new URL(baseUrl).hostname;
  } catch {
    domain = 'localhost';
  }
  return cookieHeader
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const eqIdx = pair.indexOf('=');
      if (eqIdx < 0) return null;
      return {
        name: pair.slice(0, eqIdx).trim(),
        value: pair.slice(eqIdx + 1).trim(),
        domain,
        path: '/',
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null && c.name.length > 0);
};

const sleep = async (ms: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, ms));

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

const readNonNegativeNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : null;

const readOptionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const readLiveCaptureProgress = (
  run: Pick<PlaywrightNodeRunRecord, 'result'> | null
): BatchCaptureProgressSnapshot | null => {
  const result = toRecord(run?.result);
  const outputs = toRecord(result?.['outputs']);
  const progress = toRecord(outputs?.['capture_progress']);
  if (!progress) return null;

  const processedCount = readNonNegativeNumber(progress['processedCount']);
  const completedCount = readNonNegativeNumber(progress['completedCount']);
  const failureCount = readNonNegativeNumber(progress['failureCount']);
  const remainingCount = readNonNegativeNumber(progress['remainingCount']);
  const totalCount = readNonNegativeNumber(progress['totalCount']);

  if (
    processedCount == null ||
    completedCount == null ||
    failureCount == null ||
    remainingCount == null ||
    totalCount == null
  ) {
    return null;
  }

  return {
    processedCount,
    completedCount,
    failureCount,
    remainingCount,
    totalCount,
    currentCaptureId: readOptionalString(progress['currentCaptureId']),
    currentCaptureTitle: readOptionalString(progress['currentCaptureTitle']),
    currentCaptureStatus: readOptionalString(progress['currentCaptureStatus']),
    lastCaptureId: readOptionalString(progress['lastCaptureId']),
    lastCaptureStatus: readOptionalString(progress['lastCaptureStatus']),
    message: readOptionalString(progress['message']),
  };
};

const waitForPlaywrightBatchRun = async (params: {
  runId: string;
  onProgress: (progress: BatchCaptureProgressSnapshot) => Promise<void> | void;
}): Promise<PlaywrightNodeRunRecord> => {
  const startedAt = Date.now();
  let latestRun: PlaywrightNodeRunRecord | null = null;
  let lastProgressSignature: string | null = null;

  while (Date.now() - startedAt <= LIVE_PROGRESS_TIMEOUT_MS) {
    const currentRun = await readPlaywrightNodeRun(params.runId);
    if (currentRun) {
      latestRun = currentRun;
      const progress = readLiveCaptureProgress(currentRun);
      if (progress) {
        const signature = [
          progress.processedCount,
          progress.completedCount,
          progress.failureCount,
          progress.remainingCount,
          progress.totalCount,
          progress.currentCaptureId ?? '',
          progress.currentCaptureStatus ?? '',
          progress.lastCaptureId ?? '',
          progress.lastCaptureStatus ?? '',
          progress.message ?? '',
        ].join(':');
        if (signature !== lastProgressSignature) {
          lastProgressSignature = signature;
          await params.onProgress(progress);
        }
      }

      if (currentRun.status === 'completed' || currentRun.status === 'failed') {
        return currentRun;
      }
    }

    await sleep(LIVE_PROGRESS_POLL_INTERVAL_MS);
  }

  if (latestRun && (latestRun.status === 'completed' || latestRun.status === 'failed')) {
    return latestRun;
  }

  throw operationFailedError('Playwright batch capture timed out.');
};

const resolveBatchCaptureRequest = (
  input: Omit<BatchCaptureInput, 'onProgress'>
): ResolvedBatchCaptureRequest => {
  const baseUrl = input.baseUrl.trim().replace(/\/+$/, '');
  const presetIds = (input.presetIds ?? []).map((id) => id.trim()).filter(Boolean);
  const requestedPresets =
    presetIds.length > 0
      ? KANGUR_SOCIAL_CAPTURE_PRESETS.filter((preset) => presetIds.includes(preset.id))
      : KANGUR_SOCIAL_CAPTURE_PRESETS;
  const normalizedPresetLimit =
    typeof input.presetLimit === 'number' && Number.isFinite(input.presetLimit)
      ? Math.max(1, Math.floor(input.presetLimit))
      : null;
  const presets =
    normalizedPresetLimit == null
      ? requestedPresets
      : requestedPresets.slice(0, normalizedPresetLimit);

  if (!baseUrl) {
    throw operationFailedError('Base URL is required for batch capture.');
  }

  if (presets.length === 0) {
    throw operationFailedError('No capture presets selected.');
  }

  const contextOptions: Record<string, unknown> = {};
  if (input.forwardCookies) {
    const cookies = parseCookiesForPlaywright(input.forwardCookies, baseUrl);
    if (cookies.length > 0) {
      contextOptions['storageState'] = {
        cookies,
        origins: [],
      };
    }
  }

  return {
    baseUrl,
    createdBy: input.createdBy ?? null,
    contextOptions: Object.keys(contextOptions).length > 0 ? contextOptions : undefined,
    requestedPresets,
    presets,
  };
};

export const startPlaywrightBatchCapture = async (
  input: Omit<BatchCaptureInput, 'onProgress'>
): Promise<StartedPlaywrightBatchCapture> => {
  const resolved = resolveBatchCaptureRequest(input);
  const captures = resolved.presets.map((preset) => ({
    id: preset.id,
    title: preset.title,
    url: buildCaptureUrl(resolved.baseUrl, preset.path),
    selector: preset.selector,
    waitForMs: preset.waitForMs ?? 0,
    waitForSelectorMs: preset.waitForSelectorMs ?? 10000,
  }));

  logger.info('[BATCH] Enqueueing Playwright run', { captureCount: captures.length });
  const run = await enqueuePlaywrightNodeRun({
    request: {
      script: SOCIAL_BATCH_PLAYWRIGHT_SCRIPT,
      input: {
        captures,
      },
      timeoutMs: 180_000,
      browserEngine: 'chromium',
      contextOptions: resolved.contextOptions,
    },
    waitForResult: false,
    ownerUserId: resolved.createdBy,
  });

  return {
    ...resolved,
    run,
  };
};

export const finalizePlaywrightBatchCapture = async (
  input: StartedPlaywrightBatchCapture & { run: PlaywrightNodeRunRecord }
): Promise<KangurSocialImageAddonsBatchResult> => {
  const startedAt = Date.now();
  const { run, requestedPresets, presets, baseUrl, createdBy } = input;

  logger.info('[BATCH] Playwright run finished', {
    status: run.status,
    runId: run.runId,
  });
  if (run.status !== 'completed') {
    const reason = run.error?.trim() || 'Playwright batch capture failed.';
    throw operationFailedError(reason);
  }

  const resultsRaw = (run.result as { outputs?: Record<string, unknown> } | null)?.outputs?.[
    'capture_results'
  ];
  const resultMap = Array.isArray(resultsRaw)
    ? new Map<string, { status: string; reason?: string }>(
        resultsRaw.map((entry: unknown) => {
          if (!entry || typeof entry !== 'object') return ['unknown', { status: 'failed' }];
          const record = entry as { id?: string; status?: string; reason?: string };
          return [
            record.id ?? 'unknown',
            { status: record.status ?? 'failed', reason: record.reason },
          ];
        })
      )
    : new Map<string, { status: string; reason?: string }>();

  const addons: KangurSocialImageAddon[] = [];
  const failures: Array<{ id: string; reason: string }> = [];

  logger.info('[BATCH] Processing presets', { presetCount: presets.length });
  for (const preset of presets) {
    logger.info('[BATCH] Finding artifact', { presetId: preset.id });
    const artifact = resolveArtifactByName(run.artifacts, preset.id);
    const resultStatus = resultMap.get(preset.id);
    if (!artifact) {
      failures.push({
        id: preset.id,
        reason: resultStatus?.reason || 'artifact_missing',
      });
      continue;
    }

    const artifactFile = artifact.path.split('/').pop();
    if (!artifactFile) {
      failures.push({ id: preset.id, reason: 'artifact_missing' });
      continue;
    }

    logger.info('[BATCH] Reading artifact file', { presetId: preset.id });
    const artifactData = await readPlaywrightNodeArtifact({
      runId: run.runId,
      fileName: artifactFile,
    });
    if (!artifactData) {
      failures.push({ id: preset.id, reason: 'artifact_read_failed' });
      continue;
    }

    logger.info('[BATCH] Reading image metadata', { presetId: preset.id });
    const buffer = artifactData.content;
    const metadata = await sharp(buffer, { failOnError: false }).metadata();
    const width = typeof metadata.width === 'number' ? metadata.width : null;
    const height = typeof metadata.height === 'number' ? metadata.height : null;

    const filename = `${randomUUID()}.png`;
    const publicPath = buildAddonPublicPath(filename);

    logger.info('[BATCH] Writing temp copy', { presetId: preset.id });
    const tempDiskPath = await writeTempCopy(filename, buffer);

    logger.info('[BATCH] Uploading to storage', { presetId: preset.id });
    const stored = await uploadToConfiguredStorage({
      buffer,
      filename,
      mimetype: 'image/png',
      publicPath,
      category: 'kangur_social',
      projectId: null,
      folder: 'social-addons',
      writeLocalCopy: async () => {
        // Already written to temp dir — skip public/ write to prevent Turbopack HMR
      },
    });
    logger.info('[BATCH] Upload completed', {
      presetId: preset.id,
      source: stored.source,
    });

    const effectiveFilepath = stored.source === 'local' ? tempDiskPath : stored.filepath;
    const effectiveUrl = stored.source === 'local' ? buildServeUrl(filename) : stored.filepath;

    const imageAssetId = randomUUID();
    const imageAsset = toImageSelection({
      id: imageAssetId,
      filename,
      filepath: effectiveFilepath,
      url: effectiveUrl,
      width,
      height,
    });

    logger.info('[BATCH] Finding previous addon', { presetId: preset.id });
    const previousAddon = await findLatestAddonByPresetId(preset.id);

    const addon = normalizeKangurSocialImageAddon({
      id: randomUUID(),
      title: preset.title,
      description: preset.description ?? '',
      sourceUrl: buildCaptureUrl(baseUrl, preset.path),
      sourceLabel: 'Playwright batch capture',
      imageAsset,
      presetId: preset.id,
      previousAddonId: previousAddon?.id ?? null,
      playwrightRunId: run.runId,
      playwrightArtifact: artifact.path,
      createdBy,
      updatedBy: createdBy,
    });

    logger.info('[BATCH] Upserting addon', { presetId: preset.id });
    const saved = await upsertKangurSocialImageAddon(addon);
    addons.push(saved);
    logger.info('[BATCH] Addon capture finished', { presetId: preset.id });
  }

  void ErrorSystem.logInfo('Kangur social image add-on batch capture completed', {
    service: 'kangur.social-image-addons',
    action: 'batch',
    durationMs: Date.now() - startedAt,
    runId: run.runId,
    presetCount: presets.length,
    addonCount: addons.length,
    failureCount: failures.length,
  });

  return {
    addons,
    failures,
    runId: run.runId,
    requestedPresetCount: requestedPresets.length,
    usedPresetCount: presets.length,
    usedPresetIds: presets.map((preset) => preset.id),
  };
};

export async function createKangurSocialImageAddonsBatch(
  input: BatchCaptureInput
): Promise<KangurSocialImageAddonsBatchResult> {
  const startedAt = Date.now();
  const baseUrl = input.baseUrl.trim().replace(/\/+$/, '');
  const presetIds = (input.presetIds ?? []).map((id) => id.trim()).filter(Boolean);
  const requestedPresets =
    presetIds.length > 0
      ? KANGUR_SOCIAL_CAPTURE_PRESETS.filter((preset) => presetIds.includes(preset.id))
      : KANGUR_SOCIAL_CAPTURE_PRESETS;
  const normalizedPresetLimit =
    typeof input.presetLimit === 'number' && Number.isFinite(input.presetLimit)
      ? Math.max(1, Math.floor(input.presetLimit))
      : null;
  const presets =
    normalizedPresetLimit == null
      ? requestedPresets
      : requestedPresets.slice(0, normalizedPresetLimit);

  if (!baseUrl) {
    throw operationFailedError('Base URL is required for batch capture.');
  }

  if (presets.length === 0) {
    throw operationFailedError('No capture presets selected.');
  }

  const captures = presets.map((preset) => ({
    id: preset.id,
    title: preset.title,
    url: buildCaptureUrl(baseUrl, preset.path),
    selector: preset.selector,
    waitForMs: preset.waitForMs ?? 0,
    waitForSelectorMs: preset.waitForSelectorMs ?? 10000,
  }));

  const contextOptions: Record<string, unknown> = {};
  if (input.forwardCookies) {
    const cookies = parseCookiesForPlaywright(input.forwardCookies, baseUrl);
    if (cookies.length > 0) {
      contextOptions['storageState'] = {
        cookies,
        origins: [],
      };
    }
  }

  logger.info('[BATCH] Enqueueing Playwright run', { captureCount: captures.length });
  const initialRun = await enqueuePlaywrightNodeRun({
    request: {
      script: SOCIAL_BATCH_PLAYWRIGHT_SCRIPT,
      input: {
        captures,
      },
      timeoutMs: 180_000,
      browserEngine: 'chromium',
      contextOptions: Object.keys(contextOptions).length > 0 ? contextOptions : undefined,
    },
    waitForResult: !input.onProgress,
    ownerUserId: input.createdBy ?? null,
  });
  const run =
    typeof input.onProgress === 'function'
      ? await waitForPlaywrightBatchRun({
        runId: initialRun.runId,
        onProgress: input.onProgress,
      })
      : initialRun;

  logger.info('[BATCH] Playwright run finished', {
    status: run.status,
    runId: run.runId,
  });
  if (run.status !== 'completed') {
    const reason = run.error?.trim() || 'Playwright batch capture failed.';
    throw operationFailedError(reason);
  }

  const resultsRaw = (run.result as { outputs?: Record<string, unknown> } | null)?.outputs?.[
    'capture_results'
  ];
  const resultMap = Array.isArray(resultsRaw)
    ? new Map<string, { status: string; reason?: string }>(
      resultsRaw.map((entry: unknown) => {
        if (!entry || typeof entry !== 'object') return ['unknown', { status: 'failed' }];
        const record = entry as { id?: string; status?: string; reason?: string };
        return [record.id ?? 'unknown', { status: record.status ?? 'failed', reason: record.reason }];
      })
    )
    : new Map<string, { status: string; reason?: string }>();

  const addons: KangurSocialImageAddon[] = [];
  const failures: Array<{ id: string; reason: string }> = [];

  logger.info('[BATCH] Processing presets', { presetCount: presets.length });
  for (const preset of presets) {
    logger.info('[BATCH] Finding artifact', { presetId: preset.id });
    const artifact = resolveArtifactByName(run.artifacts, preset.id);
    const resultStatus = resultMap.get(preset.id);
    if (!artifact) {
      failures.push({
        id: preset.id,
        reason: resultStatus?.reason || 'artifact_missing',
      });
      continue;
    }

    const artifactFile = artifact.path.split('/').pop();
    if (!artifactFile) {
      failures.push({ id: preset.id, reason: 'artifact_missing' });
      continue;
    }

    logger.info('[BATCH] Reading artifact file', { presetId: preset.id });
    const artifactData = await readPlaywrightNodeArtifact({
      runId: run.runId,
      fileName: artifactFile,
    });
    if (!artifactData) {
      failures.push({ id: preset.id, reason: 'artifact_read_failed' });
      continue;
    }

    logger.info('[BATCH] Reading image metadata', { presetId: preset.id });
    const buffer = artifactData.content;
    const metadata = await sharp(buffer, { failOnError: false }).metadata();
    const width = typeof metadata.width === 'number' ? metadata.width : null;
    const height = typeof metadata.height === 'number' ? metadata.height : null;

    const filename = `${randomUUID()}.png`;
    const publicPath = buildAddonPublicPath(filename);

    // Write to temp dir (outside public/) to avoid Turbopack HMR during pipeline
    logger.info('[BATCH] Writing temp copy', { presetId: preset.id });
    const tempDiskPath = await writeTempCopy(filename, buffer);

    logger.info('[BATCH] Uploading to storage', { presetId: preset.id });
    const stored = await uploadToConfiguredStorage({
      buffer,
      filename,
      mimetype: 'image/png',
      publicPath,
      category: 'kangur_social',
      projectId: null,
      folder: 'social-addons',
      writeLocalCopy: async () => {
        // Already written to temp dir — skip public/ write to prevent Turbopack HMR
      },
    });
    logger.info('[BATCH] Upload completed', {
      presetId: preset.id,
      source: stored.source,
    });

    // For local storage, use temp disk path so the vision handler can read
    // without files being in public/uploads/ (which triggers Turbopack rebuilds).
    // For cloud storage, use the remote URL returned by the storage service.
    const effectiveFilepath = stored.source === 'local' ? tempDiskPath : stored.filepath;
    const effectiveUrl = stored.source === 'local' ? buildServeUrl(filename) : stored.filepath;

    const imageAssetId = randomUUID();
    const imageAsset = toImageSelection({
      id: imageAssetId,
      filename,
      filepath: effectiveFilepath,
      url: effectiveUrl,
      width,
      height,
    });

    logger.info('[BATCH] Finding previous addon', { presetId: preset.id });
    const previousAddon = await findLatestAddonByPresetId(preset.id);

    const addon = normalizeKangurSocialImageAddon({
      id: randomUUID(),
      title: preset.title,
      description: preset.description ?? '',
      sourceUrl: buildCaptureUrl(baseUrl, preset.path),
      sourceLabel: 'Playwright batch capture',
      imageAsset,
      presetId: preset.id,
      previousAddonId: previousAddon?.id ?? null,
      playwrightRunId: run.runId,
      playwrightArtifact: artifact.path,
      createdBy: input.createdBy ?? null,
      updatedBy: input.createdBy ?? null,
    });

    logger.info('[BATCH] Upserting addon', { presetId: preset.id });
    const saved = await upsertKangurSocialImageAddon(addon);
    addons.push(saved);
    logger.info('[BATCH] Addon capture finished', { presetId: preset.id });
  }

  void ErrorSystem.logInfo('Kangur social image add-on batch capture completed', {
    service: 'kangur.social-image-addons',
    action: 'batch',
    durationMs: Date.now() - startedAt,
    runId: run.runId,
    presetCount: presets.length,
    addonCount: addons.length,
    failureCount: failures.length,
  });

  return {
    addons,
    failures,
    runId: run.runId,
    requestedPresetCount: requestedPresets.length,
    usedPresetCount: presets.length,
    usedPresetIds: presets.map((preset) => preset.id),
  };
}
