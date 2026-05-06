import { clearSecretSettingCache, readSecretSettingValues } from '@/shared/lib/settings/secret-settings';
import { clearSettingsCache } from '@/shared/lib/settings-cache';
import { clearLiteSettingsServerCache } from '@/shared/lib/settings-lite-server-cache';

export const settingsManager = {
  clearSecretCache: clearSecretSettingCache,
  readSecretValues: readSecretSettingValues,
  clearCache: clearSettingsCache,
  clearLiteCache: clearLiteSettingsServerCache,
};
