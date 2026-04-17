import 'server-only';

import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import sharp from 'sharp';

import {
  readPlaywrightEngineArtifact,
  readPlaywrightEngineRun,
  startPlaywrightEngineTask,
  type PlaywrightEngineRunArtifact,
  type PlaywrightEngineRunRecord,
} from '@/features/playwright/server/runtime';
import { createSocialCaptureBatchPlaywrightInstance } from '@/features/playwright/server/instances';
import { uploadToConfiguredStorage } from '@/features/files/server';
import {
  normalizeKangurSocialImageAddon,
  type KangurSocialCaptureAppearanceMode,
  type KangurSocialImageAddonBatchCaptureResult,
  type KangurSocialImageAddonsBatchPayload,
  type KangurSocialImageAddonsBatchResult,
  type KangurSocialImageAddon,
  type KangurSocialProgrammableCaptureRoute,
} from '@/shared/contracts/kangur-social-image-addons';
import type { ImageFileSelection } from '@/shared/contracts/files';
import { operationFailedError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { KANGUR_SOCIAL_CAPTURE_PRESETS } from '@/features/kangur/social/shared/social-capture-presets';
import {
  buildKangurSocialProgrammableCaptureUrl,
  KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT,
  KANGUR_SOCIAL_PLAYWRIGHT_CAPTURE_TIMEOUT_MS,
} from '@/features/kangur/social/shared/social-playwright-capture';
import { KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY } from '@/features/kangur/appearance/storefront-appearance-settings';
import { resolvePlaywrightRequestStorageState } from '@/features/playwright/server/request-storage-state';

import {
  findLatestAddonByPresetId,
  upsertKangurSocialImageAddon,
} from './social-image-addons-repository';
import { logger } from '@/shared/utils/logger';

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
  playwrightPersonaId?: string | null;
  playwrightScript?: string | null;
  playwrightRoutes?: KangurSocialProgrammableCaptureRoute[] | null;
  createdBy?: string | null;
  forwardCookies?: string | null;
  trustedSelfOriginHost?: string | null;
  onProgress?: (progress: BatchCaptureProgressSnapshot) => Promise<void> | void;
};

type BatchCapturePreset = (typeof KANGUR_SOCIAL_CAPTURE_PRESETS)[number];

type BatchCaptureTarget = {
  id: string;
  title: string;
  path: string;
  description: string;
  selector: string | null;
  waitForMs: number | null;
  waitForSelectorMs: number | null;
  presetId: string | null;
  sourceLabel: string;
  captureRouteId: string | null;
  captureRouteTitle: string | null;
};

type ResolvedBatchCaptureRequest = {
  baseUrl: string;
  appearanceMode: KangurSocialCaptureAppearanceMode | null;
  createdBy: string | null;
  contextOptions: Record<string, unknown> | undefined;
  trustedSelfOriginHost: string | null;
  requestedTargets: BatchCaptureTarget[];
  targets: BatchCaptureTarget[];
  playwrightPersonaId: string | null;
  playwrightScript: string;
};

export type StartedPlaywrightBatchCapture = ResolvedBatchCaptureRequest & {
  run: PlaywrightEngineRunRecord;
};

const LIVE_PROGRESS_POLL_INTERVAL_MS = 250;
const LIVE_PROGRESS_TIMEOUT_MS = 195_000;

const resolveArtifactByName = (
  artifacts: PlaywrightEngineRunArtifact[],
  name: string
): PlaywrightEngineRunArtifact | null =>
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

const normalizeOptionalTrimmedString = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  return normalized || null;
};

const buildTargetFromPreset = (preset: BatchCapturePreset): BatchCaptureTarget => ({
  id: preset.id,
  title: preset.title,
  path: preset.path,
  description: preset.description ?? '',
  selector: normalizeOptionalTrimmedString(preset.selector ?? null),
  waitForMs: preset.waitForMs ?? null,
  waitForSelectorMs: preset.waitForSelectorMs ?? null,
  presetId: preset.id,
  sourceLabel: 'Playwright batch capture',
  captureRouteId: null,
  captureRouteTitle: null,
});

const buildTargetFromProgrammableRoute = (
  route: KangurSocialProgrammableCaptureRoute
): BatchCaptureTarget => ({
  id: route.id,
  title: route.title.trim() || route.id,
  path: route.path,
  description: route.description?.trim() || '',
  selector: normalizeOptionalTrimmedString(route.selector ?? null),
  waitForMs: route.waitForMs ?? null,
  waitForSelectorMs: route.waitForSelectorMs ?? null,
  presetId: null,
  sourceLabel: 'Programmable Playwright capture',
  captureRouteId: route.id,
  captureRouteTitle: route.title.trim() || route.id,
});

const normalizeCaptureAppearanceMode = (
  value: string | null | undefined
): KangurSocialCaptureAppearanceMode | null =>
  value === 'default' || value === 'dawn' || value === 'sunset' || value === 'dark' ? value : null;

const resolvePlaywrightStorageState = (params: {
  cookieHeader: string | null | undefined;
  baseUrl: string;
  appearanceMode: string | null | undefined;
}): ReturnType<typeof resolvePlaywrightRequestStorageState> => {
  const appearanceMode = normalizeCaptureAppearanceMode(params.appearanceMode);
  const resolved = resolvePlaywrightRequestStorageState({
    cookieHeader: params.cookieHeader,
    sourceUrl: params.baseUrl,
    localStorageEntries: appearanceMode
      ? [
          {
            name: KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY,
            value: appearanceMode,
          },
        ]
      : null,
  });

  if (resolved.droppedCookieNames.length > 0) {
    logger.warn('[kangur.social-image-addons.batch] dropped invalid Playwright cookies', {
      baseUrl: params.baseUrl,
      droppedCookieNames: resolved.droppedCookieNames,
      service: 'kangur.social-image-addons',
    });
  }

  return resolved;
};

const sleep = async (ms: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, ms));

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

const readNonNegativeNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : null;

const readPositiveNumber = (value: unknown): number | null => {
  const normalized = readNonNegativeNumber(value);
  return normalized != null && normalized > 0 ? normalized : null;
};

const readOptionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const readCaptureResultStatus = (
  value: unknown
): KangurSocialImageAddonBatchCaptureResult['status'] => {
  switch (value) {
    case 'ok':
    case 'failed':
    case 'skipped':
      return value;
    default:
      return 'failed';
  }
};

const readBatchCaptureResults = (
  value: unknown
): Map<string, KangurSocialImageAddonBatchCaptureResult> => {
  if (!Array.isArray(value)) {
    return new Map();
  }

  return new Map(
    value.flatMap((entry) => {
      const record = toRecord(entry);
      const id = readOptionalString(record?.['id']);
      if (!id) {
        return [];
      }

      const parsed: KangurSocialImageAddonBatchCaptureResult = {
        id,
        title: readOptionalString(record?.['title']),
        status: readCaptureResultStatus(record?.['status']),
        reason: readOptionalString(record?.['reason']),
        resolvedUrl: readOptionalString(record?.['resolvedUrl']),
        artifactName: readOptionalString(record?.['artifactName']),
        attemptCount: readPositiveNumber(record?.['attemptCount']),
        durationMs: readNonNegativeNumber(record?.['durationMs']),
        stage: readOptionalString(record?.['stage']),
      };

      return [[id, parsed]];
    })
  );
};

const readLiveCaptureProgress = (
  run: { result?: unknown } | null
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

export const waitForPlaywrightBatchRun = async (params: {
  runId: string;
  onProgress: (progress: BatchCaptureProgressSnapshot) => Promise<void> | void;
}): Promise<PlaywrightEngineRunRecord> => {
  const startedAt = Date.now();
  let latestRun: PlaywrightEngineRunRecord | null = null;
  let lastProgressSignature: string | null = null;

  while (Date.now() - startedAt <= LIVE_PROGRESS_TIMEOUT_MS) {
    const currentRun = await readPlaywrightEngineRun(params.runId);
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
  const requestedTargets =
    Array.isArray(input.playwrightRoutes) && input.playwrightRoutes.length > 0
      ? input.playwrightRoutes
          .map((route) => ({
            ...route,
            id: route.id.trim(),
            title: route.title.trim(),
            path: route.path.trim(),
            description: route.description?.trim() ?? '',
            selector: normalizeOptionalTrimmedString(route.selector ?? null),
          }))
          .filter((route) => route.id.length > 0 && route.path.length > 0)
          .map((route) => buildTargetFromProgrammableRoute(route))
      : requestedPresets.map((preset) => buildTargetFromPreset(preset));
  const normalizedPresetLimit =
    typeof input.presetLimit === 'number' && Number.isFinite(input.presetLimit)
      ? Math.max(1, Math.floor(input.presetLimit))
      : null;
  const targets =
    normalizedPresetLimit == null
      ? requestedTargets
      : requestedTargets.slice(0, normalizedPresetLimit);
  const playwrightPersonaId = normalizeOptionalTrimmedString(input.playwrightPersonaId ?? null);
  const playwrightScript =
    input.playwrightScript?.trim() || KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT;
  const appearanceMode = normalizeCaptureAppearanceMode(input.appearanceMode);

  if (!baseUrl) {
    throw operationFailedError('Base URL is required for batch capture.');
  }

  if (targets.length === 0) {
    throw operationFailedError(
      requestedTargets.length === 0 && Array.isArray(input.playwrightRoutes)
        ? 'No programmable capture routes selected.'
        : 'No capture presets selected.'
    );
  }

  const contextOptions: Record<string, unknown> = {};
  const { storageState } = resolvePlaywrightStorageState({
    cookieHeader: input.forwardCookies,
    baseUrl,
    appearanceMode,
  });
  if (storageState) {
    contextOptions['storageState'] = storageState;
  }

  return {
    baseUrl,
    appearanceMode,
    createdBy: input.createdBy ?? null,
    contextOptions: Object.keys(contextOptions).length > 0 ? contextOptions : undefined,
    trustedSelfOriginHost: normalizeOptionalTrimmedString(input.trustedSelfOriginHost ?? null),
    requestedTargets,
    targets,
    playwrightPersonaId,
    playwrightScript,
  };
};

export const startPlaywrightBatchCapture = async (
  input: Omit<BatchCaptureInput, 'onProgress'>
): Promise<StartedPlaywrightBatchCapture> => {
  const resolved = resolveBatchCaptureRequest(input);
  const captures = resolved.targets.map((target) => ({
    id: target.id,
    title: target.title,
    url: buildKangurSocialProgrammableCaptureUrl(resolved.baseUrl, target.path),
    selector: target.selector,
    waitForMs: target.waitForMs ?? 0,
    waitForSelectorMs: target.waitForSelectorMs ?? 10000,
  }));

  logger.info('[BATCH] Enqueueing Playwright run', { captureCount: captures.length });
  const run = await startPlaywrightEngineTask({
    request: {
      script: resolved.playwrightScript,
      input: {
        appearanceMode: resolved.appearanceMode,
        captures,
      },
      timeoutMs: KANGUR_SOCIAL_PLAYWRIGHT_CAPTURE_TIMEOUT_MS,
      browserEngine: 'chromium',
      personaId: resolved.playwrightPersonaId ?? undefined,
      contextOptions: resolved.contextOptions,
      policyAllowedHosts: resolved.trustedSelfOriginHost ? [resolved.trustedSelfOriginHost] : undefined,
    },
    ownerUserId: resolved.createdBy,
    instance: createSocialCaptureBatchPlaywrightInstance(),
  });

  return {
    ...resolved,
    run,
  };
};

export const finalizePlaywrightBatchCapture = async (
  input: StartedPlaywrightBatchCapture & { run: PlaywrightEngineRunRecord }
): Promise<KangurSocialImageAddonsBatchResult> => {
  const startedAt = Date.now();
  const {
    run,
    requestedTargets,
    targets,
    baseUrl,
    createdBy,
    playwrightPersonaId,
    appearanceMode,
  } = input;

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
  const resultMap = readBatchCaptureResults(resultsRaw);

  const addons: KangurSocialImageAddon[] = [];
  const failures: Array<{ id: string; reason: string }> = [];
  const captureResults: KangurSocialImageAddonBatchCaptureResult[] = [];

  logger.info('[BATCH] Processing targets', { targetCount: targets.length });
  for (const target of targets) {
    logger.info('[BATCH] Finding artifact', { targetId: target.id });
    const artifact = resolveArtifactByName(run.artifacts, target.id);
    const resultStatus = resultMap.get(target.id);
    const resolvedUrl =
      resultStatus?.resolvedUrl ?? buildKangurSocialProgrammableCaptureUrl(baseUrl, target.path);
    if (!artifact) {
      const reason = resultStatus?.reason || 'artifact_missing';
      failures.push({
        id: target.id,
        reason,
      });
      captureResults.push({
        id: target.id,
        title: resultStatus?.title ?? target.title,
        status: resultStatus?.status === 'skipped' ? 'skipped' : 'failed',
        reason,
        resolvedUrl,
        artifactName: resultStatus?.artifactName ?? null,
        attemptCount: resultStatus?.attemptCount ?? null,
        durationMs: resultStatus?.durationMs ?? null,
        stage:
          resultStatus?.stage ??
          (resultStatus?.status === 'skipped' ? 'validation' : 'artifact_missing'),
      });
      continue;
    }

    const artifactFile = artifact.path.split('/').pop();
    if (!artifactFile) {
      failures.push({ id: target.id, reason: 'artifact_missing' });
      captureResults.push({
        id: target.id,
        title: resultStatus?.title ?? target.title,
        status: 'failed',
        reason: 'artifact_missing',
        resolvedUrl,
        artifactName: resultStatus?.artifactName ?? null,
        attemptCount: resultStatus?.attemptCount ?? null,
        durationMs: resultStatus?.durationMs ?? null,
        stage: resultStatus?.stage ?? 'artifact_missing',
      });
      continue;
    }

    logger.info('[BATCH] Reading artifact file', { targetId: target.id });
    const artifactData = await readPlaywrightEngineArtifact({
      runId: run.runId,
      fileName: artifactFile,
    });
    if (!artifactData) {
      failures.push({ id: target.id, reason: 'artifact_read_failed' });
      captureResults.push({
        id: target.id,
        title: resultStatus?.title ?? target.title,
        status: 'failed',
        reason: 'artifact_read_failed',
        resolvedUrl,
        artifactName: artifactFile,
        attemptCount: resultStatus?.attemptCount ?? null,
        durationMs: resultStatus?.durationMs ?? null,
        stage: resultStatus?.stage ?? 'artifact_read_failed',
      });
      continue;
    }

    logger.info('[BATCH] Reading image metadata', { targetId: target.id });
    const buffer = artifactData.content;
    const metadata = await sharp(buffer, { failOnError: false }).metadata();
    const width = typeof metadata.width === 'number' ? metadata.width : null;
    const height = typeof metadata.height === 'number' ? metadata.height : null;

    const filename = `${randomUUID()}.png`;
    const publicPath = buildAddonPublicPath(filename);

    logger.info('[BATCH] Writing temp copy', { targetId: target.id });
    const tempDiskPath = await writeTempCopy(filename, buffer);

    logger.info('[BATCH] Uploading to storage', { targetId: target.id });
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
      targetId: target.id,
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

    logger.info('[BATCH] Finding previous addon', { targetId: target.id });
    const previousAddon = target.presetId
      ? await findLatestAddonByPresetId(target.presetId)
      : null;

    const addon = normalizeKangurSocialImageAddon({
      id: randomUUID(),
      title: target.title,
      description: target.description,
      sourceUrl: buildKangurSocialProgrammableCaptureUrl(baseUrl, target.path),
      sourceLabel: target.sourceLabel,
      imageAsset,
      presetId: target.presetId,
      previousAddonId: previousAddon?.id ?? null,
      playwrightRunId: run.runId,
      playwrightArtifact: artifact.path,
      playwrightPersonaId,
      playwrightCaptureRouteId: target.captureRouteId,
      playwrightCaptureRouteTitle: target.captureRouteTitle,
      captureAppearanceMode: appearanceMode,
      createdBy,
      updatedBy: createdBy,
    });

    logger.info('[BATCH] Upserting addon', { targetId: target.id });
    const saved = await upsertKangurSocialImageAddon(addon);
    addons.push(saved);
    captureResults.push({
      id: target.id,
      title: resultStatus?.title ?? target.title,
      status: 'ok',
      reason: null,
      resolvedUrl,
      artifactName: artifactFile,
      attemptCount: resultStatus?.attemptCount ?? null,
      durationMs: resultStatus?.durationMs ?? null,
      stage: resultStatus?.stage ?? 'captured',
    });
    logger.info('[BATCH] Addon capture finished', { targetId: target.id });
  }

  void ErrorSystem.logInfo('Kangur social image add-on batch capture completed', {
    service: 'kangur.social-image-addons',
    action: 'batch',
    durationMs: Date.now() - startedAt,
    runId: run.runId,
    presetCount: targets.length,
    addonCount: addons.length,
    failureCount: failures.length,
  });

  return {
    addons,
    failures,
    captureResults,
    runId: run.runId,
    requestedPresetCount: requestedTargets.length,
    usedPresetCount: targets.length,
    usedPresetIds: targets.map((target) => target.id),
  };
};

export async function createKangurSocialImageAddonsBatch(
  input: BatchCaptureInput
): Promise<KangurSocialImageAddonsBatchResult> {
  const started = await startPlaywrightBatchCapture(input);
  const run =
    started.run.status === 'completed' || started.run.status === 'failed'
      ? started.run
      : await waitForPlaywrightBatchRun({
          runId: started.run.runId,
          onProgress: input.onProgress ?? (() => undefined),
        });

  return await finalizePlaywrightBatchCapture({
    ...started,
    run,
  });
}
