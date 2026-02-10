export const runtime = 'nodejs';

import { ObjectId, Filter } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

import { requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import {
  aiTriggerButtonUpdateSchema,
  parseAiTriggerButtonsRaw,
} from '@/features/ai/ai-paths/validations/trigger-buttons';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import type { AiTriggerButtonRecord } from '@/shared/types/ai-trigger-buttons';
import type { ApiHandlerContext } from '@/shared/types/api';

const SETTINGS_COLLECTION = 'settings';
const AI_PATHS_TRIGGER_BUTTONS_KEY = 'ai_paths_trigger_buttons';

type SettingDoc = { _id?: string | ObjectId; key?: string; value?: string; createdAt?: Date; updatedAt?: Date };

const canUsePrismaSettings = (): boolean =>
  Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  // Using $or with both _id (ObjectId) and key (string) allows flexibility,
  // but for _id, it must be an ObjectId type. If key is a string and not a valid ObjectId,
  // it won't match _id fields. Assuming key can sometimes be a string _id.
  const filter = {} as Filter<SettingDoc>;
  if (ObjectId.isValid(key)) {
    filter._id = new ObjectId(key);
  } else {
    filter.key = key;
  }

  const doc = await mongo
    .collection<SettingDoc>(SETTINGS_COLLECTION)
    .findOne(filter);
  const value = doc?.value;
  return typeof value === 'string' ? value : null;
};

const writeMongoSetting = async (key: string, value: string): Promise<boolean> => {
  if (!process.env['MONGODB_URI']) return false;
  const mongo = await getMongoDb();
  const now = new Date();
  await mongo.collection<SettingDoc>(SETTINGS_COLLECTION).updateOne(
    { $or: [{ key }, { _id: key }] },
    {
      $set: { key, value, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  return true;
};

const readPrismaSetting = async (key: string): Promise<string | null> => {
  if (!canUsePrismaSettings()) return null;
  try {
    const setting = await prisma.setting.findUnique({
      where: { key },
      select: { value: true },
    });
    return typeof setting?.value === 'string' ? setting.value : null;
  } catch {
    return null;
  }
};

const writePrismaSetting = async (key: string, value: string): Promise<boolean> => {
  if (!canUsePrismaSettings()) return false;
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
    select: { key: true },
  });
  return true;
};

const readTriggerButtonsRaw = async (): Promise<string | null> => {
  const provider = await getAppDbProvider();
  if (provider === 'mongodb') {
    const fromMongo = await readMongoSetting(AI_PATHS_TRIGGER_BUTTONS_KEY);
    if (fromMongo !== null) return fromMongo;
    return readPrismaSetting(AI_PATHS_TRIGGER_BUTTONS_KEY);
  }
  const fromPrisma = await readPrismaSetting(AI_PATHS_TRIGGER_BUTTONS_KEY);
  if (fromPrisma !== null) return fromPrisma;
  return readMongoSetting(AI_PATHS_TRIGGER_BUTTONS_KEY);
};

const writeTriggerButtonsRaw = async (value: string): Promise<void> => {
  const provider = await getAppDbProvider();
  const wrote =
    provider === 'mongodb'
      ? await writeMongoSetting(AI_PATHS_TRIGGER_BUTTONS_KEY, value)
      : await writePrismaSetting(AI_PATHS_TRIGGER_BUTTONS_KEY, value);
  if (!wrote) {
    const fallback =
      provider === 'mongodb'
        ? await writePrismaSetting(AI_PATHS_TRIGGER_BUTTONS_KEY, value)
        : await writeMongoSetting(AI_PATHS_TRIGGER_BUTTONS_KEY, value);
    if (!fallback) {
      throw new Error('No settings store configured for trigger buttons.');
    }
  }
};

async function PATCH_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  await requireAiPathsAccess();
  const id = params.id;
  if (!id) throw badRequestError('Missing trigger button id.');
  const parsed = await parseJsonBody(req, aiTriggerButtonUpdateSchema, {
    logPrefix: 'ai-paths.trigger-buttons.PATCH',
  });
  if (!parsed.ok) return parsed.response;
  const raw = await readTriggerButtonsRaw();
  const existing = parseAiTriggerButtonsRaw(raw);
  const index = existing.findIndex((item: AiTriggerButtonRecord) => item.id === id);
  if (index === -1) {
    throw notFoundError('Trigger button not found.', { id });
  }
  const current = existing[index]!;
  const now = new Date().toISOString();
  const nextRecord: AiTriggerButtonRecord = {
    ...current,
    ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
    ...(parsed.data.iconId !== undefined ? { iconId: parsed.data.iconId ? parsed.data.iconId.trim() : null } : {}),
    ...(parsed.data.locations ? { locations: parsed.data.locations } : {}),
    ...(parsed.data.mode ? { mode: parsed.data.mode } : {}),
    ...(parsed.data.display ? { display: parsed.data.display } : {}),
    updatedAt: now,
  };
  const next = existing.slice();
  next[index] = nextRecord;
  await writeTriggerButtonsRaw(JSON.stringify(next));
  return NextResponse.json(nextRecord);
}

async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  await requireAiPathsAccess();
  const id = params.id;
  if (!id) throw badRequestError('Missing trigger button id.');
  const raw = await readTriggerButtonsRaw();
  const existing = parseAiTriggerButtonsRaw(raw);
  const next = existing.filter((item: AiTriggerButtonRecord) => item.id !== id);
  if (next.length === existing.length) {
    throw notFoundError('Trigger button not found.', { id });
  }
  await writeTriggerButtonsRaw(JSON.stringify(next));
  return NextResponse.json({ ok: true });
}

export const PATCH = apiHandlerWithParams<{ id: string }>(PATCH_handler, {
  source: 'ai-paths.trigger-buttons.PATCH',
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'ai-paths.trigger-buttons.DELETE',
});
