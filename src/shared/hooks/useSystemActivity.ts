'use client';

import type { SystemActivityResponseDto as SystemActivityResponse } from '@/shared/contracts/observability';
import type { SingleQuery } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { activityKeys } from '@/shared/lib/query-key-exports';

export function useSystemActivity(
  params: { page?: number; pageSize?: number; search?: string } = {}
): SingleQuery<SystemActivityResponse> {
  const { page = 1, pageSize = 10, search } = params;
  const queryKey = activityKeys.list({ page, pageSize, search });
  return createSingleQueryV2({
    id: 'system-activity',
    queryKey,
    queryFn: () =>
      api.get<SystemActivityResponse>('/api/system/activity', {
        params: { page, pageSize, search },
      }),
    meta: {
      source: 'observability.hooks.useSystemActivity',
      operation: 'detail',
      resource: 'system.activity',
      domain: 'observability',
      queryKey,
      tags: ['observability', 'activity'],
      description: 'Loads system activity.',
    },
  });
}
