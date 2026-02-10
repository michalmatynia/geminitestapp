export const runtime = 'nodejs';

import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

import { requireAiPathsAccess, requireAiPathsRunAccess } from '@/features/ai/ai-paths/server';
import {
  aiTriggerButtonCreateSchema,
  parseAiTriggerButtonsRaw,
} from '@/features/ai/ai-paths/validations/trigger-buttons';
import { AppErrorCodes, badRequestError, isAppError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
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
  const doc = await mongo
    .collection<SettingDoc>(SETTINGS_COLLECTION)
    .findOne({ $or: [{ key }, { _id: key }] });
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

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    await requireAiPathsRunAccess();
  } catch (error) {
    // Trigger buttons are rendered across multiple surfaces. For users without
    // AI-paths permissions, treat this as an empty list rather than a noisy API error.
    if (
      isAppError(error) &&
      (error.code === AppErrorCodes.unauthorized || error.code === AppErrorCodes.forbidden)
    ) {
      return NextResponse.json([]);
    }
    throw error;
  }
  const raw = await readTriggerButtonsRaw();
  const triggerButtons = parseAiTriggerButtonsRaw(raw);
  return NextResponse.json(triggerButtons);
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireAiPathsAccess();
  const parsed = await parseJsonBody(req, aiTriggerButtonCreateSchema, {
    logPrefix: 'ai-paths.trigger-buttons.POST',
  });
  if (!parsed.ok) return parsed.response;

  const { name, iconId, locations, mode, display } = parsed.data;
  const raw = await readTriggerButtonsRaw();
  const existing = parseAiTriggerButtonsRaw(raw);
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw badRequestError('Name is required.');
  }

  const now = new Date().toISOString();
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `trigger_${Math.random().toString(36).slice(2, 10)}`;

  const record: AiTriggerButtonRecord = {
    id,
    name: normalizedName,
    iconId: iconId ? iconId.trim() : null,
    locations,
    mode,
    display,
    createdAt: now,
    updatedAt: now,
  };

  const next = [...existing, record];
  await writeTriggerButtonsRaw(JSON.stringify(next));
  return NextResponse.json(record);
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'ai-paths.trigger-buttons.GET' }
);

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'ai-paths.trigger-buttons.POST' }
);
