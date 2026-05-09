/**
 * Database Engine Operation Controls
 * 
 * Manages the normalization and validation of operational controls for the database engine.
 * These controls determine which manual and automated database operations (sync, backfill, 
 * backup, etc.) are currently permitted within the application.
 */

import {
  DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS,
  type DatabaseEngineOperationControls,
} from './database-engine-constants';
import { reportRuntimeCatch } from '@/shared/utils/observability/runtime-error-reporting';

/**
 * Parses a raw value into a plain object Record from JSON.
 * 
 * @param raw - The raw value (string or object).
 * @returns The parsed Record or null if invalid.
 */
const parseJsonObject = (raw: unknown): Record<string, unknown> | null => {
  if (!raw) return null;
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch (error) {
    void reportRuntimeCatch(error, {
      source: 'db.database-engine-operation-controls',
      action: 'parseJsonObject',
      rawType: typeof raw,
    });
    return null;
  }
};

/**
 * Normalizes a raw input into a valid DatabaseEngineOperationControls object.
 * It ensures all required flags are present, falling back to defaults for any 
 * missing or invalid properties.
 * 
 * @param raw - The raw configuration input.
 * @returns A fully populated DatabaseEngineOperationControls object.
 */
export const normalizeDatabaseEngineOperationControls = (
  raw: unknown
): DatabaseEngineOperationControls => {
  const parsed = parseJsonObject(raw);
  if (!parsed) return { ...DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS };

  /** Helper to safely extract boolean values with fallbacks. */
  const boolOrDefault = (key: keyof DatabaseEngineOperationControls): boolean =>
    typeof parsed[key] === 'boolean'
      ? Boolean(parsed[key])
      : DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS[key];

  return {
    allowManualFullSync: boolOrDefault('allowManualFullSync'),
    allowManualCollectionSync: boolOrDefault('allowManualCollectionSync'),
    allowManualBackfill: boolOrDefault('allowManualBackfill'),
    allowManualBackupRunNow: boolOrDefault('allowManualBackupRunNow'),
    allowManualBackupMaintenance: boolOrDefault('allowManualBackupMaintenance'),
    allowBackupSchedulerTick: boolOrDefault('allowBackupSchedulerTick'),
    allowOperationJobCancellation: boolOrDefault('allowOperationJobCancellation'),
  };
};
