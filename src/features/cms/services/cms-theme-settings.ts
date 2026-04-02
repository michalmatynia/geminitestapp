import 'server-only';

import { ObjectId } from 'mongodb';
import { cache } from 'react';

import {
  CMS_THEME_SETTINGS_KEY,
  DEFAULT_THEME,
  normalizeThemeSettings,
  type ThemeSettings,
} from '@/shared/contracts/cms-theme';
import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { parseJsonSetting } from '@/shared/utils/settings-json';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const CMS_THEME_SETTINGS_CACHE_TTL_MS = 30_000;

type CmsThemeSettingsCacheEntry = {
  expiresAt: number;
  value: ThemeSettings;
};

let cmsThemeSettingsCacheEntry: CmsThemeSettingsCacheEntry | null = null;
let cmsThemeSettingsInFlight: Promise<ThemeSettings> | null = null;

const parseEnvNumber = (value: string | undefined): number | null => {
  if (typeof value !== 'string') return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const getCmsThemeSettingsReadTimeoutMs = (env: NodeJS.ProcessEnv = process.env): number | null => {
  const explicit = parseEnvNumber(env['CMS_THEME_SETTINGS_READ_TIMEOUT_MS']);
  if (explicit !== null) {
    return explicit > 0 ? explicit : null;
  }

  return env['NODE_ENV'] === 'development' ? 150 : null;
};

const awaitThemeSettingsWithinTimeout = async (
  promise: Promise<ThemeSettings>,
  timeoutMs: number | null,
  fallbackValue: ThemeSettings
): Promise<ThemeSettings> => {
  if (timeoutMs === null) {
    return await promise;
  }

  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<ThemeSettings>((resolve) => {
        timeoutHandle = setTimeout(() => resolve(fallbackValue), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
    }
  }
};

const toMongoId = (id: string): string | ObjectId => {
  if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
  return id;
};

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<MongoStringSettingRecord<string | ObjectId>>('settings')
      .findOne({ $or: [{ _id: toMongoId(key) }, { key }] });
    return typeof doc?.value === 'string' ? doc.value : null;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

const readSettingValue = async (key: string): Promise<string | null> => readMongoSetting(key);

const getCmsThemeSettingsUncached = async (): Promise<ThemeSettings> => {
  const stored = await readSettingValue(CMS_THEME_SETTINGS_KEY);
  const parsed = parseJsonSetting<Partial<ThemeSettings> | null>(stored, null);
  return normalizeThemeSettings(parsed);
};

const getCmsThemeSettingsHotCached = async (): Promise<ThemeSettings> => {
  const now = Date.now();
  if (cmsThemeSettingsCacheEntry && cmsThemeSettingsCacheEntry.expiresAt > now) {
    return cmsThemeSettingsCacheEntry.value;
  }

  if (cmsThemeSettingsInFlight) {
    return cmsThemeSettingsInFlight;
  }

  cmsThemeSettingsInFlight = getCmsThemeSettingsUncached()
    .then((value) => {
      cmsThemeSettingsCacheEntry = {
        value,
        expiresAt: Date.now() + CMS_THEME_SETTINGS_CACHE_TTL_MS,
      };
      return value;
    })
    .finally(() => {
      cmsThemeSettingsInFlight = null;
    });

  return await awaitThemeSettingsWithinTimeout(
    cmsThemeSettingsInFlight,
    getCmsThemeSettingsReadTimeoutMs(),
    cmsThemeSettingsCacheEntry?.value ?? DEFAULT_THEME
  );
};

export const getCmsThemeSettings = cache(async (): Promise<ThemeSettings> => {
  return await getCmsThemeSettingsHotCached();
});

export const __testOnly = {
  getCmsThemeSettingsReadTimeoutMs,
};
