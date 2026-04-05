import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  isKangurSettingKey,
  listKangurSettingsByKeys,
  KANGUR_STOREFRONT_APPEARANCE_SETTING_KEYS,
  ensureKangurStorefrontAppearanceSettingsSeeded,
  ensureKangurThemePresetManifestSeeded,
} from '@/features/kangur/server';
import { KANGUR_THEME_PRESET_MANIFEST_KEY } from '@/shared/contracts/kangur-settings-keys';
import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { optionalBooleanQuerySchema } from '@/shared/lib/api/query-schema';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { isTransientMongoConnectionError } from '@/shared/lib/db/utils/mongo';
import { LITE_SETTINGS_KEYS } from '@/shared/lib/settings-lite-keys';
import {
  cloneLiteSettings,
  getLiteSettingsCache,
  getLiteSettingsInflight,
  setLiteSettingsCache,
  setLiteSettingsInflight,
  type LiteSettingRecord,
} from '@/shared/lib/settings-lite-server-cache';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

type SettingRecord = LiteSettingRecord;

const SETTINGS_COLLECTION = 'settings';
const KANGUR_STOREFRONT_APPEARANCE_KEY_SET = new Set(
  KANGUR_STOREFRONT_APPEARANCE_SETTING_KEYS
);

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};
const LITE_SETTINGS_CACHE_TTL_MS = parsePositiveInt(
  process.env['SETTINGS_LITE_CACHE_TTL_MS'],
  60_000
);
const LITE_SETTINGS_STALE_TTL_MS = parsePositiveInt(
  process.env['SETTINGS_LITE_STALE_TTL_MS'],
  10 * 60_000
);

const buildServerTiming = (entries: Record<string, number | null | undefined>): string =>
  Object.entries(entries)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
    .map(([name, value]) => `${name};dur=${(value as number).toFixed(2)}`)
    .join(', ');

const attachServerTiming = (
  response: Response,
  entries: Record<string, number | null | undefined>
): void => {
  const value = buildServerTiming(entries);
  if (!value) return;
  response.headers.set('Server-Timing', value);
};

const readMongoSettings = async (keys: readonly string[]): Promise<SettingRecord[]> => {
  if (!process.env['MONGODB_URI']) return [];
  if (keys.length === 0) return [];
  const mongo = await getMongoDb();
  const docs = await mongo
    .collection<MongoStringSettingRecord>(SETTINGS_COLLECTION)
    .find(
      { $or: [{ key: { $in: keys as string[] } }, { _id: { $in: keys as string[] } }] },
      { projection: { _id: 1, key: 1, value: 1 } }
    )
    .toArray();
  return docs
    .map((doc: MongoStringSettingRecord) => {
      const key = doc.key ?? (typeof doc._id === 'string' ? doc._id : '');
      const value = typeof doc.value === 'string' ? doc.value : null;
      return { key, value };
    })
    .filter((item: { key: string; value: string | null }) => item.key && item.value !== null)
    .map((item) => ({ key: item.key, value: item.value as string }));
};

const fetchLiteSettings = async (): Promise<SettingRecord[]> => {
  const kangurKeys: string[] = [];
  const otherKeys: string[] = [];
  LITE_SETTINGS_KEYS.forEach((key) => {
    if (isKangurSettingKey(key)) {
      kangurKeys.push(key);
      return;
    }
    otherKeys.push(key);
  });
  const appearanceKeys = kangurKeys.filter((key) =>
    KANGUR_STOREFRONT_APPEARANCE_KEY_SET.has(key) || key === KANGUR_THEME_PRESET_MANIFEST_KEY
  );
  const remainingKangurKeys = kangurKeys.filter(
    (key) =>
      !KANGUR_STOREFRONT_APPEARANCE_KEY_SET.has(key) && key !== KANGUR_THEME_PRESET_MANIFEST_KEY
  );
  const needsStorefrontAppearanceSeed = appearanceKeys.some((key) =>
    KANGUR_STOREFRONT_APPEARANCE_KEY_SET.has(key)
  );
  const needsThemePresetManifestSeed = appearanceKeys.includes(KANGUR_THEME_PRESET_MANIFEST_KEY);
  const [otherSettings, appearanceSettings, themePresetManifest, kangurSettings] =
    await Promise.all([
      readMongoSettings(otherKeys),
      needsStorefrontAppearanceSeed
        ? ensureKangurStorefrontAppearanceSettingsSeeded()
        : Promise.resolve<SettingRecord[]>([]),
      needsThemePresetManifestSeed
        ? ensureKangurThemePresetManifestSeeded()
        : Promise.resolve<SettingRecord | null>(null),
      listKangurSettingsByKeys(remainingKangurKeys),
    ]);
  const selectedAppearanceSettings =
    needsStorefrontAppearanceSeed
      ? appearanceSettings.filter((item) => appearanceKeys.includes(item.key))
      : [];
  const specialAppearanceSettings = themePresetManifest ? [themePresetManifest] : [];
  const allKangurSettings = [
    ...selectedAppearanceSettings,
    ...specialAppearanceSettings,
    ...kangurSettings,
  ];
  if (allKangurSettings.length === 0) return otherSettings;
  if (otherSettings.length === 0) return allKangurSettings;
  const merged = new Map<string, string>();
  otherSettings.forEach((item) => merged.set(item.key, item.value));
  allKangurSettings.forEach((item) => merged.set(item.key, item.value));
  return Array.from(merged.entries()).map(([key, value]) => ({ key, value }));
};

const createLiteSettingsInflight = (): Promise<SettingRecord[]> =>
  fetchLiteSettings()
    .then((rows: SettingRecord[]) => {
      const safeRows = cloneLiteSettings(rows);
      setLiteSettingsCache({ data: safeRows, ts: Date.now() });
      return safeRows;
    })
    .finally(() => {
      setLiteSettingsInflight(null);
    });

const getOrCreateLiteSettingsInflight = (): Promise<SettingRecord[]> => {
  const existingInflight = getLiteSettingsInflight();
  if (existingInflight) {
    return existingInflight;
  }

  const nextInflight = createLiteSettingsInflight();
  setLiteSettingsInflight(nextInflight);
  return nextInflight;
};

export const clearLiteSettingsServerCache = (): void => {
  setLiteSettingsCache(null);
  setLiteSettingsInflight(null);
};

export const isLiteSettingsKey = (key: string): boolean => {
  const normalizedKey = key.trim();
  return LITE_SETTINGS_KEYS.includes(normalizedKey);
};

export const querySchema = z.object({
  fresh: optionalBooleanQuerySchema(),
});

export const prewarmLiteSettingsServerCache = async (): Promise<void> => {
  const now = Date.now();
  const currentCache = getLiteSettingsCache();
  if (currentCache && now - currentCache.ts <= LITE_SETTINGS_CACHE_TTL_MS) {
    return;
  }

  try {
    await getOrCreateLiteSettingsInflight();
  } catch (error) {
    if (isTransientMongoConnectionError(error)) {
      return;
    }
    void ErrorSystem.captureException(error, {
      service: 'api/settings/lite',
      action: 'prewarmLiteSettingsServerCache',
    });
  }
};

export const GET_handler = async (
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> => {
  const requestStart = performance.now();
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const forceFresh = query.fresh === true;
  const now = Date.now();
  const currentCache = getLiteSettingsCache();
  const staleCache =
    currentCache && now - currentCache.ts <= LITE_SETTINGS_STALE_TTL_MS ? currentCache : null;

  if (!forceFresh && currentCache && now - currentCache.ts <= LITE_SETTINGS_CACHE_TTL_MS) {
    const response = NextResponse.json(cloneLiteSettings(currentCache.data), {
      headers: { 'Cache-Control': 'no-store', 'X-Cache': 'hit' },
    });
    attachServerTiming(response, { total: performance.now() - requestStart, cache: 0 });
    return response;
  }

  const liteInflight = getLiteSettingsInflight();
  if (liteInflight) {
    const waitStart = performance.now();
    const data = await liteInflight;
    const response = NextResponse.json(cloneLiteSettings(data), {
      headers: { 'Cache-Control': 'no-store', 'X-Cache': 'wait' },
    });
    attachServerTiming(response, {
      total: performance.now() - requestStart,
      wait: performance.now() - waitStart,
    });
    return response;
  }

  const fetchStart = performance.now();
  try {
    const data = await getOrCreateLiteSettingsInflight();
    const response = NextResponse.json(cloneLiteSettings(data), {
      headers: { 'Cache-Control': 'no-store', 'X-Cache': forceFresh ? 'fresh' : 'miss' },
    });
    attachServerTiming(response, {
      total: performance.now() - requestStart,
      fetch: performance.now() - fetchStart,
    });
    return response;
  } catch (error: unknown) {
    const isTransientMongoError = isTransientMongoConnectionError(error);
    if (staleCache) {
      const response = NextResponse.json(cloneLiteSettings(staleCache.data), {
        headers: { 'Cache-Control': 'no-store', 'X-Cache': 'stale' },
      });
      attachServerTiming(response, {
        total: performance.now() - requestStart,
        fetch: performance.now() - fetchStart,
      });
      return response;
    }
    if (isTransientMongoError) {
      const response = NextResponse.json([], {
        headers: {
          'Cache-Control': 'no-store',
          'X-Cache': 'degraded',
          'X-Settings-Degraded': 'transient-mongo-error',
        },
      });
      attachServerTiming(response, {
        total: performance.now() - requestStart,
        fetch: performance.now() - fetchStart,
      });
      return response;
    }
    void ErrorSystem.captureException(error, {
      service: 'api/settings/lite',
      action: 'GET_handler',
    });
    throw error;
  }
};
