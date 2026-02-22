import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { internalError } from '@/shared/errors/app-error';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { LITE_SETTINGS_KEYS } from '@/shared/lib/settings-lite-keys';
import {
  cloneLiteSettings,
  getLiteSettingsCache,
  getLiteSettingsInflight,
  setLiteSettingsCache,
  setLiteSettingsInflight,
  type LiteSettingRecord,
} from '@/shared/lib/settings-lite-server-cache';
import prisma from '@/shared/lib/db/prisma';

type SettingRecord = LiteSettingRecord;
type SettingDocument = { _id?: string; key?: string; value?: string };

const SETTINGS_COLLECTION = 'settings';

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

const canUsePrismaSettings = (): boolean =>
  Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;

const isPrismaMissingTableError = (
  error: unknown
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === 'P2021' || error.code === 'P2022');

const readPrismaSettings = async (
  keys: readonly string[]
): Promise<{ rows: SettingRecord[]; missing: boolean }> => {
  if (!canUsePrismaSettings()) return { rows: [], missing: false };
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: keys as string[] } },
      select: { key: true, value: true },
    });
    return { rows, missing: false };
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      return { rows: [], missing: true };
    }
    throw error;
  }
};

const readMongoSettings = async (keys: readonly string[]): Promise<SettingRecord[]> => {
  if (!process.env['MONGODB_URI']) return [];
  const mongo = await getMongoDb();
  const docs = await mongo
    .collection<SettingDocument>(SETTINGS_COLLECTION)
    .find(
       
      { $or: [{ key: { $in: keys as string[] } }, { _id: { $in: keys as string[] } }] },
      { projection: { _id: 1, key: 1, value: 1 } }
    )
    .toArray();
  return docs
    .map((doc: SettingDocument) => {
      const key = doc.key ?? (typeof doc._id === 'string' ? doc._id : '');
      const value = typeof doc.value === 'string' ? doc.value : null;
      return { key, value };
    })
    .filter((item: { key: string; value: string | null }) => item.key && item.value !== null)
    .map((item) => ({ key: item.key, value: item.value as string }));
};

const fetchLiteSettings = async (): Promise<SettingRecord[]> => {
  const envProvider = process.env['APP_DB_PROVIDER']?.toLowerCase().trim();
  const provider =
    envProvider === 'mongodb' || envProvider === 'prisma' ? envProvider : await getAppDbProvider();

  if (provider === 'mongodb') {
    return readMongoSettings(LITE_SETTINGS_KEYS);
  }

  const { rows: prismaSettings, missing: prismaMissing } = await readPrismaSettings(
    LITE_SETTINGS_KEYS
  );
  if (prismaMissing) {
    throw internalError(
      'Prisma settings table is missing. Run migrations manually in Workflow Database -> Database Engine.'
    );
  }
  return prismaSettings;
};

export const clearLiteSettingsServerCache = (): void => {
  setLiteSettingsCache(null);
  setLiteSettingsInflight(null);
};

export const isLiteSettingsKey = (key: string): boolean => {
  const normalizedKey = key.trim();
  return (LITE_SETTINGS_KEYS as readonly string[]).includes(normalizedKey);
};

export const GET_handler = async (_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> => {
  const requestStart = performance.now();
  const forceFresh = _req.nextUrl.searchParams.get('fresh') === '1';
  const now = Date.now();
  const currentCache = getLiteSettingsCache();
  const staleCache = currentCache && now - currentCache.ts <= LITE_SETTINGS_STALE_TTL_MS
    ? currentCache
    : null;

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

  const nextInflight = fetchLiteSettings()
    .then((rows: SettingRecord[]) => {
      const safeRows = cloneLiteSettings(rows);
      setLiteSettingsCache({ data: safeRows, ts: Date.now() });
      return safeRows;
    })
    .finally(() => {
      setLiteSettingsInflight(null);
    });
  setLiteSettingsInflight(nextInflight);

  const fetchStart = performance.now();
  try {
    const data = await nextInflight;
    const response = NextResponse.json(cloneLiteSettings(data), {
      headers: { 'Cache-Control': 'no-store', 'X-Cache': forceFresh ? 'fresh' : 'miss' },
    });
    attachServerTiming(response, {
      total: performance.now() - requestStart,
      fetch: performance.now() - fetchStart,
    });
    return response;
  } catch (error: unknown) {
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
    throw error;
  }
};
