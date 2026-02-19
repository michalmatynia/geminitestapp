import { api } from '@/shared/lib/api-client';
import type { AnalyticsScopeDto as AnalyticsScope, AnalyticsSummaryDto } from '@/shared/contracts/analytics';

export type AnalyticsRange = '24h' | '7d' | '30d';

export async function fetchAnalyticsSummary(input?: {
  range?: AnalyticsRange;
  scope?: AnalyticsScope | 'all';
}): Promise<AnalyticsSummaryDto> {
  const range = input?.range ?? '24h';
  const scope = input?.scope ?? 'all';

  return api.get<AnalyticsSummaryDto>('/api/analytics/summary', {
    params: { range, scope }
  });
}

