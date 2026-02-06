import type { AnalyticsScope, AnalyticsSummaryDto } from '@/shared/types';

export type AnalyticsRange = '24h' | '7d' | '30d';

export async function fetchAnalyticsSummary(input?: {
  range?: AnalyticsRange;
  scope?: AnalyticsScope | 'all';
}): Promise<AnalyticsSummaryDto> {
  const range = input?.range ?? '24h';
  const scope = input?.scope ?? 'all';

  const params = new URLSearchParams();
  params.set('range', range);
  params.set('scope', scope);

  const response = await fetch(`/api/analytics/summary?${params.toString()}`);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? 'Failed to load analytics summary');
  }

  return response.json() as Promise<AnalyticsSummaryDto>;
}

