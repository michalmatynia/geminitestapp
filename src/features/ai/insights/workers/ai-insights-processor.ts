import 'server-only';

import {
  generateAnalyticsInsight,
  generateLogsInsight,
  generateRuntimeAnalyticsInsight,
  getScheduleSettings,
} from '@/features/ai/insights/server';
import { getAiInsightsMeta, setAiInsightsMeta } from '@/features/ai/insights/server';
import { AI_INSIGHTS_SETTINGS_KEYS } from '@/features/ai/insights/server';
import { getBrainAssignmentForCapability } from '@/shared/lib/ai-brain/server';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { listSystemLogs } from '@/shared/lib/observability/system-log-repository';;
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const AI_INSIGHTS_RUN_PATH_ID = 'brain-ai-insights';
const AI_INSIGHTS_RUN_PATH_NAME = 'One Site AI Analysis Bots';

const parseDate = (value: string | null): Date | null => {
  if (value === null || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const shouldRun = (lastRun: Date | null, minutes: number): boolean => {
  if (lastRun === null) return true;
  const diff = Date.now() - lastRun.getTime();
  return diff >= minutes * 60 * 1000;
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

interface TickContext {
  schedule: Awaited<ReturnType<typeof getScheduleSettings>>;
  runId: string | null;
  runEvents: string[];
  executedJobs: string[];
  failedJobs: Array<{ job: string; error: string }>;
}

type BrainStatus = Awaited<ReturnType<typeof getBrainAssignmentForCapability>>;

const resolveTickBrains = async (): Promise<[BrainStatus, BrainStatus, BrainStatus, BrainStatus]> =>
  Promise.all([
    getBrainAssignmentForCapability('insights.analytics'),
    getBrainAssignmentForCapability('insights.runtime_analytics'),
    getBrainAssignmentForCapability('insights.system_logs'),
    getBrainAssignmentForCapability('ai_paths.model'),
  ]);

const resolveTickLastRuns = async (config: {
  analytics: boolean;
  runtime: boolean;
  logs: boolean;
  logsAuto: boolean;
}): Promise<[string | null, string | null, string | null, string | null]> =>
  Promise.all([
    config.analytics
      ? getAiInsightsMeta(AI_INSIGHTS_SETTINGS_KEYS.analyticsLastRunAt)
      : Promise.resolve(null),
    config.runtime
      ? getAiInsightsMeta(AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsLastRunAt)
      : Promise.resolve(null),
    config.logs
      ? getAiInsightsMeta(AI_INSIGHTS_SETTINGS_KEYS.logsLastRunAt)
      : Promise.resolve(null),
    config.logsAuto
      ? getAiInsightsMeta(AI_INSIGHTS_SETTINGS_KEYS.logsLastErrorSeenAt)
      : Promise.resolve(null),
  ]);

const resolveShouldRunLogsAuto = async (
  logsAutoEnabled: boolean,
  logsLastErrorSeenAt: Date | null
): Promise<{ shouldRun: boolean; latestAtIso: string | null }> => {
  if (!logsAutoEnabled) return { shouldRun: false, latestAtIso: null };

  const latestError = await listSystemLogs({ level: 'error', page: 1, pageSize: 1 });
  const latest = latestError.logs[0];
  const latestAt = latest?.createdAt !== undefined ? new Date(latest.createdAt) : null;

  if (
    latestAt !== null &&
    Number.isFinite(latestAt.getTime()) &&
    (logsLastErrorSeenAt === null || latestAt.getTime() > logsLastErrorSeenAt.getTime())
  ) {
    return { shouldRun: true, latestAtIso: latestAt.toISOString() };
  }

  return { shouldRun: false, latestAtIso: null };
};

const executeInsightJob = async (
  ctx: TickContext,
  job: string,
  runRepository: Awaited<ReturnType<typeof getPathRunRepository>>,
  action: () => Promise<void>
): Promise<void> => {
  async function appendEvent(msg: string, level: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
    ctx.runEvents.push(msg);
    if (ctx.runId === null) return;
    await runRepository
      .createRunEvent({
        runId: ctx.runId,
        level: level === 'warning' ? 'warn' : level,
        message: msg,
      })
      .catch((err) => {
        ErrorSystem.captureException(err).catch(() => {});
      });
  }

  try {
    await action();
    ctx.executedJobs.push(job);
  } catch (err) {
    ErrorSystem.captureException(err).catch(() => {});
    const message = toErrorMessage(err);
    ctx.failedJobs.push({ job, error: message });
    await appendEvent(`Insight step failed (${job}): ${message}`, 'warning');
  }
};

interface TickStatus {
  shouldRunAnalytics: boolean;
  shouldRunRuntime: boolean;
  shouldRunLogs: boolean;
  shouldRunLogsAuto: boolean;
  logsAutoAt: string | null;
}

const resolveTickStatus = async (
  schedule: Awaited<ReturnType<typeof getScheduleSettings>>
): Promise<TickStatus | null> => {
  const [analyticsB, runtimeB, logsB, aiPathsB] = await resolveTickBrains();

  const analyticsEnabled = schedule.analyticsEnabled && analyticsB.enabled;
  const runtimeEnabled = schedule.runtimeAnalyticsEnabled && runtimeB.enabled && aiPathsB.enabled;
  const logsEnabled = schedule.logsEnabled && logsB.enabled;
  const logsAutoEnabled = schedule.logsAutoOnError && logsB.enabled;

  if (!analyticsEnabled && !runtimeEnabled && !logsEnabled && !logsAutoEnabled) {
    return null;
  }

  const [lastAnalytics, lastRuntime, lastLogs, lastLogsAuto] = await resolveTickLastRuns({
    analytics: analyticsEnabled,
    runtime: runtimeEnabled,
    logs: logsEnabled,
    logsAuto: logsAutoEnabled,
  });

  const { shouldRun: shouldRunLogsAuto, latestAtIso: logsAutoAt } = await resolveShouldRunLogsAuto(
    logsAutoEnabled,
    parseDate(lastLogsAuto)
  );

  return {
    shouldRunAnalytics: analyticsEnabled && shouldRun(parseDate(lastAnalytics), schedule.analyticsMinutes),
    shouldRunRuntime: runtimeEnabled && shouldRun(parseDate(lastRuntime), schedule.runtimeAnalyticsMinutes),
    shouldRunLogs: logsEnabled && shouldRun(parseDate(lastLogs), schedule.logsMinutes),
    shouldRunLogsAuto,
    logsAutoAt,
  };
};

const initializeTickRun = async (
  runRepository: Awaited<ReturnType<typeof getPathRunRepository>>,
  baseMeta: Record<string, unknown>
): Promise<string | null> => {
  try {
    const createdRun = await runRepository.createRun({
      pathId: AI_INSIGHTS_RUN_PATH_ID,
      pathName: AI_INSIGHTS_RUN_PATH_NAME,
      triggerEvent: 'scheduled_run',
      triggerNodeId: 'ai-insights-tick',
      meta: baseMeta,
      maxAttempts: 1,
      retryCount: 0,
    });
    await runRepository.updateRun(createdRun.id, {
      status: 'running',
      startedAt: new Date().toISOString(),
    });
    return createdRun.id;
  } catch (err) {
    ErrorSystem.captureException(err).catch(() => {});
    return null;
  }
};

const finalizeTickRun = async (
  runRepository: Awaited<ReturnType<typeof getPathRunRepository>>,
  ctx: TickContext,
  baseMeta: Record<string, unknown>,
  error?: unknown
): Promise<void> => {
  if (ctx.runId === null) return;
  const errorObj = error ?? null;
  try {
    if (errorObj !== null) {
      await runRepository.updateRun(ctx.runId, {
        status: 'failed',
        finishedAt: new Date().toISOString(),
        errorMessage: toErrorMessage(errorObj),
        meta: { ...baseMeta, failedAt: new Date().toISOString(), executedJobs: ctx.executedJobs },
      });
    } else {
      await runRepository.updateRun(ctx.runId, {
        status: 'completed',
        finishedAt: new Date().toISOString(),
        runtimeState: { inputs: { schedule: ctx.schedule }, outputs: { summary: { executedJobs: ctx.executedJobs, failedJobs: ctx.failedJobs, events: ctx.runEvents } } },
        meta: { ...baseMeta, completedAt: new Date().toISOString(), executedJobs: ctx.executedJobs, failedJobs: ctx.failedJobs },
      });
    }
  } catch (err) {
    ErrorSystem.captureException(err).catch(() => {});
  }
};

const executeAllTickJobs = async (
  ctx: TickContext,
  status: TickStatus,
  runRepo: Awaited<ReturnType<typeof getPathRunRepository>>
): Promise<void> => {
  if (status.shouldRunAnalytics) {
    await executeInsightJob(ctx, 'analytics', runRepo, async () => {
      await generateAnalyticsInsight({ source: 'scheduled_job' });
    });
  }
  if (status.shouldRunRuntime) {
    await executeInsightJob(ctx, 'runtime_analytics', runRepo, async () => {
      await generateRuntimeAnalyticsInsight({ source: 'scheduled_job', range: '24h' });
    });
  }
  if (status.shouldRunLogs) {
    await executeInsightJob(ctx, 'logs', runRepo, async () => {
      await generateLogsInsight({ source: 'scheduled_job' });
    });
  }
  if (status.shouldRunLogsAuto && status.logsAutoAt !== null) {
    await executeInsightJob(ctx, 'logs_auto', runRepo, async () => {
      await generateLogsInsight({ source: 'system' });
      await setAiInsightsMeta(AI_INSIGHTS_SETTINGS_KEYS.logsLastErrorSeenAt, status.logsAutoAt as string);
    });
  }
};

export async function tick(): Promise<void> {
  const schedule = await getScheduleSettings();
  const status = await resolveTickStatus(schedule);
  if (status === null) return;

  if (!status.shouldRunAnalytics && !status.shouldRunRuntime && !status.shouldRunLogs && !status.shouldRunLogsAuto) {
    return;
  }

  const runRepo = await getPathRunRepository();
  const ctx: TickContext = { schedule, runId: null, runEvents: [], executedJobs: [], failedJobs: [] };
  const baseMeta = {
    source: 'ai_insights',
    sourceInfo: { tab: 'brain', location: 'ai-insights-queue' },
    executionMode: 'server' as const,
    runMode: 'queue' as const,
    queue: 'ai-insights',
    jobType: 'scheduled_tick',
  };

  ctx.runId = await initializeTickRun(runRepo, baseMeta);
  await executeAllTickJobs(ctx, status, runRepo);

  try {
    await finalizeTickRun(runRepo, ctx, baseMeta);
  } catch (err) {
    await finalizeTickRun(runRepo, ctx, baseMeta, err);
    throw err;
  }
}
