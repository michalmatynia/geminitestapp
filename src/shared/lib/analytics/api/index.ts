import type {
  AnalyticsRange,
  AnalyticsScope,
  AnalyticsSummary,
} from '@/shared/contracts/analytics';
import { api } from '@/shared/lib/api-client';

export async function fetchAnalyticsSummary(input?: {
  range?: AnalyticsRange;
  scope?: AnalyticsScope | 'all';
}): Promise<AnalyticsSummary> {
  const range = input?.range ?? '24h';
  const scope = input?.scope ?? 'all';

  return api.get<AnalyticsSummary>('/api/analytics/summary', {
    params: { range, scope },
  });
}
