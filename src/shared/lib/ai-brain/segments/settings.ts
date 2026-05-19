import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { AI_BRAIN_SETTINGS_KEY, parseBrainSettings, type AiBrainSettings } from '../settings';
import {
  deleteMongoSettingValue,
  readMongoSettingValue,
  writeMongoSettingValue,
} from './database';
import {
  deleteBrainRoutingSettings,
  invalidateBrainRoutingCache,
  readBrainRoutingSettings,
  upsertBrainRoutingSettings,
} from './routing-store';

export const invalidateBrainSettingsCache = (): void => {
  invalidateBrainRoutingCache();
};

export const readStoredSettingValue = async (key: string): Promise<string | null> => {
  if (key === AI_BRAIN_SETTINGS_KEY) {
    const routing = await readBrainRoutingSettings();
    return JSON.stringify(routing.settings);
  }

  const tryMongo = async (): Promise<string | null> => {
    try {
      return await readMongoSettingValue(key);
    } catch (error) {
      void ErrorSystem.captureException(error);
      return null;
    }
  };

  return await tryMongo();
};

export const upsertStoredSettingValue = async (key: string, value: string): Promise<boolean> => {
  if (key === AI_BRAIN_SETTINGS_KEY) {
    return await upsertBrainRoutingSettings(parseBrainSettings(value));
  }

  const tryMongo = async (): Promise<boolean> => {
    try {
      return await writeMongoSettingValue(key, value);
    } catch (error) {
      void ErrorSystem.captureException(error);
      return false;
    }
  };

  return await tryMongo();
};

export const deleteStoredSettingValue = async (key: string): Promise<boolean> => {
  if (key === AI_BRAIN_SETTINGS_KEY) {
    return await deleteBrainRoutingSettings();
  }

  const tryMongo = async (): Promise<boolean> => {
    try {
      return await deleteMongoSettingValue(key);
    } catch (error) {
      void ErrorSystem.captureException(error);
      return false;
    }
  };

  return await tryMongo();
};

export const getBrainSettings = async (): Promise<AiBrainSettings> => {
  const routing = await readBrainRoutingSettings();
  return routing.settings;
};
