 
'use client';

import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';

import {
  fetchDatabasePreview,
  fetchDatabaseBackups,
  createDatabaseBackup,
  restoreDatabaseBackup,
  uploadDatabaseBackup,
  deleteDatabaseBackup,
  executeSqlQuery,
  executeCrudOperation,
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

export function useDatabaseBackups(dbType: DatabaseType): UseQueryResult<DatabaseInfo[], Error> {
  return useQuery({
    queryKey: ['database-backups', dbType],
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
      void queryClient.invalidateQueries({ queryKey: ['database-backups', dbType] });
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
      void queryClient.invalidateQueries({ queryKey: ['database-backups', dbType] });
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
      void queryClient.invalidateQueries({ queryKey: ['database-backups', dbType] });
    },
  });
}

export function useDatabasePreview(input: {
  backupName?: string;
  mode?: DatabasePreviewMode;
  type?: DatabaseType;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}): UseQueryResult<DatabasePreviewPayload, Error> {
  const { backupName, mode, type, page, pageSize, enabled = true } = input;

  return useQuery({
    queryKey: ['database-preview', { backupName, mode, type, page, pageSize }],
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
