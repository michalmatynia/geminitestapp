import 'server-only';

import os from 'os';
import path from 'path';

import {
  kangurSocialImageAddonsBatchJobSchema,
  kangurSocialImageAddonsBatchProgressSchema,
  type KangurSocialImageAddonsBatchJob,
  type KangurSocialImageAddonsBatchProgress,
  type KangurSocialImageAddonsBatchResult,
} from '@/shared/contracts/kangur-social-image-addons';
import { getFsPromises } from '@/shared/lib/files/runtime-fs';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import {
  finalizePlaywrightBatchCapture,
  startPlaywrightBatchCapture,
  waitForPlaywrightBatchRun,
  type BatchCaptureProgressSnapshot,
} from './social-image-addons-batch';

type BatchJobStartInput = Parameters<typeof startPlaywrightBatchCapture>[0];

const nodeFs = getFsPromises();
const BATCH_JOB_ROOT_DIR = path.join(os.tmpdir(), 'kangur-social-image-addon-batch-jobs');
const BATCH_JOB_TTL_MS = 24 * 60 * 60 * 1000;

const nowIso = (): string => new Date().toISOString();

const resolveBatchJobStatePath = (id: string): string =>
  path.join(BATCH_JOB_ROOT_DIR, `${id}.json`);

const ensureBatchJobRoot = async (): Promise<void> => {
  await nodeFs.mkdir(BATCH_JOB_ROOT_DIR, { recursive: true });
};

const writeBatchJobState = async (job: KangurSocialImageAddonsBatchJob): Promise<void> => {
  await ensureBatchJobRoot();
  const targetPath = resolveBatchJobStatePath(job.id);
  const tempPath = `${targetPath}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await nodeFs.writeFile(tempPath, `${JSON.stringify(job, null, 2)}\n`, 'utf8');
  await nodeFs.rename(tempPath, targetPath);
};

const cleanupOldBatchJobs = async (): Promise<void> => {
  try {
    await ensureBatchJobRoot();
    const now = Date.now();
    const entries = await nodeFs.readdir(BATCH_JOB_ROOT_DIR, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const targetPath = path.join(BATCH_JOB_ROOT_DIR, entry.name);
        const stat = await nodeFs.stat(targetPath).catch(() => null);
        if (!stat) return;
        if (now - stat.mtimeMs < BATCH_JOB_TTL_MS) return;
        await nodeFs.rm(targetPath, { recursive: true, force: true }).catch(() => undefined);
      })
    );
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'kangur.social-image-addons.batch-jobs',
      action: 'cleanup',
    });
  }
};

const toOptionalString = (value: string | null | undefined): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const normalizeProgressSnapshot = (
  progress: BatchCaptureProgressSnapshot
): KangurSocialImageAddonsBatchProgress =>
  kangurSocialImageAddonsBatchProgressSchema.parse({
    ...progress,
    currentCaptureId: toOptionalString(progress.currentCaptureId),
    currentCaptureTitle: toOptionalString(progress.currentCaptureTitle),
    currentCaptureStatus: toOptionalString(progress.currentCaptureStatus),
    lastCaptureId: toOptionalString(progress.lastCaptureId),
    lastCaptureStatus: toOptionalString(progress.lastCaptureStatus),
    message: toOptionalString(progress.message),
  });

const buildQueuedProgress = (totalCount: number): KangurSocialImageAddonsBatchProgress =>
  kangurSocialImageAddonsBatchProgressSchema.parse({
    processedCount: 0,
    completedCount: 0,
    failureCount: 0,
    remainingCount: totalCount,
    totalCount,
    currentCaptureId: null,
    currentCaptureTitle: null,
    currentCaptureStatus: 'queued',
    lastCaptureId: null,
    lastCaptureStatus: null,
    message:
      totalCount === 1
        ? 'Queued Playwright capture for 1 preset.'
        : `Queued Playwright capture for ${totalCount} presets.`,
  });

const buildCompletedProgress = (
  result: KangurSocialImageAddonsBatchResult
): KangurSocialImageAddonsBatchProgress => {
  const totalCount =
    result.usedPresetCount ?? result.addons.length + result.failures.length;
  return kangurSocialImageAddonsBatchProgressSchema.parse({
    processedCount: totalCount,
    completedCount: result.addons.length,
    failureCount: result.failures.length,
    remainingCount: 0,
    totalCount,
    currentCaptureId: null,
    currentCaptureTitle: null,
    currentCaptureStatus: 'completed',
    lastCaptureId: null,
    lastCaptureStatus: result.failures.length > 0 ? 'failed' : 'ok',
    message:
      result.addons.length > 0
        ? `Captured ${result.addons.length} screenshot${result.addons.length === 1 ? '' : 's'} across ${totalCount} preset${totalCount === 1 ? '' : 's'}.`
        : `Capture finished with ${result.failures.length} failure${result.failures.length === 1 ? '' : 's'}.`,
  });
};

export const readKangurSocialImageAddonsBatchJob = async (
  id: string
): Promise<KangurSocialImageAddonsBatchJob | null> => {
  const trimmedId = id.trim();
  if (!trimmedId) return null;

  try {
    const raw = await nodeFs.readFile(resolveBatchJobStatePath(trimmedId), 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    const safe = kangurSocialImageAddonsBatchJobSchema.safeParse(parsed);
    return safe.success ? safe.data : null;
  } catch {
    return null;
  }
};

const updateKangurSocialImageAddonsBatchJob = async (
  id: string,
  patch: Partial<KangurSocialImageAddonsBatchJob>
): Promise<KangurSocialImageAddonsBatchJob> => {
  const existing = await readKangurSocialImageAddonsBatchJob(id);
  if (!existing) {
    throw new Error(`Social image batch job "${id}" not found.`);
  }

  const next = kangurSocialImageAddonsBatchJobSchema.parse({
    ...existing,
    ...patch,
    id: existing.id,
    runId: existing.runId,
    updatedAt: nowIso(),
  });
  await writeBatchJobState(next);
  return next;
};

export const startKangurSocialImageAddonsBatchJob = async (
  input: BatchJobStartInput
): Promise<KangurSocialImageAddonsBatchJob> => {
  await cleanupOldBatchJobs();

  const started = await startPlaywrightBatchCapture(input);
  const jobId = started.run.runId;
  const initialJob = kangurSocialImageAddonsBatchJobSchema.parse({
    id: jobId,
    runId: started.run.runId,
    status: 'queued',
    progress: buildQueuedProgress(started.presets.length),
    result: null,
    error: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  await writeBatchJobState(initialJob);

  void (async (): Promise<void> => {
    try {
      await updateKangurSocialImageAddonsBatchJob(jobId, { status: 'running' });
      const run =
        started.run.status === 'completed' || started.run.status === 'failed'
          ? started.run
          : await waitForPlaywrightBatchRun({
              runId: started.run.runId,
              onProgress: async (progress) => {
                await updateKangurSocialImageAddonsBatchJob(jobId, {
                  status: 'running',
                  progress: normalizeProgressSnapshot(progress),
                });
              },
            });

      const result = await finalizePlaywrightBatchCapture({
        ...started,
        run,
      });
      await updateKangurSocialImageAddonsBatchJob(jobId, {
        status: 'completed',
        progress: buildCompletedProgress(result),
        result,
        error: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Batch capture failed.';
      await updateKangurSocialImageAddonsBatchJob(jobId, {
        status: 'failed',
        error: message,
      }).catch(() => undefined);
      await ErrorSystem.captureException(error, {
        service: 'kangur.social-image-addons.batch-jobs',
        action: 'run',
        runId: started.run.runId,
      });
    }
  })();

  return initialJob;
};
