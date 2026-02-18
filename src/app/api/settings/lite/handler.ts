import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { CLIENT_LOGGING_KEYS } from '@/features/observability/constants/client-logging';
import { APP_FONT_SET_SETTING_KEY } from '@/shared/constants/typography';
import { internalError } from '@/shared/errors/app-error';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import { FOLDER_TREE_PROFILES_V2_SETTING_KEY } from '@/shared/utils/folder-tree-profiles-v2';

type SettingRecord = { key: string; value: string };
type SettingDocument = { _id?: string; key?: string; value?: string };

const SETTINGS_COLLECTION = 'settings';

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
  'case_resolver_default_document_format_v1',
  'case_resolver_settings_v1',
  FOLDER_TREE_PROFILES_V2_SETTING_KEY,
  CLIENT_LOGGING_KEYS.featureFlags,
  CLIENT_LOGGING_KEYS.tags,
];

let liteInflight: Promise<SettingRecord[]> | null = null;

const canUsePrismaSettings = (): boolean =>
  Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;

const isPrismaMissingTableError = (
  error: unknown
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === 'P2021' || error.code === 'P2022');

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

export const GET_handler = async (_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> => {
  if (liteInflight) {
    const data = await liteInflight;
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store', 'X-Cache': 'wait' },
    });
  }

  liteInflight = fetchLiteSettings().finally(() => {
    liteInflight = null;
  });
  const data = await liteInflight;
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store', 'X-Cache': 'miss' },
  });
};
