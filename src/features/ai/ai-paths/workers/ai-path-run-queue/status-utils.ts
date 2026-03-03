import {
  getRuntimeAnalyticsSummary,
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import type { AiPathRunVisibility } from '@/shared/contracts/ai-paths';
import {
  type AiPathRunQueueBaseStatus,
  type AiPathRunQueueStatus,
} from '@/shared/contracts/ai-paths-runtime';
import {
  computeAiPathRunQueueSlo,
} from '../ai-path-run-queue-slo';
import { GetAiPathRunQueueStatusOptions } from './status';
import { AiInsightsQueueStatus } from './types';

const EMPTY_AI_INSIGHTS_QUEUE_STATUS: AiInsightsQueueStatus = {
  running: false,
  healthy: false,
  processing: false,
  activeJobs: 0,
  waitingJobs: 0,
  failedJobs: 0,
  completedJobs: 0,
  lastPollTime: 0,
  timeSinceLastPoll: 0,
};

export const getAiInsightsQueueStatusSnapshot = async (): Promise<AiInsightsQueueStatus> => {
  const module = (await import('@/features/ai/insights/workers/aiInsightsQueue')) as {
    getAiInsightsQueueStatus?: () => Promise<AiInsightsQueueStatus>;
  };
  const readStatus = module.getAiInsightsQueueStatus;
  if (typeof readStatus !== 'function') return EMPTY_AI_INSIGHTS_QUEUE_STATUS;
  return readStatus();
};

const EMPTY_BRAIN_ANALYTICS_24H: AiPathRunQueueStatus['brainAnalytics24h'] = {
  analyticsReports: 0,
  logReports: 0,
  totalReports: 0,
  warningReports: 0,
  errorReports: 0,
};

export const getQueueStatusScopeKey = (
  visibility: AiPathRunVisibility,
  options: GetAiPathRunQueueStatusOptions
): string => {
  if (visibility === 'global') return 'global';
  return `scoped:${options.userId?.trim() || 'anonymous'}`;
};

type RuntimeAnalyticsSummarySnapshot = Awaited<ReturnType<typeof getRuntimeAnalyticsSummary>>;

export const finalizeAiPathRunQueueStatus = (
  baseStatus: AiPathRunQueueBaseStatus,
  runtimeAnalyticsSummary?: RuntimeAnalyticsSummarySnapshot
): AiPathRunQueueStatus => {
  const brainAnalytics24h = runtimeAnalyticsSummary
    ? {
      analyticsReports: runtimeAnalyticsSummary.brain.analyticsReports,
      logReports: runtimeAnalyticsSummary.brain.logReports,
      totalReports: runtimeAnalyticsSummary.brain.totalReports,
      warningReports: runtimeAnalyticsSummary.brain.warningReports,
      errorReports: runtimeAnalyticsSummary.brain.errorReports,
    }
    : EMPTY_BRAIN_ANALYTICS_24H;
  const terminalRuns24h = runtimeAnalyticsSummary
    ? runtimeAnalyticsSummary.runs.completed +
      runtimeAnalyticsSummary.runs.failed +
      runtimeAnalyticsSummary.runs.canceled +
      runtimeAnalyticsSummary.runs.deadLettered
    : 0;
  const brainTotalReports24h = brainAnalytics24h.totalReports;
  const brainErrorRate24h =
    brainTotalReports24h > 0
      ? Math.max(0, Math.min(100, (brainAnalytics24h.errorReports / brainTotalReports24h) * 100))
      : 0;
  const slo = computeAiPathRunQueueSlo({
    queueRunning: baseStatus.running,
    queueHealthy: baseStatus.healthy,
    queueLagMs: baseStatus.queueLagMs,
    successRate24h: runtimeAnalyticsSummary?.runs.successRate ?? 0,
    terminalRuns24h,
    deadLetterRate24h: runtimeAnalyticsSummary?.runs.deadLetterRate ?? 0,
    brainErrorRate24h,
    brainTotalReports24h,
  });

  return {
    ...baseStatus,
    avgRuntimeMs: runtimeAnalyticsSummary?.runs.avgDurationMs ?? null,
    p50RuntimeMs: null,
    p95RuntimeMs: runtimeAnalyticsSummary?.runs.p95DurationMs ?? null,
    lastCheckedAt: new Date().toISOString(),
    isStale: false,
    brainAnalytics24h,
    slo,
  };
};
