import { type AiPathsSettingRecord } from './settings-store.constants';

const settingsCache = new Map<string, string>();

export const getCachedAiPathsSettings = (keys: string[]): AiPathsSettingRecord[] => {
  const result: AiPathsSettingRecord[] = [];
  for (const key of keys) {
    const value = settingsCache.get(key);
    if (value !== undefined) {
      result.push({ key, value });
    }
  }
  return result;
};

export const setCachedAiPathsSettings = (records: AiPathsSettingRecord[]): void => {
  for (const record of records) {
    settingsCache.set(record.key, record.value);
  }
};

export const deleteCachedAiPathsSettings = (keys: string[]): void => {
  for (const key of keys) {
    settingsCache.delete(key);
  }
};
