import type {
  AnalyticsEventFilterType,
  AnalyticsEventsResponse,
  AnalyticsRange,
  AnalyticsScope,
  AnalyticsSummary,
} from '@/shared/contracts/analytics';
import { api } from '@/shared/lib/api-client';

export type {
  AnalyticsEventFilterType,
  AnalyticsEventsResponse,
  AnalyticsRange,
  AnalyticsScope,
  AnalyticsSummary,
};

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

export async function fetchAnalyticsEvents(input?: {
  page?: number;
  pageSize?: number;
  range?: AnalyticsRange;
  scope?: AnalyticsScope | 'all';
  type?: AnalyticsEventFilterType;
}): Promise<AnalyticsEventsResponse> {
  const page = input?.page ?? 1;
  const pageSize = input?.pageSize ?? 25;
  const range = input?.range ?? '24h';
  const scope = input?.scope ?? 'all';
  const type = input?.type ?? 'all';

  return api.get<AnalyticsEventsResponse>('/api/analytics/events', {
    params: {
      page,
      pageSize,
      range,
      scope,
      type,
    },
  });
}
