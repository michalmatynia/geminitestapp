'use client';

import { mutationOptions, queryOptions, useMutation, useQuery, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';

import type { AppProviderDiagnosticsDto as ProviderDiagnosticsResponse } from '@/shared/contracts/system';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import {
  syncDatabase,
  backfillSettings,
  fetchProviderDiagnostics,
  type DatabaseSyncDirection,
  type SettingsBackfillResult,
} from '../api';

const dbKeys = QUERY_KEYS.system.databases;

export const databaseSettingsQueryOptions = {
  providerDiagnostics: () =>
    queryOptions({
      queryKey: dbKeys.providerDiagnostics(),
      queryFn: fetchProviderDiagnostics,
      staleTime: 15_000,
      refetchInterval: 30_000,
    }),
};

export const databaseSettingsMutationOptions = {
  syncDatabase: () =>
    mutationOptions({
      mutationFn: (direction: DatabaseSyncDirection) => syncDatabase(direction),
    }),
  settingsBackfill: () =>
    mutationOptions({
      mutationFn: ({ dryRun, limit }: { dryRun: boolean; limit: number }) =>
        backfillSettings(dryRun, limit),
    }),
};

export function useProviderDiagnostics(): UseQueryResult<ProviderDiagnosticsResponse, Error> {
  return useQuery(databaseSettingsQueryOptions.providerDiagnostics());
}

export function useSyncDatabaseMutation(): UseMutationResult<
  { error?: string },
  Error,
  DatabaseSyncDirection
  > {
  return useMutation(databaseSettingsMutationOptions.syncDatabase());
}

export function useSettingsBackfillMutation(): UseMutationResult<
  SettingsBackfillResult,
  Error,
  { dryRun: boolean; limit: number }
  > {
  return useMutation(databaseSettingsMutationOptions.settingsBackfill());
}
