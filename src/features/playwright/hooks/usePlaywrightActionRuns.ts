'use client';

import type {
  PlaywrightActionRunDetailResponse,
  PlaywrightActionRunListFilters,
  PlaywrightActionRunListResponse,
  PlaywrightActionRunSummary,
} from '@/shared/contracts/playwright-action-runs';
import type { ListQuery, SingleQuery } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2, createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { playwrightKeys } from '@/shared/lib/query-key-exports';

const buildParams = (
  filters: PlaywrightActionRunListFilters
): Record<string, string | number | boolean | undefined> => ({
  actionId: filters.actionId,
  runtimeKey: filters.runtimeKey,
  status: filters.status,
  selectorProfile: filters.selectorProfile,
  instanceKind: filters.instanceKind,
  dateFrom: filters.dateFrom,
  dateTo: filters.dateTo,
  query: filters.query,
  limit: filters.limit,
  cursor: filters.cursor,
});

export async function fetchPlaywrightActionRuns(
  filters: PlaywrightActionRunListFilters = {}
): Promise<PlaywrightActionRunListResponse> {
  return api.get<PlaywrightActionRunListResponse>('/api/playwright/action-runs', {
    params: buildParams(filters),
  });
}

export async function fetchPlaywrightActionRun(
  runId: string
): Promise<PlaywrightActionRunDetailResponse> {
  return api.get<PlaywrightActionRunDetailResponse>(
    `/api/playwright/action-runs/${encodeURIComponent(runId)}`
  );
}

export function usePlaywrightActionRuns(
  filters: PlaywrightActionRunListFilters = {}
): ListQuery<PlaywrightActionRunSummary, PlaywrightActionRunListResponse> {
  const queryKey = playwrightKeys.actionRuns(filters);
  return createListQueryV2<PlaywrightActionRunSummary, PlaywrightActionRunListResponse>({
    queryKey,
    queryFn: () => fetchPlaywrightActionRuns(filters),
    meta: {
      source: 'playwright.hooks.usePlaywrightActionRuns',
      operation: 'list',
      resource: 'playwright.actionRuns',
      domain: 'playwright',
      queryKey,
      tags: ['playwright', 'action-runs'],
      description: 'Loads retained Playwright Step Sequencer action run history.',
    },
  });
}

export function usePlaywrightActionRun(
  runId: string | null,
  options?: { enabled?: boolean }
): SingleQuery<PlaywrightActionRunDetailResponse> {
  const resolvedRunId = runId ?? '';
  const queryKey = playwrightKeys.actionRun(resolvedRunId);
  return createSingleQueryV2<PlaywrightActionRunDetailResponse>({
    id: resolvedRunId,
    queryKey,
    queryFn: () => fetchPlaywrightActionRun(resolvedRunId),
    enabled: (options?.enabled ?? true) && resolvedRunId.length > 0,
    meta: {
      source: 'playwright.hooks.usePlaywrightActionRun',
      operation: 'detail',
      resource: 'playwright.actionRuns',
      domain: 'playwright',
      queryKey,
      tags: ['playwright', 'action-runs', 'detail'],
      description: 'Loads one retained Playwright Step Sequencer action run with step detail.',
    },
  });
}
