/**
 * CMS Theme Service
 * 
 * Manages retrieval and caching of CMS theme settings from the database.
 */

import {
  CMS_THEME_SETTINGS_KEY,
  DEFAULT_THEME,
  normalizeThemeSettings,
  type ThemeSettings,
} from '@/shared/contracts/cms-theme';
import { parseJsonSetting } from '@/shared/utils/settings-json';
import { readMongoSetting } from './theme-repository';

/**
 * Fetches and normalizes theme settings.
 */
export const fetchThemeSettings = async (): Promise<ThemeSettings> => {
  const stored = await readMongoSetting(CMS_THEME_SETTINGS_KEY);
  const parsed = parseJsonSetting<Partial<ThemeSettings> | null>(stored, null);
  return normalizeThemeSettings(parsed);
};
