// Database Schema Introspection DTOs
export interface FieldInfoDto {
  name: string;
  type: string;
  isRequired?: boolean | null;
  isId?: boolean | null;
  isUnique?: boolean | null;
  hasDefault?: boolean | null;
  relationTo?: string | null;
}

export interface CollectionSchemaDto {
  name: string;
  fields: FieldInfoDto[];
  relations?: string[];
  documentCount?: number | undefined;
}

export interface UnifiedCollectionDto {
  name: string;
  mongoFieldCount: number | null;
  prismaFieldCount: number | null;
  mongoDocumentCount: number | null;
  prismaRowCount: number | null;
  existsInMongo: boolean;
  existsInPrisma: boolean;
  assignedProvider: SchemaProviderDto | 'auto';
}

export type SchemaProviderDto = 'mongodb' | 'prisma';

export interface SchemaResponseDto {
  provider: SchemaProviderDto;
  collections: CollectionSchemaDto[];
}

export interface MultiSchemaResponseDto {
  provider: 'multi';
  collections: Array<CollectionSchemaDto & { provider: SchemaProviderDto }>;
  sources: Partial<Record<SchemaProviderDto, SchemaResponseDto>>;
}

export type SchemaResponsePayloadDto = SchemaResponseDto | MultiSchemaResponseDto;

export interface DatabaseBrowseParamsDto {
  collection: string;
  limit?: number;
  skip?: number;
  query?: string;
  provider?: SchemaProviderDto;
}

export interface DatabaseBrowseDto {
  provider: SchemaProviderDto;
  collection: string;
  documents: Record<string, unknown>[];
  total: number;
  limit: number;
  skip: number;
}

export interface BrowseResponseDto {
  total: number;
  items: Record<string, unknown>[];
  fields: string[];
}

// Database backup/restore DTOs used by API routes and client features.
export interface DatabaseBackupFileDto {
  name: string;
  size: string;
  created: string;
  createdAt: string;
  lastModified: string;
  lastModifiedAt: string;
  lastRestored?: string | undefined;
}

export interface DatabaseBackupOperationResponseDto {
  success?: boolean;
  jobId?: string;
  message?: string;
  backupName?: string;
  log?: string;
  warning?: string;
  error?: string;
  errorId?: string;
  stage?: string;
}

export interface DatabaseRestoreOperationResponseDto {
  message?: string;
  log?: string;
  error?: string;
  errorId?: string;
  stage?: string;
  backupName?: string;
}

export interface RedisNamespaceStatsDto {
  namespace: string;
  keyCount: number;
  sampleKeys: string[];
}

export interface RedisOverviewDto {
  enabled: boolean;
  connected: boolean;
  urlConfigured: boolean;
  dbSize: number;
  usedMemory: string | null;
  maxMemory: string | null;
  namespaces: RedisNamespaceStatsDto[];
  sampleKeys: string[];
}

export type DatabaseEngineServiceDto = 'app' | 'auth' | 'product' | 'integrations' | 'cms';
export type DatabaseEngineProviderDto = 'mongodb' | 'prisma' | 'redis';
export type DatabaseEnginePrimaryProviderDto = 'mongodb' | 'prisma';

export interface DatabaseEnginePolicyDto {
  requireExplicitServiceRouting: boolean;
  requireExplicitCollectionRouting: boolean;
  allowAutomaticFallback: boolean;
  allowAutomaticBackfill: boolean;
  allowAutomaticMigrations: boolean;
  strictProviderAvailability: boolean;
}

export interface DatabaseEngineServiceStatusDto {
  service: DatabaseEngineServiceDto;
  configuredProvider: DatabaseEngineProviderDto | null;
  effectiveProvider: DatabaseEnginePrimaryProviderDto | null;
  missingExplicitRoute: boolean;
  unsupportedConfiguredProvider: boolean;
  unavailableConfiguredProvider: boolean;
  resolutionError: string | null;
}

export interface DatabaseEngineUnavailableCollectionRouteDto {
  collection: string;
  provider: DatabaseEngineProviderDto;
}

export interface DatabaseEngineCollectionStatusDto {
  knownCollections: string[];
  configuredCount: number;
  missingExplicitRoutes: string[];
  orphanedRoutes: string[];
  unavailableConfiguredRoutes: DatabaseEngineUnavailableCollectionRouteDto[];
}

export interface DatabaseEngineStatusDto {
  timestamp: string;
  policy: DatabaseEnginePolicyDto;
  providers: {
    prismaConfigured: boolean;
    mongodbConfigured: boolean;
    redisConfigured: boolean;
  };
  serviceRouteMap: Partial<Record<DatabaseEngineServiceDto, DatabaseEngineProviderDto>>;
  collectionRouteMap: Record<string, DatabaseEngineProviderDto>;
  services: DatabaseEngineServiceStatusDto[];
  collections: DatabaseEngineCollectionStatusDto;
  blockingIssues: string[];
}

export type DatabaseEngineCollectionProviderPreviewSourceDto =
  | 'collection_route'
  | 'app_provider'
  | 'error';

export interface DatabaseEngineCollectionProviderPreviewItemDto {
  collection: string;
  configuredProvider: DatabaseEngineProviderDto | null;
  effectiveProvider: DatabaseEnginePrimaryProviderDto | null;
  source: DatabaseEngineCollectionProviderPreviewSourceDto;
  error: string | null;
}

export interface DatabaseEngineProviderPreviewDto {
  timestamp: string;
  policy: DatabaseEnginePolicyDto;
  appProvider: DatabaseEnginePrimaryProviderDto | null;
  appProviderError: string | null;
  collections: DatabaseEngineCollectionProviderPreviewItemDto[];
}

export type DatabaseEngineBackupCadenceDto = 'daily' | 'every_n_days' | 'weekly';
export type DatabaseEngineBackupStatusDto =
  | 'idle'
  | 'queued'
  | 'running'
  | 'success'
  | 'failed';

export interface DatabaseEngineBackupTargetStatusDto {
  enabled: boolean;
  cadence: DatabaseEngineBackupCadenceDto;
  intervalDays: number;
  weekday: number;
  timeUtc: string;
  lastQueuedAt: string | null;
  lastRunAt: string | null;
  lastStatus: DatabaseEngineBackupStatusDto;
  lastJobId: string | null;
  lastError: string | null;
  nextDueAt: string | null;
  dueNow: boolean;
}

export interface DatabaseEngineBackupSchedulerQueueStatusDto {
  running: boolean;
  healthy: boolean;
  processing: boolean;
  activeJobs: number;
  waitingJobs: number;
  failedJobs: number;
  completedJobs: number;
  lastPollTime: number;
  timeSinceLastPoll: number;
}

export interface DatabaseEngineBackupSchedulerStatusDto {
  timestamp: string;
  schedulerEnabled: boolean;
  lastCheckedAt: string | null;
  repeatEveryMs: number;
  queue: DatabaseEngineBackupSchedulerQueueStatusDto;
  targets: {
    mongodb: DatabaseEngineBackupTargetStatusDto;
    postgresql: DatabaseEngineBackupTargetStatusDto;
  };
}

export type DatabaseEngineOperationJobStatusDto =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type DatabaseEngineOperationJobTypeDto = 'db_backup' | 'db_sync';

export interface DatabaseEngineOperationJobDto {
  id: string;
  type: DatabaseEngineOperationJobTypeDto;
  status: DatabaseEngineOperationJobStatusDto;
  dbType: 'mongodb' | 'postgresql' | null;
  direction: 'mongo_to_prisma' | 'prisma_to_mongo' | null;
  source: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  resultSummary: string | null;
}

export interface DatabaseEngineOperationsJobsDto {
  timestamp: string;
  queueStatus: {
    running: boolean;
    healthy: boolean;
    processing: boolean;
    lastPollTime: number;
    timeSinceLastPoll: number;
  };
  jobs: DatabaseEngineOperationJobDto[];
}

export interface DatabaseCollectionCopyResultDto {
  name: string;
  status: 'completed' | 'skipped' | 'failed';
  sourceCount: number;
  targetDeleted: number;
  targetInserted: number;
  warnings?: string[];
  error?: string;
}

export interface DatabaseEngineBackupSchedulerTickResultDto {
  checkedAt: string;
  schedulerEnabled: boolean;
  triggered: Array<{ dbType: 'mongodb' | 'postgresql'; jobId: string }>;
  skipped: Array<{ dbType: 'mongodb' | 'postgresql'; reason: string }>;
}

export interface DatabaseEngineBackupSchedulerTickResponseDto {
  success: boolean;
  tick: DatabaseEngineBackupSchedulerTickResultDto;
  status: DatabaseEngineBackupSchedulerStatusDto;
}

export interface DatabaseEngineBackupRunNowResponseDto {
  success: boolean;
  queued: Array<{ dbType: 'mongodb' | 'postgresql'; jobId: string }>;
}
