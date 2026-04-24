import 'server-only';

export * from './runtime-analytics/config';
export * from './runtime-analytics/utils';
export * from './runtime-analytics/availability';
export * from './runtime-analytics/cache';
export * from './runtime-analytics/trace';
export * from './runtime-analytics/recording';

import type {
  AiPathRuntimeAnalyticsRange,
  AiPathRuntimeAnalyticsSummary,
} from '@/shared/contracts/ai-paths';

import {
  getRuntimeAnalyticsSummaryBase,
  resolveRuntimeAnalyticsRangeWindow,
} from './runtime-analytics/summary';

export { resolveRuntimeAnalyticsRangeWindow };

export const getRuntimeAnalyticsSummary = async (
  window: { from: Date; to: Date },
  range: AiPathRuntimeAnalyticsRange | 'custom' = 'custom'
): Promise<AiPathRuntimeAnalyticsSummary> =>
  getRuntimeAnalyticsSummaryBase({
    from: window.from,
    to: window.to,
    range,
  });
