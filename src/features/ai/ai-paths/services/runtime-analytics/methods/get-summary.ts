import { getRuntimeAnalyticsSummary as getRuntimeAnalyticsSummaryBase } from '@/features/ai/ai-paths/server';
import { buildPortableEngineAnalytics } from '@/features/ai/ai-paths/services/runtime-analytics/config';
import type { AiPathRuntimeAnalyticsSummary } from '@/shared/contracts/ai-paths-runtime';
type AiPathRuntimeAnalyticsRange = 'daily' | 'weekly' | 'monthly';

export const getRuntimeAnalyticsSummary = async (input: {
  from: Date;
  to: Date;
  range?: AiPathRuntimeAnalyticsRange | 'custom';
  includeTraces?: boolean;
}): Promise<AiPathRuntimeAnalyticsSummary> => {
  const summary = await getRuntimeAnalyticsSummaryBase(input);
  return {
    ...(summary as AiPathRuntimeAnalyticsSummary),
    portableEngine: buildPortableEngineAnalytics(),
  };
};
