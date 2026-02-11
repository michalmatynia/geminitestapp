export const runtime = 'nodejs';

import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { CLIENT_LOGGING_KEYS } from '@/features/observability/constants/client-logging';
import { ErrorSystem } from '@/features/observability/server';
import { APP_FONT_SET_SETTING_KEY } from '@/shared/constants/typography';
import { internalError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getDatabaseEnginePolicy } from '@/shared/lib/db/database-engine-policy';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import type { ApiHandlerContext } from '@/shared/types/api/api';

type SettingRecord = { key: string; value: string };
type SettingDocument = { _id?: string; key?: string; value?: string };

const SETTINGS_COLLECTION = 'settings';
const CACHE_CONTROL = 'private, max-age=120, stale-while-revalidate=600';
const LITE_CACHE_TTL_MS = 60_000;
const disableSettingsRateLimit = process.env['NODE_ENV'] !== 'production';

const LITE_SETTINGS_KEYS = [
  APP_FONT_SET_SETTING_KEY,
  'background_sync_enabled',
  'background_sync_interval_seconds',
  'query_status_panel_enabled',
  'query_status_panel_open',
  'noteSettings:selectedFolderId',
  'noteSettings:selectedNotebookId',
  'noteSettings:autoformatOnPaste',
  'noteSettings:editorMode',
  CLIENT_LOGGING_KEYS.featureFlags,
  CLIENT_LOGGING_KEYS.tags,
];

let liteCache: { data: SettingRecord[]; fetchedAt: number } | null = null;
let liteInflight: Promise<SettingRecord[]> | null = null;

const canUsePrismaSettings = (): boolean =>
  Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;

const isPrismaMissingTableError = (
  error: unknown
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === 'P2021' || error.code === 'P2022');

const assertAutomaticSettingsFallbackAllowed = async (): Promise<void> => {
  const policy = await getDatabaseEnginePolicy();
  const allowed =
    policy.allowAutomaticFallback &&
    policy.allowAutomaticMigrations &&
    !policy.strictProviderAvailability;
  if (allowed) return;
  throw internalError(
    'Prisma settings table is missing and automatic fallback is disabled by Database Engine policy. Configure migrations manually in Workflow Database -> Database Engine.'
  );
};

const readPrismaSettings = async (
  keys: string[]
): Promise<{ rows: SettingRecord[]; missing: boolean }> => {
  if (!canUsePrismaSettings()) return { rows: [], missing: false };
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: keys } },
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

const readMongoSettings = async (keys: string[]): Promise<SettingRecord[]> => {
  if (!process.env['MONGODB_URI']) return [];
  const mongo = await getMongoDb();
  const docs = await mongo
    .collection<SettingDocument>(SETTINGS_COLLECTION)
    .find(
       
      { $or: [{ key: { $in: keys } }, { _id: { $in: keys } }] },
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
  const hasMongo = Boolean(process.env['MONGODB_URI']);

  if (provider === 'mongodb') {
    return readMongoSettings(LITE_SETTINGS_KEYS);
  }

  const { rows: prismaSettings, missing: prismaMissing } = await readPrismaSettings(
    LITE_SETTINGS_KEYS
  );
  if (prismaMissing) {
    await assertAutomaticSettingsFallbackAllowed();
    if (hasMongo) {
      await ErrorSystem.logWarning('[settings.lite] Prisma settings table missing; falling back to Mongo.', {
        service: 'api/settings/lite'
      });
      return readMongoSettings(LITE_SETTINGS_KEYS);
    }
    await ErrorSystem.logWarning('[settings.lite] Prisma settings table missing and no Mongo fallback.', {
      service: 'api/settings/lite'
    });
    throw internalError(
      'Prisma settings table is missing and MongoDB fallback is unavailable. Run migrations manually in Workflow Database -> Database Engine.'
    );
  }
  return prismaSettings;
};

const getCachedLiteSettings = (): SettingRecord[] | null => {
  if (!liteCache) return null;
  if (Date.now() - liteCache.fetchedAt > LITE_CACHE_TTL_MS) return null;
  return liteCache.data;
};

const GET_handler = async (_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> => {
  const cached = getCachedLiteSettings();
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': CACHE_CONTROL, 'X-Cache': 'hit' },
    });
  }
  if (liteInflight) {
    const data = await liteInflight;
    return NextResponse.json(data, {
      headers: { 'Cache-Control': CACHE_CONTROL, 'X-Cache': 'wait' },
    });
  }

  liteInflight = fetchLiteSettings().finally(() => {
    liteInflight = null;
  });
  const data = await liteInflight;
  liteCache = { data, fetchedAt: Date.now() };
  return NextResponse.json(data, {
    headers: { 'Cache-Control': CACHE_CONTROL, 'X-Cache': 'miss' },
  });
};

export const GET = apiHandler(GET_handler, {
  source: 'settings.GET.lite',
  rateLimitKey: disableSettingsRateLimit ? false : 'api',
});
