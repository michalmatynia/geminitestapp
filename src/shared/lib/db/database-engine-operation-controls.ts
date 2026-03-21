import {
  DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS,
  type DatabaseEngineOperationControls,
} from './database-engine-constants';
import { reportRuntimeCatch } from '@/shared/utils/observability/runtime-error-reporting';


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

export const normalizeDatabaseEngineOperationControls = (
  raw: unknown
): DatabaseEngineOperationControls => {
  const parsed = parseJsonObject(raw);
  if (!parsed) return { ...DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS };

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
