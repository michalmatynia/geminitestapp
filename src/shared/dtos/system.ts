/**
 * DTOs for system-level diagnostics and configuration.
 */

export type AppProviderValueDto = 'prisma' | 'mongodb';

export type AppProviderSourceDto =
  | 'env'
  | 'prisma-setting'
  | 'mongo-setting'
  | 'app-setting'
  | 'default'
  | 'derived';

export type AppProviderServiceDto = 'app' | 'auth' | 'product' | 'integrations' | 'cms';

export interface AppProviderServiceStatusDto {
  service: AppProviderServiceDto;
  configured: AppProviderValueDto | null;
  configuredSource: AppProviderSourceDto | null;
  effective: AppProviderValueDto;
  driftFromApp: boolean;
  notes: string[];
}

export interface AppProviderDiagnosticsDto {
  timestamp: string;
  env: {
    hasDatabaseUrl: boolean;
    hasMongoUri: boolean;
    appDbProviderEnv: string | null;
  };
  services: AppProviderServiceStatusDto[];
  driftCount: number;
  warningCount: number;
  warnings: string[];
}

/**
 * DTO for an activity log entry.
 */
export interface ActivityLogDto {
  id: string;
  type: string;
  description: string;
  userId: string | null;
  entityId: string | null;
  entityType: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * Input for creating a new activity log.
 */
export interface CreateActivityLogDto {
  type: string;
  description: string;
  userId?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  metadata?: Record<string, unknown> | null;
}
