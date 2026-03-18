import 'server-only';

import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import {
  DEFAULT_SITE_I18N_CONFIG,
  SITE_I18N_SETTINGS_KEY,
  normalizeSiteI18nConfig,
  type SiteI18nConfig,
} from '@/shared/contracts/site-i18n';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { parseJsonSetting } from '@/shared/utils/settings-json';

export const getSiteI18nConfig = async (): Promise<SiteI18nConfig> => {
  if (!process.env['MONGODB_URI']) {
    return DEFAULT_SITE_I18N_CONFIG;
  }

  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<MongoStringSettingRecord<string>>('settings')
      .findOne({ _id: SITE_I18N_SETTINGS_KEY });

    if (!doc?.value) {
      return DEFAULT_SITE_I18N_CONFIG;
    }

    return normalizeSiteI18nConfig(parseJsonSetting<unknown>(doc.value, DEFAULT_SITE_I18N_CONFIG));
  } catch {
    return DEFAULT_SITE_I18N_CONFIG;
  }
};

export const getDefaultSiteLocale = async (): Promise<string> => {
  const config = await getSiteI18nConfig();
  return config.defaultLocale;
};

export const getEnabledSiteLocales = async (): Promise<string[]> => {
  const config = await getSiteI18nConfig();
  return config.locales.filter((locale) => locale.enabled).map((locale) => locale.code);
};
