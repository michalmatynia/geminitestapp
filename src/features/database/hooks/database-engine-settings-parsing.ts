import { z } from 'zod';

import {
  databaseEngineBackupScheduleSchema,
  databaseEngineBackupTargetScheduleSchema,
  databaseEngineOperationControlsSchema,
  databaseEnginePolicySchema,
  databaseEngineProviderSchema,
  databaseEngineServiceSchema,
} from '@/shared/contracts/database';
import { validationError } from '@/shared/errors/app-error';
import {
  DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE,
  DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS,
  DEFAULT_DATABASE_ENGINE_POLICY,
  type DatabaseEngineBackupSchedule,
  type DatabaseEngineOperationControls,
  type DatabaseEnginePolicy,
  type DatabaseEngineProvider,
  type DatabaseEngineServiceRoute,
} from '@/shared/lib/db/database-engine-constants';

const DATABASE_ENGINE_TIME_UTC_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const isoDateStringSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value: string): boolean => Number.isFinite(Date.parse(value)), {
    message: 'Expected ISO date string.',
  });

const nullableIsoDateStringSchema = isoDateStringSchema.nullable();

const databaseEnginePolicyStrictSchema = databaseEnginePolicySchema.strict();
const databaseEngineOperationControlsStrictSchema = databaseEngineOperationControlsSchema.strict();
const databaseEngineBackupTargetScheduleStrictSchema = databaseEngineBackupTargetScheduleSchema
  .extend({
    intervalDays: z.number().int().min(1).max(365),
    weekday: z.number().int().min(0).max(6),
    timeUtc: z.string().regex(DATABASE_ENGINE_TIME_UTC_RE),
    lastQueuedAt: nullableIsoDateStringSchema,
    lastRunAt: nullableIsoDateStringSchema,
    lastJobId: z.string().trim().min(1).nullable(),
    lastError: z.string().trim().min(1).nullable(),
    nextDueAt: nullableIsoDateStringSchema,
  })
  .strict();

const databaseEngineBackupScheduleStrictSchema = databaseEngineBackupScheduleSchema
  .extend({
    lastCheckedAt: nullableIsoDateStringSchema,
    mongodb: databaseEngineBackupTargetScheduleStrictSchema,
    // Accept legacy PostgreSQL scheduler payloads, then drop them from the normalized shape.
    postgresql: databaseEngineBackupTargetScheduleStrictSchema.optional(),
  })
  .strict()
  .transform(({ postgresql: _postgresql, ...value }) => value);

const parseNonEmptyJsonObject = (
  raw: string | null | undefined,
  key: string
): Record<string, unknown> | null => {
  if (typeof raw !== 'string') return null;
  const trimmedRaw = raw.trim();
  if (!trimmedRaw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmedRaw);
  } catch (error) {
    throw validationError(`Invalid ${key} settings payload.`, {
      source: 'database_engine.settings',
      key,
      reason: 'invalid_json',
      cause: error instanceof Error ? error.message : 'unknown_error',
    });
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw validationError(`Invalid ${key} settings payload.`, {
      source: 'database_engine.settings',
      key,
      reason: 'invalid_shape',
    });
  }

  return parsed as Record<string, unknown>;
};

const parseWithSchema = <T>(
  key: string,
  raw: string | null | undefined,
  schema: z.ZodType<T>,
  fallback: T
): T => {
  const parsed = parseNonEmptyJsonObject(raw, key);
  if (!parsed) return fallback;

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw validationError(`Invalid ${key} settings payload.`, {
      source: 'database_engine.settings',
      key,
      reason: 'schema_validation_failed',
      issues: result.error.flatten(),
    });
  }

  return result.data;
};

export const parseDatabaseEnginePolicySetting = (
  raw: string | null | undefined
): DatabaseEnginePolicy =>
  parseWithSchema(
    'database engine policy',
    raw,
    databaseEnginePolicyStrictSchema,
    DEFAULT_DATABASE_ENGINE_POLICY
  );

export const parseDatabaseEngineOperationControlsSetting = (
  raw: string | null | undefined
): DatabaseEngineOperationControls =>
  parseWithSchema(
    'database engine operation controls',
    raw,
    databaseEngineOperationControlsStrictSchema,
    DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS
  );

export const parseDatabaseEngineBackupScheduleSetting = (
  raw: string | null | undefined
): DatabaseEngineBackupSchedule =>
  parseWithSchema(
    'database engine backup schedule',
    raw,
    databaseEngineBackupScheduleStrictSchema,
    DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE
  );

export const parseDatabaseEngineServiceRouteMapSetting = (
  raw: string | null | undefined
): Partial<Record<DatabaseEngineServiceRoute, DatabaseEngineProvider>> => {
  const parsed = parseNonEmptyJsonObject(raw, 'database engine service route map');
  if (!parsed) return {};

  const result: Partial<Record<DatabaseEngineServiceRoute, DatabaseEngineProvider>> = {};
  Object.entries(parsed).forEach(([service, provider]: [string, unknown]): void => {
    const serviceValidation = databaseEngineServiceSchema.safeParse(service);
    if (!serviceValidation.success) {
      throw validationError('Invalid database engine service route map payload.', {
        source: 'database_engine.settings',
        key: 'database engine service route map',
        reason: 'invalid_service',
        service,
      });
    }
    const providerValidation = databaseEngineProviderSchema.safeParse(provider);
    if (!providerValidation.success) {
      throw validationError('Invalid database engine service route map payload.', {
        source: 'database_engine.settings',
        key: 'database engine service route map',
        reason: 'invalid_provider',
        service,
        provider,
      });
    }
    result[serviceValidation.data] = providerValidation.data;
  });

  return result;
};

export const parseDatabaseEngineCollectionRouteMapSetting = (
  raw: string | null | undefined
): Record<string, DatabaseEngineProvider> => {
  const parsed = parseNonEmptyJsonObject(raw, 'database engine collection route map');
  if (!parsed) return {};

  const result: Record<string, DatabaseEngineProvider> = {};
  Object.entries(parsed).forEach(([collection, provider]: [string, unknown]): void => {
    const normalizedCollection = collection.trim();
    if (!normalizedCollection) {
      throw validationError('Invalid database engine collection route map payload.', {
        source: 'database_engine.settings',
        key: 'database engine collection route map',
        reason: 'invalid_collection',
      });
    }
    const providerValidation = databaseEngineProviderSchema.safeParse(provider);
    if (!providerValidation.success) {
      throw validationError('Invalid database engine collection route map payload.', {
        source: 'database_engine.settings',
        key: 'database engine collection route map',
        reason: 'invalid_provider',
        collection: normalizedCollection,
        provider,
      });
    }
    result[normalizedCollection] = providerValidation.data;
  });

  return result;
};
