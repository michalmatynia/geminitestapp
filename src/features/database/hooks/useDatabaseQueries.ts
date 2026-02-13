'use client';

import {
  mutationOptions,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  DatabaseBackupFileDto as DatabaseInfoResponse,
  DatabaseBackupOperationResponseDto as DatabaseBackupResponse,
  DatabaseCollectionCopyResultDto as CollectionCopyResult,
  DatabaseEngineBackupRunNowResponseDto as DatabaseEngineBackupRunNowResponse,
  DatabaseEngineBackupSchedulerStatusDto as DatabaseEngineBackupSchedulerStatusResponse,
  DatabaseEngineBackupSchedulerTickResponseDto as DatabaseEngineBackupSchedulerTickResponse,
  DatabaseEngineOperationsJobsDto as DatabaseEngineOperationsJobsResponse,
  DatabaseEngineProviderPreviewDto as DatabaseEngineProviderPreviewResponse,
  DatabaseEngineStatusDto as DatabaseEngineStatusResponse,
  DatabaseRestoreOperationResponseDto as DatabaseRestoreResponse,
  MultiSchemaResponseDto as MultiSchemaResponse,
  RedisOverviewDto as RedisOverviewResponse,
} from '@/shared/dtos/database';
import { ApiError } from '@/shared/lib/api-client';
import { resolvePayloadErrorMessage, unwrapMutationResult } from '@/shared/lib/mutation-error-handler';
import { dbKeys } from '@/shared/lib/query-key-exports';

import {
  cancelDatabaseEngineOperationJob,
  copyCollectionBetweenProviders,
  createDatabaseBackup,
  createJsonBackup,
  deleteDatabaseBackup,
  executeCrudOperation,
  executeSqlQuery,
  fetchAllCollectionsSchema,
  fetchDatabaseBackups,
  fetchDatabaseEngineBackupSchedulerStatus,
  fetchDatabaseEngineOperationsJobs,
  fetchDatabaseEngineProviderPreview,
  fetchDatabaseEngineStatus,
  fetchDatabasePreview,
  fetchJsonBackups,
  fetchRedisOverview,
  restoreDatabaseBackup,
  restoreJsonBackup,
  runDatabaseEngineBackupNow,
  runDatabaseEngineBackupSchedulerTick,
  uploadDatabaseBackup,
  type ApiPayloadResult,
} from '../api';

import type {
  CrudRequest,
  CrudResult,
  DatabasePreviewMode,
  DatabasePreviewPayload,
  DatabaseType,
  SqlQueryResult,
} from '../types';


type DatabasePreviewQueryInput = {
  backupName?: string | undefined;
  mode?: DatabasePreviewMode | undefined;
  type?: DatabaseType | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
};

const invalidateBackups = (queryClient: QueryClient, dbType: DatabaseType): void => {
  void queryClient.invalidateQueries({ queryKey: dbKeys.backups(dbType) });
};

const invalidateSchemaAll = (queryClient: QueryClient): void => {
  void queryClient.invalidateQueries({
    queryKey: dbKeys.schema({ provider: 'all', includeCounts: true }),
  });
};

const invalidateEngineSchedulerStatus = (queryClient: QueryClient): void => {
  void queryClient.invalidateQueries({ queryKey: dbKeys.engineBackupSchedulerStatus });
};

export const databaseQueryOptions = {
  backups: (dbType: DatabaseType) =>
    queryOptions({
      queryKey: dbKeys.backups(dbType),
      queryFn: () => fetchDatabaseBackups(dbType),
    }),

  preview: (input: DatabasePreviewQueryInput) =>
    queryOptions({
      queryKey: dbKeys.preview({
        backupName: input.backupName,
        mode: input.mode,
        type: input.type,
        page: input.page,
        pageSize: input.pageSize,
      }),
      queryFn: async (): Promise<DatabasePreviewPayload> => {
        const result = await fetchDatabasePreview({
          backupName: input.backupName,
          mode: input.mode,
          type: input.type,
          page: input.page,
          pageSize: input.pageSize,
        });
        if (!result.ok) {
          const message = resolvePayloadErrorMessage(result.payload, 'Failed to fetch database preview.');
          throw new ApiError(message, 400);
        }
        return result.payload;
      },
    }),

  allCollectionsSchema: () =>
    queryOptions({
      queryKey: dbKeys.schema({ provider: 'all', includeCounts: true }),
      queryFn: fetchAllCollectionsSchema,
      staleTime: 30_000,
    }),

  redisOverview: (limit = 200) =>
    queryOptions({
      queryKey: dbKeys.redisOverview({ limit }),
      queryFn: () => fetchRedisOverview(limit),
      staleTime: 15_000,
    }),

  engineStatus: () =>
    queryOptions({
      queryKey: dbKeys.engineStatus,
      queryFn: fetchDatabaseEngineStatus,
      staleTime: 10_000,
      refetchInterval: 20_000,
    }),

  backupSchedulerStatus: () =>
    queryOptions({
      queryKey: dbKeys.engineBackupSchedulerStatus,
      queryFn: fetchDatabaseEngineBackupSchedulerStatus,
      staleTime: 10_000,
      refetchInterval: 20_000,
    }),

  engineOperationsJobs: (limit = 30) =>
    queryOptions({
      queryKey: dbKeys.engineOperationsJobs({ limit }),
      queryFn: () => fetchDatabaseEngineOperationsJobs(limit),
      staleTime: 10_000,
      refetchInterval: 20_000,
    }),

  engineProviderPreview: (collections?: string[]) =>
    queryOptions({
      queryKey: dbKeys.engineProviderPreview({
        collections: collections ?? [],
      }),
      queryFn: () => fetchDatabaseEngineProviderPreview(collections),
      staleTime: 10_000,
      refetchInterval: 20_000,
    }),

  jsonBackups: () =>
    queryOptions({
      queryKey: dbKeys.jsonBackups,
      queryFn: fetchJsonBackups,
    }),
};

export const databaseMutationOptions = {
  createBackup: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: (dbType: DatabaseType) => createDatabaseBackup(dbType),
      onSuccess: (_result, dbType) => {
        invalidateBackups(queryClient, dbType);
      },
    }),

  restoreBackup: () =>
    mutationOptions({
      mutationFn: (variables: {
        dbType: DatabaseType;
        backupName: string;
        truncateBeforeRestore: boolean;
      }) =>
        restoreDatabaseBackup(variables.dbType, {
          backupName: variables.backupName,
          truncateBeforeRestore: variables.truncateBeforeRestore,
        }),
    }),

  uploadBackup: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: (variables: {
        dbType: DatabaseType;
        file: File;
        onProgress?: (loaded: number, total?: number) => void;
      }) => uploadDatabaseBackup(variables.dbType, variables.file, variables.onProgress),
      onSuccess: (_result, variables) => {
        invalidateBackups(queryClient, variables.dbType);
      },
    }),

  deleteBackup: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: (variables: { dbType: DatabaseType; backupName: string }) =>
        deleteDatabaseBackup(variables.dbType, variables.backupName),
      onSuccess: (_result, variables) => {
        invalidateBackups(queryClient, variables.dbType);
      },
    }),

  sqlQuery: () =>
    mutationOptions({
      mutationFn: (input: {
        sql?: string;
        type: DatabaseType;
        collection?: string;
        operation?: string;
        filter?: Record<string, unknown>;
        document?: Record<string, unknown>;
        update?: Record<string, unknown>;
        pipeline?: Record<string, unknown>[];
      }) => executeSqlQuery(input),
    }),

  crud: () =>
    mutationOptions({
      mutationFn: (input: CrudRequest) => executeCrudOperation(input),
    }),

  backupSchedulerTick: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: runDatabaseEngineBackupSchedulerTick,
      onSuccess: () => {
        invalidateEngineSchedulerStatus(queryClient);
      },
    }),

  backupRunNow: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: (variables: { dbType: 'mongodb' | 'postgresql' | 'all' }) =>
        runDatabaseEngineBackupNow(variables.dbType),
      onSuccess: (payload) => {
        invalidateEngineSchedulerStatus(queryClient);
        payload.queued.forEach((item) => {
          invalidateBackups(queryClient, item.dbType);
        });
      },
    }),

  cancelEngineOperationJob: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: (variables: { jobId: string }) =>
        cancelDatabaseEngineOperationJob(variables.jobId),
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: dbKeys.engineOperationsJobs({ limit: 30 }),
        });
      },
    }),

  copyCollection: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: async (variables: {
        collection: string;
        direction: 'mongo_to_prisma' | 'prisma_to_mongo';
      }): Promise<CollectionCopyResult> => {
        const result = await copyCollectionBetweenProviders(
          variables.collection,
          variables.direction
        );
        return unwrapMutationResult(result, 'Failed to copy collection between providers.');
      },
      onSuccess: () => {
        invalidateSchemaAll(queryClient);
      },
    }),

  createJsonBackup: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: async (): Promise<DatabaseBackupResponse> => {
        const result = await createJsonBackup();
        return unwrapMutationResult(result, 'Failed to create JSON backup.');
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: dbKeys.jsonBackups });
      },
    }),

  restoreJsonBackup: () =>
    mutationOptions({
      mutationFn: async (backupName: string): Promise<DatabaseRestoreResponse> => {
        const result = await restoreJsonBackup(backupName);
        return unwrapMutationResult(result, 'Failed to restore JSON backup.');
      },
    }),
};

export function useDatabaseBackups(
  dbType: DatabaseType
): UseQueryResult<DatabaseInfoResponse[], Error> {
  return useQuery(databaseQueryOptions.backups(dbType));
}

export function useCreateBackupMutation(): UseMutationResult<
  ApiPayloadResult<DatabaseBackupResponse>,
  Error,
  DatabaseType
  > {
  const queryClient = useQueryClient();
  return useMutation(databaseMutationOptions.createBackup(queryClient));
}

export function useRestoreBackupMutation(): UseMutationResult<
  ApiPayloadResult<DatabaseRestoreResponse>,
  Error,
  { dbType: DatabaseType; backupName: string; truncateBeforeRestore: boolean }
  > {
  return useMutation(databaseMutationOptions.restoreBackup());
}

export function useUploadBackupMutation(): UseMutationResult<
  ApiPayloadResult<DatabaseBackupResponse>,
  Error,
  { dbType: DatabaseType; file: File; onProgress?: (loaded: number, total?: number) => void }
  > {
  const queryClient = useQueryClient();
  return useMutation(databaseMutationOptions.uploadBackup(queryClient));
}

export function useDeleteBackupMutation(): UseMutationResult<
  ApiPayloadResult<DatabaseBackupResponse>,
  Error,
  { dbType: DatabaseType; backupName: string }
  > {
  const queryClient = useQueryClient();
  return useMutation(databaseMutationOptions.deleteBackup(queryClient));
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
  const options = databaseQueryOptions.preview({
    backupName,
    mode,
    type,
    page,
    pageSize,
  });
  return useQuery({
    ...options,
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
  return useMutation(databaseMutationOptions.sqlQuery());
}

export function useCrudMutation(): UseMutationResult<CrudResult, Error, CrudRequest> {
  return useMutation(databaseMutationOptions.crud());
}

// ── Control Panel hooks ──

export function useAllCollectionsSchema(): UseQueryResult<MultiSchemaResponse, Error> {
  return useQuery(databaseQueryOptions.allCollectionsSchema());
}

export function useRedisOverview(limit = 200): UseQueryResult<RedisOverviewResponse, Error> {
  return useQuery(databaseQueryOptions.redisOverview(limit));
}

export function useDatabaseEngineStatus(): UseQueryResult<DatabaseEngineStatusResponse, Error> {
  return useQuery(databaseQueryOptions.engineStatus());
}

export function useDatabaseBackupSchedulerStatus(): UseQueryResult<
  DatabaseEngineBackupSchedulerStatusResponse,
  Error
  > {
  return useQuery(databaseQueryOptions.backupSchedulerStatus());
}

export function useDatabaseEngineOperationsJobs(
  limit = 30
): UseQueryResult<DatabaseEngineOperationsJobsResponse, Error> {
  return useQuery(databaseQueryOptions.engineOperationsJobs(limit));
}

export function useDatabaseBackupSchedulerTickMutation(): UseMutationResult<
  DatabaseEngineBackupSchedulerTickResponse,
  Error,
  void
  > {
  const queryClient = useQueryClient();
  return useMutation(databaseMutationOptions.backupSchedulerTick(queryClient));
}

export function useDatabaseBackupRunNowMutation(): UseMutationResult<
  DatabaseEngineBackupRunNowResponse,
  Error,
  { dbType: 'mongodb' | 'postgresql' | 'all' }
  > {
  const queryClient = useQueryClient();
  return useMutation(databaseMutationOptions.backupRunNow(queryClient));
}

export function useCancelDatabaseEngineOperationJobMutation(): UseMutationResult<
  { success: boolean; job: unknown },
  Error,
  { jobId: string }
  > {
  const queryClient = useQueryClient();
  return useMutation(databaseMutationOptions.cancelEngineOperationJob(queryClient));
}

export function useDatabaseEngineProviderPreview(
  collections?: string[]
): UseQueryResult<DatabaseEngineProviderPreviewResponse, Error> {
  return useQuery(databaseQueryOptions.engineProviderPreview(collections));
}

export function useCopyCollectionMutation(): UseMutationResult<
  CollectionCopyResult,
  Error,
  { collection: string; direction: 'mongo_to_prisma' | 'prisma_to_mongo' }
  > {
  const queryClient = useQueryClient();
  return useMutation(databaseMutationOptions.copyCollection(queryClient));
}

export function useCreateJsonBackupMutation(): UseMutationResult<
  DatabaseBackupResponse,
  Error,
  void
  > {
  const queryClient = useQueryClient();
  return useMutation(databaseMutationOptions.createJsonBackup(queryClient));
}

export function useRestoreJsonBackupMutation(): UseMutationResult<
  DatabaseRestoreResponse,
  Error,
  string
  > {
  return useMutation(databaseMutationOptions.restoreJsonBackup());
}

export function useJsonBackups(): UseQueryResult<{ backups: string[] }, Error> {
  return useQuery(databaseQueryOptions.jsonBackups());
}
