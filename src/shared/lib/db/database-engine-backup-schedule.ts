/**
 * Database Engine Backup Schedule
 * 
 * Manages the normalization, validation, and parsing of database backup schedules.
 * This module ensures that backup configurations (daily, weekly, interval-based) are
 * correctly formatted and have sensible defaults. It handles both MongoDB-specific
 * schedules and global scheduler settings.
 */

import {
  DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE,
  type DatabaseEngineBackupCadence,
  type DatabaseEngineBackupSchedule,
  type DatabaseEngineBackupStatus,
  type DatabaseEngineBackupTargetSchedule,
} from './database-engine-constants';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

/**
 * Regex for validating 24-hour UTC time format (HH:mm).
 */
const VALID_TIME_UTC = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Ensures a value is a plain object Record.
 * 
 * @param value - The value to check.
 * @returns The value as a Record or null.
 */
const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

/**
 * Parses a raw value (string or object) into a Record.
 * 
 * @param raw - The raw input to parse.
 * @returns The parsed Record or null.
 */
const parseRawObject = (raw: unknown): Record<string, unknown> | null => {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return asRecord(parsed);
    } catch (error) {
      logClientCatch(error, {
        source: 'db.database-engine-backup-schedule',
        action: 'parseRawObject',
        rawType: typeof raw,
      });
      return null;
    }
  }
  return asRecord(raw);
};

/**
 * Type guard for backup cadence values.
 * 
 * @param value - The value to check.
 * @returns True if the value is a valid DatabaseEngineBackupCadence.
 */
const isBackupCadence = (value: unknown): value is DatabaseEngineBackupCadence =>
  value === 'daily' || value === 'every_n_days' || value === 'weekly';

/**
 * Type guard for backup status values.
 * 
 * @param value - The value to check.
 * @returns True if the value is a valid DatabaseEngineBackupStatus.
 */
const isBackupStatus = (value: unknown): value is DatabaseEngineBackupStatus =>
  value === 'idle' ||
  value === 'queued' ||
  value === 'running' ||
  value === 'success' ||
  value === 'failed';

/**
 * Normalizes a value to a positive integer within a specified range.
 * 
 * @param value - The input value.
 * @param fallback - Fallback if input is invalid.
 * @param min - Minimum allowed value.
 * @param max - Maximum allowed value.
 * @returns The normalized integer.
 */
const normalizePositiveInt = (
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
};

/**
 * Normalizes a value to an ISO date string or null.
 * 
 * @param value - The input value.
 * @returns ISO string or null.
 */
const normalizeIsoOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
};

/**
 * Validates if a string is a valid UTC time in HH:mm format.
 * 
 * @param value - The string to validate.
 * @returns True if valid.
 */
export const isValidDatabaseEngineBackupTimeUtc = (value: string): boolean =>
  VALID_TIME_UTC.test(value);

/**
 * Normalizes a UTC time string, falling back if invalid.
 * 
 * @param value - The input value.
 * @param fallback - The fallback time.
 * @returns Normalized HH:mm time.
 */
const normalizeTimeUtc = (value: unknown, fallback: string): string =>
  typeof value === 'string' && isValidDatabaseEngineBackupTimeUtc(value.trim())
    ? value.trim()
    : fallback;

/**
 * Normalizes a specific backup target schedule (e.g., for MongoDB).
 * 
 * @param input - The raw target settings.
 * @param fallback - Fallback settings.
 * @returns Normalized target schedule.
 */
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

/**
 * Normalizes a complete Database Engine backup schedule.
 * 
 * @param raw - The raw input (JSON string or object).
 * @returns A fully normalized DatabaseEngineBackupSchedule object.
 */
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

/**
 * Human-readable labels for weekdays used in backup scheduling.
 */
export const DATABASE_ENGINE_BACKUP_WEEKDAYS: Array<LabeledOptionDto<number>> = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];
