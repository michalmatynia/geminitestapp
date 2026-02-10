'use client';

import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';

import type { AppProviderDiagnosticsDto as ProviderDiagnosticsResponse } from '@/shared/dtos/system';

import {
  syncDatabase,
  backfillSettings,
  fetchProviderDiagnostics,
  type DatabaseSyncDirection,
  type SettingsBackfillResult,
} from '../api';

export function useProviderDiagnostics(): UseQueryResult<ProviderDiagnosticsResponse, Error> {
  return useQuery({
    queryKey: ['settings', 'provider-diagnostics'],
    queryFn: fetchProviderDiagnostics,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useSyncDatabaseMutation(): UseMutationResult<
  { error?: string },
  Error,
  DatabaseSyncDirection
  > {
  return useMutation({
    mutationFn: (direction: DatabaseSyncDirection) => syncDatabase(direction),
  });
}

export function useSettingsBackfillMutation(): UseMutationResult<
  SettingsBackfillResult,
  Error,
  { dryRun: boolean; limit: number }
  > {
  return useMutation({
    mutationFn: ({ dryRun, limit }) => backfillSettings(dryRun, limit),
  });
}