import {
  DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE,
  type DatabaseEngineBackupCadence,
  type DatabaseEngineBackupSchedule,
  type DatabaseEngineBackupStatus,
  type DatabaseEngineBackupTargetSchedule,
} from './database-engine-constants';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const VALID_TIME_UTC = /^([01]\d|2[0-3]):([0-5]\d)$/;

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const parseRawObject = (raw: unknown): Record<string, unknown> | null => {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return asRecord(parsed);
    } catch (error) {
      logClientError(error);
      return null;
    }
  }
  return asRecord(raw);
};

const isBackupCadence = (value: unknown): value is DatabaseEngineBackupCadence =>
  value === 'daily' || value === 'every_n_days' || value === 'weekly';

const isBackupStatus = (value: unknown): value is DatabaseEngineBackupStatus =>
  value === 'idle' ||
  value === 'queued' ||
  value === 'running' ||
  value === 'success' ||
  value === 'failed';

const normalizePositiveInt = (
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
};

const normalizeIsoOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
};

export const isValidDatabaseEngineBackupTimeUtc = (value: string): boolean =>
  VALID_TIME_UTC.test(value);

const normalizeTimeUtc = (value: unknown, fallback: string): string =>
  typeof value === 'string' && isValidDatabaseEngineBackupTimeUtc(value.trim())
    ? value.trim()
    : fallback;

const normalizeTarget = (
  input: Record<string, unknown> | null,
  fallback: DatabaseEngineBackupTargetSchedule
): DatabaseEngineBackupTargetSchedule => ({
  enabled: typeof input?.['enabled'] === 'boolean' ? input['enabled'] : fallback.enabled,
  cadence: isBackupCadence(input?.['cadence']) ? input['cadence'] : fallback.cadence,
  intervalDays: normalizePositiveInt(input?.['intervalDays'], fallback.intervalDays, 1, 365),
  weekday: normalizePositiveInt(input?.['weekday'], fallback.weekday, 0, 6),
  timeUtc: normalizeTimeUtc(input?.['timeUtc'], fallback.timeUtc),
  lastQueuedAt: normalizeIsoOrNull(input?.['lastQueuedAt']),
  lastRunAt: normalizeIsoOrNull(input?.['lastRunAt']),
  lastStatus: isBackupStatus(input?.['lastStatus']) ? input['lastStatus'] : fallback.lastStatus,
  lastJobId:
    typeof input?.['lastJobId'] === 'string' && input['lastJobId'].trim().length > 0
      ? input['lastJobId'].trim()
      : null,
  lastError:
    typeof input?.['lastError'] === 'string' && input['lastError'].trim().length > 0
      ? input['lastError'].trim()
      : null,
  nextDueAt: normalizeIsoOrNull(input?.['nextDueAt']),
});

export const normalizeDatabaseEngineBackupSchedule = (
  raw: unknown
): DatabaseEngineBackupSchedule => {
  const parsed = parseRawObject(raw);

  return {
    schedulerEnabled:
      typeof parsed?.['schedulerEnabled'] === 'boolean'
        ? parsed['schedulerEnabled']
        : DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE.schedulerEnabled,
    repeatTickEnabled:
      typeof parsed?.['repeatTickEnabled'] === 'boolean'
        ? parsed['repeatTickEnabled']
        : DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE.repeatTickEnabled,
    lastCheckedAt: normalizeIsoOrNull(parsed?.['lastCheckedAt']),
    mongodb: normalizeTarget(
      asRecord(parsed?.['mongodb']),
      DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE.mongodb
    ),
  };
};

export const DATABASE_ENGINE_BACKUP_WEEKDAYS: Array<LabeledOptionDto<number>> = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];
