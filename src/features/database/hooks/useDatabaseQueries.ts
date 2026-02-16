'use client';

import { useQueryClient, type QueryClient } from '@tanstack/react-query';

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
} from '@/shared/contracts/database';
import { ApiError } from '@/shared/lib/api-client';
import { resolvePayloadErrorMessage, unwrapMutationResult } from '@/shared/lib/mutation-error-handler';
import {
  createListQuery,
  createSingleQuery,
  createCreateMutation,
  createUpdateMutation,
} from '@/shared/lib/query-factories-v2';
import { dbKeys } from '@/shared/lib/query-key-exports';
import type { 
  ListQuery, 
  SingleQuery, 
  MutationResult, 
  UpdateMutation
} from '@/shared/types/query-result-types';

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

const invalidateBackups = (queryClient: QueryClient, dbType: DatabaseType): void => {
  void queryClient.invalidateQueries({ queryKey: dbKeys.backups(dbType) });
};

const invalidateSchemaAll = (queryClient: QueryClient): void => {
  void queryClient.invalidateQueries({
    queryKey: dbKeys.schema({ provider: 'all', includeCounts: true }),
  });
};

const invalidateEngineSchedulerStatus = (queryClient: QueryClient): void => {
  void queryClient.invalidateQueries({ queryKey: dbKeys.engineBackupSchedulerStatus() });
};

export function useDatabaseBackups(
  dbType: DatabaseType
): ListQuery<DatabaseInfoResponse> {
  return createListQuery({
    queryKey: dbKeys.backups(dbType),
    queryFn: () => fetchDatabaseBackups(dbType),
  });
}

export function useCreateBackupMutation(): MutationResult<
  ApiPayloadResult<DatabaseBackupResponse>,
  DatabaseType
  > {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: (dbType: DatabaseType) => createDatabaseBackup(dbType),
    options: {
      onSuccess: (_result, dbType) => {
        invalidateBackups(queryClient, dbType);
      },
    },
  });
}

export function useRestoreBackupMutation(): MutationResult<
  ApiPayloadResult<DatabaseRestoreResponse>,
  { dbType: DatabaseType; backupName: string; truncateBeforeRestore: boolean }
  > {
  return createCreateMutation({
    mutationFn: (variables: {
      dbType: DatabaseType;
      backupName: string;
      truncateBeforeRestore: boolean;
    }) =>
      restoreDatabaseBackup(variables.dbType, {
        backupName: variables.backupName,
        truncateBeforeRestore: variables.truncateBeforeRestore,
      }),
  });
}

export function useUploadBackupMutation(): MutationResult<
  ApiPayloadResult<DatabaseBackupResponse>,
  { dbType: DatabaseType; file: File; onProgress?: (loaded: number, total?: number) => void }
  > {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: (variables: {
      dbType: DatabaseType;
      file: File;
      onProgress?: (loaded: number, total?: number) => void;
    }) => uploadDatabaseBackup(variables.dbType, variables.file, variables.onProgress),
    options: {
      onSuccess: (_result, variables) => {
        invalidateBackups(queryClient, variables.dbType);
      },
    },
  });
}

export function useDeleteBackupMutation(): MutationResult<
  ApiPayloadResult<DatabaseBackupResponse>,
  { dbType: DatabaseType; backupName: string }
  > {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: (variables: { dbType: DatabaseType; backupName: string }) =>
      deleteDatabaseBackup(variables.dbType, variables.backupName),
    options: {
      onSuccess: (_result, variables) => {
        invalidateBackups(queryClient, variables.dbType);
      },
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
}): SingleQuery<DatabasePreviewPayload> {
  const { backupName, mode, type, page, pageSize, enabled = true } = input;
  
  return createSingleQuery({
    queryKey: dbKeys.preview({
      backupName,
      mode,
      type,
      page,
      pageSize,
    }),
    queryFn: async (): Promise<DatabasePreviewPayload> => {
      const result = await fetchDatabasePreview({
        backupName,
        mode,
        type,
        page,
        pageSize,
      });
      if (!result.ok) {
        const message = resolvePayloadErrorMessage(result.payload, 'Failed to fetch database preview.');
        throw new ApiError(message, 400);
      }
      return result.payload;
    },
    options: {
      enabled: enabled && (!!backupName || mode === 'current'),
    }
  });
}

export function useSqlQueryMutation(): MutationResult<
  SqlQueryResult,
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
  return createCreateMutation({
    mutationFn: (input) => executeSqlQuery(input),
  });
}

export function useCrudMutation(): MutationResult<CrudResult, CrudRequest> {
  return createCreateMutation({
    mutationFn: (input: CrudRequest) => executeCrudOperation(input),
  });
}

// ── Control Panel hooks ──

export function useAllCollectionsSchema(): SingleQuery<MultiSchemaResponse> {
  return createSingleQuery({
    queryKey: dbKeys.schema({ provider: 'all', includeCounts: true }),
    queryFn: fetchAllCollectionsSchema,
    options: { staleTime: 30_000 },
  });
}

export function useRedisOverview(limit = 200): SingleQuery<RedisOverviewResponse> {
  return createSingleQuery({
    queryKey: dbKeys.redisOverview({ limit }),
    queryFn: () => fetchRedisOverview(limit),
    options: { staleTime: 15_000 },
  });
}

export function useDatabaseEngineStatus(): SingleQuery<DatabaseEngineStatusResponse> {
  return createSingleQuery({
    queryKey: dbKeys.engineStatus(),
    queryFn: fetchDatabaseEngineStatus,
    options: {
      staleTime: 10_000,
      refetchInterval: 20_000,
    },
  });
}

export function useDatabaseBackupSchedulerStatus(): SingleQuery<
  DatabaseEngineBackupSchedulerStatusResponse
  > {
  return createSingleQuery({
    queryKey: dbKeys.engineBackupSchedulerStatus(),
    queryFn: fetchDatabaseEngineBackupSchedulerStatus,
    options: {
      staleTime: 10_000,
      refetchInterval: 20_000,
    },
  });
}

export function useDatabaseEngineOperationsJobs(
  limit = 30
): SingleQuery<DatabaseEngineOperationsJobsResponse> {
  return createSingleQuery({
    queryKey: dbKeys.engineOperationsJobs({ limit }),
    queryFn: () => fetchDatabaseEngineOperationsJobs(limit),
    options: {
      staleTime: 10_000,
      refetchInterval: 20_000,
    },
  });
}

export function useDatabaseBackupSchedulerTickMutation(): UpdateMutation<
  DatabaseEngineBackupSchedulerTickResponse,
  void
  > {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: runDatabaseEngineBackupSchedulerTick,
    options: {
      onSuccess: () => {
        invalidateEngineSchedulerStatus(queryClient);
      },
    },
  });
}

export function useDatabaseBackupRunNowMutation(): UpdateMutation<
  DatabaseEngineBackupRunNowResponse,
  { dbType: 'mongodb' | 'postgresql' | 'all' }
  > {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: (variables) =>
      runDatabaseEngineBackupNow(variables.dbType),
    options: {
      onSuccess: (payload) => {
        invalidateEngineSchedulerStatus(queryClient);
        payload.queued.forEach((item) => {
          invalidateBackups(queryClient, item.dbType);
        });
      },
    },
  });
}

export function useCancelDatabaseEngineOperationJobMutation(): MutationResult<
  { success: boolean; job: unknown },
  { jobId: string }
  > {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: (variables: { jobId: string }) =>
      cancelDatabaseEngineOperationJob(variables.jobId),
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: dbKeys.engineOperationsJobs({ limit: 30 }),
        });
      },
    },
  });
}

export function useDatabaseEngineProviderPreview(
  collections?: string[]
): SingleQuery<DatabaseEngineProviderPreviewResponse> {
  return createSingleQuery({
    queryKey: dbKeys.engineProviderPreview({
      collections: collections ?? [],
    }),
    queryFn: () => fetchDatabaseEngineProviderPreview(collections),
    options: {
      staleTime: 10_000,
      refetchInterval: 20_000,
    },
  });
}

export function useCopyCollectionMutation(): MutationResult<
  CollectionCopyResult,
  { collection: string; direction: 'mongo_to_prisma' | 'prisma_to_mongo' }
  > {
  const queryClient = useQueryClient();
  return createCreateMutation({
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
    options: {
      onSuccess: () => {
        invalidateSchemaAll(queryClient);
      },
    },
  });
}

export function useCreateJsonBackupMutation(): UpdateMutation<
  DatabaseBackupResponse,
  void
  > {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: async (): Promise<DatabaseBackupResponse> => {
      const result = await createJsonBackup();
      return unwrapMutationResult(result, 'Failed to create JSON backup.');
    },
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: dbKeys.jsonBackups() });
      },
    },
  });
}

export function useRestoreJsonBackupMutation(): UpdateMutation<
  DatabaseRestoreResponse,
  string
  > {
  return createUpdateMutation({
    mutationFn: async (backupName: string): Promise<DatabaseRestoreResponse> => {
      const result = await restoreJsonBackup(backupName);
      return unwrapMutationResult(result, 'Failed to restore JSON backup.');
    },
  });
}

export function useJsonBackups(): SingleQuery<{ backups: string[] }> {
  return createSingleQuery({
    queryKey: dbKeys.jsonBackups(),
    queryFn: fetchJsonBackups,
  });
}
