'use client';

import type { AppProviderDiagnosticsDto as ProviderDiagnosticsResponse } from '@/shared/contracts/system';
import { createQueryHook, createPostMutation } from '@/shared/lib/api-hooks';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import type {
  DatabaseSyncDirection,
  SettingsBackfillResult,
} from '../api';

const dbKeys = QUERY_KEYS.system.databases;

export const useProviderDiagnostics = createQueryHook<ProviderDiagnosticsResponse, void>({
  queryKeyFactory: () => dbKeys.providerDiagnostics(),
  endpoint: '/api/settings/providers',
  staleTime: 15_000,
});

export function useSyncDatabaseMutation() {
  return createPostMutation<{ error?: string }, DatabaseSyncDirection>({
    endpoint: '/api/settings/database/sync',
  });
}

export function useSettingsBackfillMutation() {
  return createPostMutation<SettingsBackfillResult, { dryRun: boolean; limit: number }>({
    endpoint: '/api/settings/migrate/backfill-keys',
  });
}

