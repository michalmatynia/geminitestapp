import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { AI_BRAIN_SETTINGS_KEY, parseBrainSettings, type AiBrainSettings } from '../settings';
import {
  deleteMongoSettingValue,
  readMongoSettingValue,
  writeMongoSettingValue,
} from './database';

let cachedBrainSettingsValue: string | null = null;
let lastBrainSettingsFetchAt = 0;
const BRAIN_SETTINGS_TTL_MS = 30000; // 30 seconds

export const invalidateBrainSettingsCache = (): void => {
  cachedBrainSettingsValue = null;
  lastBrainSettingsFetchAt = 0;
};

const updateBrainSettingsCache = (value: string | null, fetchedAt: number): void => {
  cachedBrainSettingsValue = value;
  lastBrainSettingsFetchAt = fetchedAt;
};

export const readStoredSettingValue = async (key: string): Promise<string | null> => {
  const now = Date.now();
  if (
    key === AI_BRAIN_SETTINGS_KEY &&
    cachedBrainSettingsValue !== null &&
    now - lastBrainSettingsFetchAt < BRAIN_SETTINGS_TTL_MS
  ) {
    return cachedBrainSettingsValue;
  }

  const tryMongo = async (): Promise<string | null> => {
    try {
      return await readMongoSettingValue(key);
    } catch (error) {
      void ErrorSystem.captureException(error);
      return null;
    }
  };

  const value = await tryMongo();

  if (key === AI_BRAIN_SETTINGS_KEY) {
    updateBrainSettingsCache(value, now);
  }

  return value;
};

export const upsertStoredSettingValue = async (key: string, value: string): Promise<boolean> => {
  const tryMongo = async (): Promise<boolean> => {
    try {
      return await writeMongoSettingValue(key, value);
    } catch (error) {
      void ErrorSystem.captureException(error);
      return false;
    }
  };

  const persisted = await tryMongo();

  if (persisted && key === AI_BRAIN_SETTINGS_KEY) {
    cachedBrainSettingsValue = value;
    lastBrainSettingsFetchAt = Date.now();
  }

  return persisted;
};

export const deleteStoredSettingValue = async (key: string): Promise<boolean> => {
  const tryMongo = async (): Promise<boolean> => {
    try {
      return await deleteMongoSettingValue(key);
    } catch (error) {
      void ErrorSystem.captureException(error);
      return false;
    }
  };

  const deleted = await tryMongo();

  if (deleted && key === AI_BRAIN_SETTINGS_KEY) {
    invalidateBrainSettingsCache();
  }

  return deleted;
};

export const getBrainSettings = async (): Promise<AiBrainSettings> => {
  const raw = await readStoredSettingValue(AI_BRAIN_SETTINGS_KEY);
  return parseBrainSettings(raw);
};
