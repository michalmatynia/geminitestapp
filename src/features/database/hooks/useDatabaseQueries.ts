'use client';

import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/shared/lib/query-keys';

import {
  fetchDatabasePreview,
  fetchDatabaseBackups,
  createDatabaseBackup,
  restoreDatabaseBackup,
  uploadDatabaseBackup,
  deleteDatabaseBackup,
  executeSqlQuery,
  executeCrudOperation,
  fetchAllCollectionsSchema,
  copyCollectionBetweenProviders,
  createJsonBackup,
  restoreJsonBackup,
  fetchJsonBackups,
  type MultiSchemaResponse,
  type CollectionCopyResult,
} from '../api';

import type {
  CrudRequest,
  CrudResult,
  DatabasePreviewPayload,
  DatabasePreviewMode,
  DatabaseType,
  DatabaseInfo,
  DatabaseBackupResponse,
  DatabaseRestoreResponse,
  SqlQueryResult,
} from '../types';

const dbKeys = QUERY_KEYS.system.databases;

export function useDatabaseBackups(dbType: DatabaseType): UseQueryResult<DatabaseInfo[], Error> {
  return useQuery({
    queryKey: dbKeys.backups(dbType),
    queryFn: () => fetchDatabaseBackups(dbType),
  });
}

export function useCreateBackupMutation(): UseMutationResult<
  { ok: boolean; payload: DatabaseBackupResponse },
  Error,
  DatabaseType
  > {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dbType: DatabaseType) => createDatabaseBackup(dbType),
    onSuccess: (_, dbType) => {
      void queryClient.invalidateQueries({ queryKey: dbKeys.backups(dbType) });
    },
  });
}

export function useRestoreBackupMutation(): UseMutationResult<
  { ok: boolean; payload: DatabaseRestoreResponse },
  Error,
  { dbType: DatabaseType; backupName: string; truncateBeforeRestore: boolean }
  > {
  return useMutation({
    mutationFn: ({ dbType, backupName, truncateBeforeRestore }) => 
      restoreDatabaseBackup(dbType, { backupName, truncateBeforeRestore }),
  });
}

export function useUploadBackupMutation(): UseMutationResult<
  { ok: boolean; payload: DatabaseBackupResponse },
  Error,
  { dbType: DatabaseType; file: File; onProgress?: (loaded: number, total?: number) => void }
  > {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dbType, file, onProgress }) => uploadDatabaseBackup(dbType, file, onProgress),
    onSuccess: (_, { dbType }) => {
      void queryClient.invalidateQueries({ queryKey: dbKeys.backups(dbType) });
    },
  });
}

export function useDeleteBackupMutation(): UseMutationResult<
  { ok: boolean; payload: DatabaseBackupResponse },
  Error,
  { dbType: DatabaseType; backupName: string }
  > {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dbType, backupName }) => deleteDatabaseBackup(dbType, backupName),
    onSuccess: (_, { dbType }) => {
      void queryClient.invalidateQueries({ queryKey: dbKeys.backups(dbType) });
    },
  });
}

export function useDatabasePreview(input: {
  backupName?: string | undefined;
  mode?: DatabasePreviewMode;
  type?: DatabaseType;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}): UseQueryResult<DatabasePreviewPayload, Error> {
  const { backupName, mode, type, page, pageSize, enabled = true } = input;

  return useQuery({
    queryKey: dbKeys.preview({ backupName, mode, type, page, pageSize }),
    queryFn: async (): Promise<DatabasePreviewPayload> => {
      const { ok, payload } = await fetchDatabasePreview({
        backupName,
        mode,
        type,
        page,
        pageSize,
      });
      if (!ok) {
        const error = new Error(payload.error || 'Failed to fetch database preview');
        (error as Error & { payload: unknown }).payload = payload;
        throw error;
      }
      return payload;
    },
    enabled: enabled && (!!backupName || mode === 'current'),
  });
}

export function useSqlQueryMutation(): UseMutationResult<
  SqlQueryResult,
  Error,
  {
    sql?: string;
    type: DatabaseType;
    collection?: string;
    operation?: string;
    filter?: Record<string, unknown>;
    document?: Record<string, unknown>;
    update?: Record<string, unknown>;
    pipeline?: Record<string, unknown>[];
  }
  > {
  return useMutation({
    mutationFn: (input) => executeSqlQuery(input),
  });
}

export function useCrudMutation(): UseMutationResult<CrudResult, Error, CrudRequest> {

  return useMutation({

    mutationFn: (input: CrudRequest) => executeCrudOperation(input),

  });

}

// ── Control Panel hooks ──

export function useAllCollectionsSchema(): UseQueryResult<MultiSchemaResponse, Error> {
  return useQuery({
    queryKey: dbKeys.schema({ provider: 'all', includeCounts: true }),
    queryFn: () => fetchAllCollectionsSchema(),
    staleTime: 30_000,
  });
}

export function useCopyCollectionMutation(): UseMutationResult<
  CollectionCopyResult,
  Error,
  { collection: string; direction: 'mongo_to_prisma' | 'prisma_to_mongo' }
  > {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ collection, direction }) =>
      copyCollectionBetweenProviders(collection, direction),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dbKeys.schema({ provider: 'all', includeCounts: true }) });
    },
  });
}

export function useCreateJsonBackupMutation(): UseMutationResult<
  DatabaseBackupResponse,
  Error,
  void
  > {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => createJsonBackup(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dbKeys.jsonBackups });
    },
  });
}

export function useRestoreJsonBackupMutation(): UseMutationResult<
  DatabaseRestoreResponse,
  Error,
  string
  > {
  return useMutation({
    mutationFn: (backupName: string) => restoreJsonBackup(backupName),
  });
}

export function useJsonBackups(): UseQueryResult<{ backups: string[] }, Error> {
  return useQuery({
    queryKey: dbKeys.jsonBackups,
    queryFn: () => fetchJsonBackups(),
  });
}
