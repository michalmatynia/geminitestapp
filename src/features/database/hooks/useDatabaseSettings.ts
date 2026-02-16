'use client';

import type { AppProviderDiagnosticsDto as ProviderDiagnosticsResponse } from '@/shared/contracts/system';
import { api } from '@/shared/lib/api-client';
import { createSingleQuery, createCreateMutation } from '@/shared/lib/query-factories';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { SingleQuery, MutationResult } from '@/shared/types/query-result-types';

import type {
  DatabaseSyncDirection,
  SettingsBackfillResult,
} from '../api';

const dbKeys = QUERY_KEYS.system.databases;

/**
 * Query hook for fetching provider diagnostics
 */
export function useProviderDiagnostics(): SingleQuery<ProviderDiagnosticsResponse> {
  return createSingleQuery({
    id: 'diagnostics',
    queryKey: () => dbKeys.providerDiagnostics(),
    queryFn: () => api.get<ProviderDiagnosticsResponse>('/api/settings/providers'),
    staleTime: 15_000,
  });
}

/**
 * Mutation hook for syncing databases
 */
export function useSyncDatabaseMutation(): MutationResult<{ error?: string }, DatabaseSyncDirection> {
  return createCreateMutation({
    mutationFn: (payload: DatabaseSyncDirection) => api.post<{ error?: string }>('/api/settings/database/sync', payload),
  });
}

/**
 * Mutation hook for backfilling missing setting keys
 */
export function useSettingsBackfillMutation(): MutationResult<SettingsBackfillResult, { dryRun: boolean; limit: number }> {
  return createCreateMutation({
    mutationFn: (payload: { dryRun: boolean; limit: number }) => 
      api.post<SettingsBackfillResult>('/api/settings/migrate/backfill-keys', payload),
  });
}
