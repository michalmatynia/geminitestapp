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
import { listSystemLogs } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const AI_INSIGHTS_RUN_PATH_ID = 'brain-ai-insights';
const AI_INSIGHTS_RUN_PATH_NAME = 'One Site AI Analysis Bots';

const parseDate = (value: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const shouldRun = (lastRun: Date | null, minutes: number): boolean => {
  if (!lastRun) return true;
  const diff = Date.now() - lastRun.getTime();
  return diff >= minutes * 60 * 1000;
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export async function tick(): Promise<void> {
  const baseMeta: Record<string, unknown> = {
    source: 'ai_insights',
    sourceInfo: {
      tab: 'brain',
      location: 'ai-insights-queue',
    },
    executionMode: 'server',
    runMode: 'queue',
    queue: 'ai-insights',
    jobType: 'scheduled_tick',
  };
  const schedule = await getScheduleSettings();
  const [analyticsBrain, runtimeAnalyticsBrain, logsBrain, aiPathsBrain] = await Promise.all([
    getBrainAssignmentForCapability('insights.analytics'),
    getBrainAssignmentForCapability('insights.runtime_analytics'),
    getBrainAssignmentForCapability('insights.system_logs'),
    getBrainAssignmentForCapability('ai_paths.model'),
  ]);

  const analyticsEnabled = schedule.analyticsEnabled && analyticsBrain.enabled;
  const runtimeAnalyticsEnabled =
    schedule.runtimeAnalyticsEnabled && runtimeAnalyticsBrain.enabled && aiPathsBrain.enabled;
  const logsEnabled = schedule.logsEnabled && logsBrain.enabled;
  const logsAutoEnabled = schedule.logsAutoOnError && logsBrain.enabled;

  if (!analyticsEnabled && !runtimeAnalyticsEnabled && !logsEnabled && !logsAutoEnabled) {
    return;
  }

  const [analyticsLastRunRaw, runtimeAnalyticsLastRunRaw, logsLastRunRaw, logsLastErrorSeenRaw] =
    await Promise.all([
      analyticsEnabled
        ? getAiInsightsMeta(AI_INSIGHTS_SETTINGS_KEYS.analyticsLastRunAt)
        : Promise.resolve(null),
      runtimeAnalyticsEnabled
        ? getAiInsightsMeta(AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsLastRunAt)
        : Promise.resolve(null),
      logsEnabled
        ? getAiInsightsMeta(AI_INSIGHTS_SETTINGS_KEYS.logsLastRunAt)
        : Promise.resolve(null),
      logsAutoEnabled
        ? getAiInsightsMeta(AI_INSIGHTS_SETTINGS_KEYS.logsLastErrorSeenAt)
        : Promise.resolve(null),
    ]);

  const analyticsLastRun = parseDate(analyticsLastRunRaw);
  const runtimeAnalyticsLastRun = parseDate(runtimeAnalyticsLastRunRaw);
  const logsLastRun = parseDate(logsLastRunRaw);
  const logsLastErrorSeenAt = parseDate(logsLastErrorSeenRaw);

  const shouldRunAnalytics =
    analyticsEnabled && shouldRun(analyticsLastRun, schedule.analyticsMinutes);
  const shouldRunRuntimeAnalytics =
    runtimeAnalyticsEnabled && shouldRun(runtimeAnalyticsLastRun, schedule.runtimeAnalyticsMinutes);
  const shouldRunLogs = logsEnabled && shouldRun(logsLastRun, schedule.logsMinutes);

  let shouldRunLogsAuto = false;
  let logsAutoLatestAtIso: string | null = null;
  if (logsAutoEnabled) {
    const latestError = await listSystemLogs({ level: 'error', page: 1, pageSize: 1 });
    const latest = latestError.logs[0];
    const latestAt = latest ? new Date(latest.createdAt || 0) : null;
    if (
      latestAt &&
      Number.isFinite(latestAt.getTime()) &&
      (!logsLastErrorSeenAt || latestAt.getTime() > logsLastErrorSeenAt.getTime())
    ) {
      shouldRunLogsAuto = true;
      logsAutoLatestAtIso = latestAt.toISOString();
    }
  }

  if (!shouldRunAnalytics && !shouldRunRuntimeAnalytics && !shouldRunLogs && !shouldRunLogsAuto) {
    return;
  }

  const runRepository = await getPathRunRepository();
  let runId: string | null = null;
  const runEvents: string[] = [];
  const appendRunEvent = async (
    message: string,
    level: 'info' | 'warning' | 'error' = 'info'
  ): Promise<void> => {
    runEvents.push(message);
    if (!runId) return;
    try {
      await runRepository.createRunEvent({
        runId,
        level: level === 'warning' ? 'warn' : level,
        message,
      });
    } catch (error) {
      void ErrorSystem.captureException(error);
    
      // Keep scheduler work resilient if logging fails.
    }
  };

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
    runId = createdRun.id;
    await runRepository.updateRun(runId, {
      status: 'running',
      startedAt: new Date().toISOString(),
    });
    await appendRunEvent('AI Insights tick started.');
  } catch (error) {
    void ErrorSystem.captureException(error);
  
    // Continue processing even if run logging cannot be initialized.
  }

  const executedJobs: string[] = [];
  const failedJobs: Array<{ job: string; error: string }> = [];
  const runInsightStep = async (job: string, action: () => Promise<void>): Promise<void> => {
    try {
      await action();
      executedJobs.push(job);
    } catch (error: unknown) {
      void ErrorSystem.captureException(error);
      const message = toErrorMessage(error);
      failedJobs.push({ job, error: message });
      await appendRunEvent(`Insight step failed (${job}): ${message}`, 'warning');
    }
  };

  if (shouldRunAnalytics) {
    await runInsightStep('analytics', async () => {
      await appendRunEvent('Generating analytics insight.');
      await generateAnalyticsInsight({ source: 'scheduled_job' });
      await appendRunEvent('Analytics insight generated.');
    });
  } else if (schedule.analyticsEnabled && !analyticsBrain.enabled) {
    await appendRunEvent('Skipping analytics insight: disabled in Brain settings.', 'info');
  }

  if (shouldRunRuntimeAnalytics) {
    await runInsightStep('runtime_analytics', async () => {
      await appendRunEvent('Generating runtime analytics insight.');
      await generateRuntimeAnalyticsInsight({ source: 'scheduled_job', range: '24h' });
      await appendRunEvent('Runtime analytics insight generated.');
    });
  } else if (
    schedule.runtimeAnalyticsEnabled &&
    (!runtimeAnalyticsBrain.enabled || !aiPathsBrain.enabled)
  ) {
    await appendRunEvent(
      'Skipping runtime analytics insight: disabled in Brain settings (runtime analytics or AI Paths).',
      'info'
    );
  }

  if (shouldRunLogs) {
    await runInsightStep('logs', async () => {
      await appendRunEvent('Generating logs insight.');
      await generateLogsInsight({ source: 'scheduled_job' });
      await appendRunEvent('Logs insight generated.');
    });
  } else if (schedule.logsEnabled && !logsBrain.enabled) {
    await appendRunEvent('Skipping logs insight: disabled in Brain settings.', 'info');
  }

  try {
    if (shouldRunLogsAuto && logsAutoLatestAtIso) {
      await runInsightStep('logs_auto', async () => {
        await appendRunEvent('Detected new system error log. Generating auto logs insight.');
        await generateLogsInsight({ source: 'system' });
        await setAiInsightsMeta(AI_INSIGHTS_SETTINGS_KEYS.logsLastErrorSeenAt, logsAutoLatestAtIso);
        await appendRunEvent('Auto logs insight generated.');
      });
    } else if (schedule.logsAutoOnError && !logsBrain.enabled) {
      await appendRunEvent('Skipping auto logs insight: disabled in Brain settings.', 'info');
    }

    if (runId) {
      await runRepository.updateRun(runId, {
        status: 'completed',
        finishedAt: new Date().toISOString(),
        runtimeState: {
          inputs: {
            schedule: {
              analyticsEnabled: schedule.analyticsEnabled,
              analyticsMinutes: schedule.analyticsMinutes,
              runtimeAnalyticsEnabled: schedule.runtimeAnalyticsEnabled,
              runtimeAnalyticsMinutes: schedule.runtimeAnalyticsMinutes,
              logsEnabled: schedule.logsEnabled,
              logsMinutes: schedule.logsMinutes,
              logsAutoOnError: schedule.logsAutoOnError,
            },
          },
          outputs: {
            summary: {
              executedJobs,
              failedJobs,
              events: runEvents,
            },
          },
        },
        meta: {
          ...baseMeta,
          completedAt: new Date().toISOString(),
          executedJobs,
          failedJobs,
        },
      });
      await appendRunEvent('AI Insights tick completed.');
    }
  } catch (error) {
    void ErrorSystem.captureException(error);
    if (runId) {
      try {
        await runRepository.updateRun(runId, {
          status: 'failed',
          finishedAt: new Date().toISOString(),
          errorMessage: toErrorMessage(error),
          meta: {
            ...baseMeta,
            failedAt: new Date().toISOString(),
            executedJobs,
          },
        });
      } catch (error) {
        void ErrorSystem.captureException(error);
      
        // Ignore persistence failures while surfacing processor failure.
      }
      await appendRunEvent(`AI Insights tick failed: ${toErrorMessage(error)}`, 'error');
    }
    throw error;
  }
}
