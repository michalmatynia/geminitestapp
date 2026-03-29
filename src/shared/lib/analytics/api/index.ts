import type {
  AnalyticsEventFilterBot,
  AnalyticsEventFilterType,
  AnalyticsEventsResponse,
  AnalyticsRange,
  AnalyticsScope,
  AnalyticsSummary,
} from '@/shared/contracts/analytics';
import { api } from '@/shared/lib/api-client';

export type {
  AnalyticsEventFilterBot,
  AnalyticsEventFilterType,
  AnalyticsEventsResponse,
  AnalyticsRange,
  AnalyticsScope,
  AnalyticsSummary,
};

type FetchAnalyticsSummaryInput = {
  range?: AnalyticsRange;
  scope?: AnalyticsScope | 'all';
};

type FetchAnalyticsEventsInput = {
  page?: number;
  pageSize?: number;
  range?: AnalyticsRange;
  scope?: AnalyticsScope | 'all';
  type?: AnalyticsEventFilterType;
  search?: string;
  country?: string;
  referrerHost?: string;
  browser?: string;
  device?: string;
  bot?: AnalyticsEventFilterBot;
};

const resolveAnalyticsSummaryParams = ({
  range = '24h',
  scope = 'all',
}: FetchAnalyticsSummaryInput = {}) => ({ range, scope });

const resolveAnalyticsEventParams = ({
  page = 1,
  pageSize = 25,
  range = '24h',
  scope = 'all',
  type = 'all',
  search = '',
  country = '',
  referrerHost = '',
  browser = '',
  device = '',
  bot = 'all',
}: FetchAnalyticsEventsInput = {}) => ({
  page,
  pageSize,
  range,
  scope,
  type,
  search,
  country,
  referrerHost,
  browser,
  device,
  bot,
});

export async function fetchAnalyticsSummary(
  input?: FetchAnalyticsSummaryInput
): Promise<AnalyticsSummary> {
  return api.get<AnalyticsSummary>('/api/analytics/summary', {
    params: resolveAnalyticsSummaryParams(input),
  });
}

export async function fetchAnalyticsEvents(
  input?: FetchAnalyticsEventsInput
): Promise<AnalyticsEventsResponse> {
  return api.get<AnalyticsEventsResponse>('/api/analytics/events', {
    params: resolveAnalyticsEventParams(input),
  });
}
