'use client';

import { QUERY_KEYS } from '@/shared/lib/query-keys';

import type { QueryClient } from '@tanstack/react-query';

export const getIntegrationConnectionsQueryKey = (
  integrationId?: string
): readonly unknown[] => [...QUERY_KEYS.integrations.connections(), integrationId];

export const invalidateIntegrationConnections = (
  queryClient: QueryClient,
  integrationId: string
): void => {
  void queryClient.invalidateQueries({
    queryKey: getIntegrationConnectionsQueryKey(integrationId),
  });
};
