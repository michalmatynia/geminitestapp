import 'server-only';

import { KANGUR_KNOWLEDGE_GRAPH_KEY } from '@/features/kangur/shared/contracts/kangur-knowledge-graph';

import type {
  KangurObservabilitySummary,
  KangurObservabilityRange,
} from '@/shared/contracts';

import {
  emptyAnalyticsSnapshot,
} from './summary/summary.analytics';
import {
  emptyRouteMetrics,
  resolveKangurObservabilityRangeWindow,
} from './summary/summary.routes';

export const getKangurObservabilitySummary = async (input: {
  range?: KangurObservabilityRange;
} = {}): Promise<KangurObservabilitySummary> => {
  const range = input.range ?? '24h';
  const { from, to } = resolveKangurObservabilityRangeWindow(range);
  
  return {
    generatedAt: new Date().toISOString(),
    range,
    overallStatus: 'ok',
    window: { from: from.toISOString(), to: to.toISOString() },
    keyMetrics: {
      serverErrorRatePercent: 0,
      learnerSignInAttempts: 0,
      learnerSignInFailureRatePercent: 0,
      progressSyncFailures: 0,
      ttsRequests: 0,
      ttsGenerationFailures: 0,
      ttsFallbackRatePercent: 0,
    },
    alerts: [],
    serverLogs: { metrics: null, recent: [] },
    routes: emptyRouteMetrics(),
    analytics: emptyAnalyticsSnapshot(),
    knowledgeGraphStatus: { mode: 'disabled', graphKey: KANGUR_KNOWLEDGE_GRAPH_KEY, message: 'Disabled' },
    performanceBaseline: null,
    errors: null,
  };
};
