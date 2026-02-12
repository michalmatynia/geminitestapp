/**
 * Compatibility layer for Database DTOs.
 * Types are now defined in src/shared/contracts/database.ts using Zod.
 */

import { 
  DatabaseEngineOperationJobDto,
  DatabaseEngineBackupTargetStatusDto,
  DatabaseEngineBackupSchedulerStatusDto,
  DatabaseEngineBackupSchedulerTickResultDto
} from '../contracts/database';
import { CreateDto, UpdateDto } from '../types/base';

export * from '../contracts/database';

export type CreateDatabaseEngineOperationJobDto = CreateDto<DatabaseEngineOperationJobDto>;
export type UpdateDatabaseEngineOperationJobDto = UpdateDto<DatabaseEngineOperationJobDto>;

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

export interface DatabaseCollectionCopyResultDto {
  name: string;
  status: 'completed' | 'skipped' | 'failed';
  sourceCount: number;
  targetDeleted: number;
  targetInserted: number;
  warnings?: string[];
  error?: string;
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
