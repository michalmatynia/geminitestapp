import 'server-only';

import type { AiPathRunRecord, AiPathRunRepository } from '@/shared/contracts/ai-paths';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  BASE_EXPORT_RUN_PATH_ID,
  BASE_EXPORT_RUN_SOURCE,
} from './base-export-segments/constants';

const DEFAULT_BASE_EXPORT_STALE_PRE_DISPATCH_MAX_AGE_MS = 10 * 60 * 1000;
const BASE_EXPORT_RECOVERY_SCAN_LIMIT = 100;
const STALE_PRE_DISPATCH_ERROR_MESSAGE =
  'Run marked failed because Base.com export never reached the queue worker.';

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const parseTimestampMs = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getLastActivityMs = (run: AiPathRunRecord): number | null =>
  parseTimestampMs(run.updatedAt) ??
  parseTimestampMs(run.startedAt) ??
  parseTimestampMs(run.createdAt);

const getBaseExportMeta = (run: AiPathRunRecord): Record<string, unknown> => toRecord(run.meta);

const getBaseExportSourceInfo = (run: AiPathRunRecord): Record<string, unknown> =>
  toRecord(getBaseExportMeta(run)['sourceInfo']);

const getTrimmedString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const getBaseExportRunProductId = (run: AiPathRunRecord): string | null =>
  getTrimmedString(run.entityId) ??
  getTrimmedString(getBaseExportMeta(run)['productId']) ??
  getTrimmedString(getBaseExportSourceInfo(run)['productId']);

const getBaseExportRunConnectionId = (run: AiPathRunRecord): string | null =>
  getTrimmedString(getBaseExportMeta(run)['connectionId']) ??
  getTrimmedString(getBaseExportSourceInfo(run)['connectionId']);

const hasQueueJobId = (run: AiPathRunRecord): boolean =>
  getTrimmedString(getBaseExportMeta(run)['jobId']) !== null;

const isStalePreDispatchBaseExportRun = (
  run: AiPathRunRecord,
  input: {
    cutoffMs: number;
    productId?: string;
    connectionId?: string;
  }
): boolean => {
  if (run.status !== 'running') return false;
  if (run.pathId !== BASE_EXPORT_RUN_PATH_ID) return false;

  const meta = getBaseExportMeta(run);
  if (getTrimmedString(meta['source']) !== BASE_EXPORT_RUN_SOURCE) return false;
  if (hasQueueJobId(run)) return false;

  if (input.productId && getBaseExportRunProductId(run) !== input.productId) return false;
  if (input.connectionId && getBaseExportRunConnectionId(run) !== input.connectionId) return false;

  const lastActivityMs = getLastActivityMs(run);
  return lastActivityMs === null || lastActivityMs <= input.cutoffMs;
};

export const resolveBaseExportStalePreDispatchMaxAgeMs = (): number =>
  parsePositiveInt(
    process.env['BASE_EXPORT_STALE_PRE_DISPATCH_MAX_AGE_MS'],
    DEFAULT_BASE_EXPORT_STALE_PRE_DISPATCH_MAX_AGE_MS
  );

export const recoverStaleBaseExportRuns = async (input?: {
  repo?: AiPathRunRepository;
  userId?: string;
  productId?: string;
  connectionId?: string;
  maxAgeMs?: number;
}): Promise<number> => {
  const repo = input?.repo ?? (await getPathRunRepository());
  const maxAgeMs = input?.maxAgeMs ?? resolveBaseExportStalePreDispatchMaxAgeMs();
  const cutoffMs = Date.now() - maxAgeMs;
  let recoveredCount = 0;

  try {
    while (true) {
      const { runs } = await repo.listRuns({
        ...(input?.userId ? { userId: input.userId } : {}),
        pathId: BASE_EXPORT_RUN_PATH_ID,
        source: BASE_EXPORT_RUN_SOURCE,
        status: 'running',
        limit: BASE_EXPORT_RECOVERY_SCAN_LIMIT,
        offset: 0,
        includeTotal: false,
      });

      const staleRuns = runs.filter((run) =>
        isStalePreDispatchBaseExportRun(run, {
          cutoffMs,
          productId: input?.productId,
          connectionId: input?.connectionId,
        })
      );

      if (staleRuns.length === 0) break;

      let recoveredThisPass = 0;
      for (const run of staleRuns) {
        const recoveredAt = new Date().toISOString();
        const queueRecovery = {
          reason: 'stale-pre-dispatch',
          recoveredAt,
          maxAgeMs,
          productId: getBaseExportRunProductId(run),
          connectionId: getBaseExportRunConnectionId(run),
        };
        const updated = await repo
          .updateRunIfStatus(run.id, ['running'], {
            status: 'failed',
            finishedAt: recoveredAt,
            errorMessage: STALE_PRE_DISPATCH_ERROR_MESSAGE,
            meta: {
              ...getBaseExportMeta(run),
              queueRecovery,
            },
          })
          .catch(() => null);

        if (!updated) continue;
        recoveredThisPass += 1;
        recoveredCount += 1;

        await repo
          .createRunEvent({
            runId: run.id,
            level: 'error',
            message: `Export failed: ${STALE_PRE_DISPATCH_ERROR_MESSAGE}`,
            metadata: {
              queueRecovery: true,
              ...queueRecovery,
            },
          })
          .catch(() => undefined);
      }

      if (recoveredThisPass === 0) break;
    }
  } catch (error) {
    void ErrorSystem.captureException(error);
    return recoveredCount;
  }

  return recoveredCount;
};
