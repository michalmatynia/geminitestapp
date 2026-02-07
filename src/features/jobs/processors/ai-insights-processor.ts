import 'server-only';

import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import {
  generateAnalyticsInsight,
  generateLogsInsight,
  generateRuntimeAnalyticsInsight,
  getScheduleSettings,
} from '@/features/ai/insights/generator';
import { getAiInsightsMeta, setAiInsightsMeta } from '@/features/ai/insights/repository';
import { AI_INSIGHTS_SETTINGS_KEYS } from '@/features/ai/insights/settings';
import { listSystemLogs } from '@/features/observability/server';

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
  const runRepository = getPathRunRepository();
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
  let runId: string | null = null;
  const runEvents: string[] = [];
  const appendRunEvent = async (message: string, level: 'info' | 'warning' | 'error' = 'info'): Promise<void> => {
    runEvents.push(message);
    if (!runId) return;
    try {
      await runRepository.createRunEvent({
        runId,
        level,
        message,
      });
    } catch {
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
      startedAt: new Date(),
    });
    await appendRunEvent('AI Insights tick started.');
  } catch {
    // Continue processing even if run logging cannot be initialized.
  }

  const schedule = await getScheduleSettings();
  const analyticsLastRun = parseDate(
    await getAiInsightsMeta(AI_INSIGHTS_SETTINGS_KEYS.analyticsLastRunAt),
  );
  const runtimeAnalyticsLastRun = parseDate(
    await getAiInsightsMeta(AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsLastRunAt),
  );
  const logsLastRun = parseDate(
    await getAiInsightsMeta(AI_INSIGHTS_SETTINGS_KEYS.logsLastRunAt),
  );
  const executedJobs: string[] = [];

  if (schedule.analyticsEnabled && shouldRun(analyticsLastRun, schedule.analyticsMinutes)) {
    await appendRunEvent('Generating analytics insight.');
    await generateAnalyticsInsight({ source: 'scheduled' });
    executedJobs.push('analytics');
    await appendRunEvent('Analytics insight generated.');
  }

  if (
    schedule.runtimeAnalyticsEnabled &&
    shouldRun(runtimeAnalyticsLastRun, schedule.runtimeAnalyticsMinutes)
  ) {
    await appendRunEvent('Generating runtime analytics insight.');
    await generateRuntimeAnalyticsInsight({ source: 'scheduled', range: '24h' });
    executedJobs.push('runtime_analytics');
    await appendRunEvent('Runtime analytics insight generated.');
  }

  if (schedule.logsEnabled && shouldRun(logsLastRun, schedule.logsMinutes)) {
    await appendRunEvent('Generating logs insight.');
    await generateLogsInsight({ source: 'scheduled' });
    executedJobs.push('logs');
    await appendRunEvent('Logs insight generated.');
  }

  try {
    if (schedule.logsAutoOnError) {
      const latestError = await listSystemLogs({ level: 'error', page: 1, pageSize: 1 });
      const latest = latestError.logs[0];
      const lastErrorSeen = parseDate(
        await getAiInsightsMeta(AI_INSIGHTS_SETTINGS_KEYS.logsLastErrorSeenAt),
      );
      const latestAt = latest ? new Date(latest.createdAt) : null;
      if (latestAt && (!lastErrorSeen || latestAt.getTime() > lastErrorSeen.getTime())) {
        await appendRunEvent('Detected new system error log. Generating auto logs insight.');
        await generateLogsInsight({ source: 'auto' });
        await setAiInsightsMeta(
          AI_INSIGHTS_SETTINGS_KEYS.logsLastErrorSeenAt,
          latestAt.toISOString(),
        );
        executedJobs.push('logs_auto');
        await appendRunEvent('Auto logs insight generated.');
      }
    }

    if (runId) {
      await runRepository.updateRun(runId, {
        status: 'completed',
        finishedAt: new Date(),
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
              events: runEvents,
            },
          },
        },
        meta: {
          ...baseMeta,
          completedAt: new Date().toISOString(),
          executedJobs,
        },
      });
      await appendRunEvent('AI Insights tick completed.');
    }
  } catch (error) {
    if (runId) {
      try {
        await runRepository.updateRun(runId, {
          status: 'failed',
          finishedAt: new Date(),
          errorMessage: toErrorMessage(error),
          meta: {
            ...baseMeta,
            failedAt: new Date().toISOString(),
            executedJobs,
          },
        });
      } catch {
        // Ignore persistence failures while surfacing processor failure.
      }
      await appendRunEvent(`AI Insights tick failed: ${toErrorMessage(error)}`, 'error');
    }
    throw error;
  }
}
