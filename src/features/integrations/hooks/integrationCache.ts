/**
 * Compatibility layer for integration cache management.
 * Unified helpers are now defined in src/shared/lib/query-invalidation.ts
 */

export * from '@/shared/lib/query-invalidation';

import { QUERY_KEYS } from '@/shared/lib/query-keys';

export const getIntegrationConnectionsQueryKey = (
  integrationId?: string
): readonly unknown[] => [...QUERY_KEYS.integrations.connections(), integrationId];
