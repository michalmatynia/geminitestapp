'use client';

import type { AppProviderDiagnosticsDto as ProviderDiagnosticsResponse } from '@/shared/contracts/system';
import type { SingleQuery, MutationResult } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createCreateMutationV2, createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { DatabaseSyncDirection, SettingsBackfillResult } from '@/shared/contracts/database';

const dbKeys = QUERY_KEYS.system.databases;

/**
 * Query hook for fetching provider diagnostics
 */
export function useProviderDiagnostics(): SingleQuery<ProviderDiagnosticsResponse> {
  const queryKey = dbKeys.providerDiagnostics();
  return createSingleQueryV2({
    id: 'diagnostics',
    queryKey,
    queryFn: () => api.get<ProviderDiagnosticsResponse>('/api/settings/providers'),
    staleTime: 15_000,
    meta: {
      source: 'database.hooks.useProviderDiagnostics',
      operation: 'detail',
      resource: 'system.databases.provider-diagnostics',
      domain: 'global',
      queryKey,
      tags: ['database', 'provider-diagnostics'],
    },
  });
}

/**
 * Mutation hook for syncing databases
 */
export function useSyncDatabaseMutation(): MutationResult<
  { error?: string },
  DatabaseSyncDirection
> {
  const mutationKey = dbKeys.all;
  return createCreateMutationV2({
    mutationFn: (payload: DatabaseSyncDirection) =>
      api.post<{ error?: string }>('/api/settings/database/sync', payload),
    mutationKey,
    meta: {
      source: 'database.hooks.useSyncDatabaseMutation',
      operation: 'create',
      resource: 'system.databases.sync',
      domain: 'global',
      mutationKey,
      tags: ['database', 'sync'],
    },
  });
}

/**
 * Mutation hook for backfilling missing setting keys
 */
export function useSettingsBackfillMutation(): MutationResult<
  SettingsBackfillResult,
  { dryRun: boolean; limit: number }
> {
  const mutationKey = dbKeys.all;
  return createCreateMutationV2({
    mutationFn: (payload: { dryRun: boolean; limit: number }) =>
      api.post<SettingsBackfillResult>('/api/settings/migrate/backfill-keys', payload),
    mutationKey,
    meta: {
      source: 'database.hooks.useSettingsBackfillMutation',
      operation: 'create',
      resource: 'system.databases.settings-backfill',
      domain: 'global',
      mutationKey,
      tags: ['database', 'settings', 'backfill'],
    },
  });
}
