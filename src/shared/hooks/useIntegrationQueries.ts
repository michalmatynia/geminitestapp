import type {
  CategoryMappingWithDetails,
  IntegrationWithConnections,
} from '@/shared/contracts/integrations';
import type { ListQuery } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { integrationKeys, marketplaceKeys } from '@/shared/lib/query-key-exports';

export function useIntegrationsWithConnections(): ListQuery<IntegrationWithConnections> {
  const queryKey = integrationKeys.withConnections();
  const queryFn = async (): Promise<IntegrationWithConnections[]> =>
    api.get<IntegrationWithConnections[]>('/api/v2/integrations/with-connections');

  return createListQueryV2({
    queryKey,
    queryFn,
    meta: {
      source: 'shared.hooks.useIntegrationsWithConnections',
      operation: 'list',
      resource: 'integrations.with-connections',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'with-connections'],
      description: 'Loads integrations with connections.',
    },
  });
}

export function useCategoryMappingsByConnection(
  connectionId: string,
  options?: { enabled?: boolean }
): ListQuery<CategoryMappingWithDetails> {
  const isEnabled = options?.enabled ?? !!connectionId;
  const queryKey = marketplaceKeys.mappings(connectionId, 'all');

  return createListQueryV2({
    queryKey,
    queryFn: () =>
      api.get<CategoryMappingWithDetails[]>(
        `/api/marketplace/mappings?connectionId=${connectionId}`
      ),
    enabled: isEnabled && !!connectionId,
    meta: {
      source: 'shared.hooks.useCategoryMappingsByConnection',
      operation: 'list',
      resource: 'marketplace.mappings.connection',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'marketplace', 'mappings'],
      description: 'Loads marketplace mappings for a connection.',
    },
  });
}
