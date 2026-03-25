import 'server-only';

import type { MongoStringSettingRecord } from '@/shared/contracts/settings';

import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { findProviderForKey } from '@/shared/lib/db/settings-registry';
import { reportObservabilityInternalError } from '@/shared/utils/observability/internal-observability-fallback';

import {
  DEFAULT_OBSERVABILITY_LOGGING_CONTROLS,
  getObservabilityLoggingSettingKey,
  isObservabilityLoggingEnabled,
  parseObservabilityLoggingEnabledSetting,
  type ObservabilityLoggingControlType,
} from './logging-controls';

const LOGGING_CONTROL_CACHE_TTL_MS = 30_000;

const loggingControlCache = new Map<
  ObservabilityLoggingControlType,
  { enabled: boolean; fetchedAt: number }
>();
const loggingControlInflight = new Map<ObservabilityLoggingControlType, Promise<boolean>>();
let loggingControlReadDepth = 0;

const readStoredLoggingControlValue = async (key: string): Promise<string | null> => {
  const provider = await findProviderForKey(key);
  if (provider) {
    return await provider.readValue(key);
  }

  if (!process.env['MONGODB_URI']) return null;

  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoStringSettingRecord>('settings')
    .findOne({ $or: [{ _id: key }, { key }] });

  return typeof doc?.value === 'string' ? doc.value : null;
};

const readDefaultLoggingControlValue = (type: ObservabilityLoggingControlType): boolean =>
  isObservabilityLoggingEnabled(DEFAULT_OBSERVABILITY_LOGGING_CONTROLS, type);

export const isServerLoggingEnabled = async (
  type: ObservabilityLoggingControlType
): Promise<boolean> => {
  const defaultEnabled = readDefaultLoggingControlValue(type);
  const now = Date.now();
  const cached = loggingControlCache.get(type);
  if (cached && now - cached.fetchedAt < LOGGING_CONTROL_CACHE_TTL_MS) {
    return cached.enabled;
  }

  const inflight = loggingControlInflight.get(type);
  if (inflight) {
    return await inflight;
  }

  // Avoid recursive reads if the storage layer itself trips observability reporting.
  if (loggingControlReadDepth > 0) {
    return defaultEnabled;
  }

  const nextInflight = (async (): Promise<boolean> => {
    loggingControlReadDepth += 1;
    try {
      const rawValue = await readStoredLoggingControlValue(getObservabilityLoggingSettingKey(type));
      const enabled = parseObservabilityLoggingEnabledSetting(rawValue, defaultEnabled);
      loggingControlCache.set(type, { enabled, fetchedAt: Date.now() });
      return enabled;
    } catch (error) {
      reportObservabilityInternalError(error, {
        source: 'observability.logging-controls-server',
        action: 'isServerLoggingEnabled',
        type,
      });
      return defaultEnabled;
    } finally {
      loggingControlReadDepth = Math.max(0, loggingControlReadDepth - 1);
      loggingControlInflight.delete(type);
    }
  })();

  loggingControlInflight.set(type, nextInflight);
  return await nextInflight;
};

export const resetServerLoggingControlsCache = (): void => {
  loggingControlCache.clear();
  loggingControlInflight.clear();
  loggingControlReadDepth = 0;
};
