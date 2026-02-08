export const runtime = 'nodejs';

import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import type { AiTriggerButtonRecord } from '@/shared/types/ai-trigger-buttons';
import type { ApiHandlerContext } from '@/shared/types/api';

const SETTINGS_COLLECTION = 'settings';
const AI_PATHS_TRIGGER_BUTTONS_KEY = 'ai_paths_trigger_buttons';

const triggerButtonLocationSchema = z.enum([
  'product_modal',
  'product_list',
  'note_modal',
  'note_list',
]);

const triggerButtonModeSchema = z.enum(['click', 'toggle']);
const triggerButtonDisplaySchema = z.enum(['icon', 'icon_label']);

const triggerButtonRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  // Older persisted records may miss some fields; keep parsing lenient and normalize on read.
  iconId: z.string().nullable().optional(),
  locations: z
    .preprocess(
      (value) => (typeof value === 'string' ? [value] : value),
      z.array(triggerButtonLocationSchema)
    )
    .optional(),
  mode: triggerButtonModeSchema.optional(),
  display: triggerButtonDisplaySchema.optional(),
  createdAt: z
    .preprocess((value) => (value instanceof Date ? value.toISOString() : value), z.string().min(1))
    .optional(),
  updatedAt: z
    .preprocess((value) => (value instanceof Date ? value.toISOString() : value), z.string().min(1))
    .optional(),
});

const reorderSchema = z.object({
  orderedIds: z.array(z.string().trim().min(1)),
});

type SettingDoc = {
  _id?: string | ObjectId;
  key?: string;
  value?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

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

const parseTriggerButtons = (raw: string | null): AiTriggerButtonRecord[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const items: AiTriggerButtonRecord[] = [];
    parsed.forEach((item: unknown) => {
      const validated = triggerButtonRecordSchema.safeParse(item);
      if (!validated.success) return;
      const data = validated.data;
      const now = new Date().toISOString();
      const locations =
        Array.isArray(data.locations) && data.locations.length > 0
          ? data.locations
          : (['product_modal'] as const);
      items.push({
        id: data.id,
        name: data.name,
        iconId: data.iconId ?? null,
        locations: [...locations],
        mode: data.mode ?? 'click',
        display: data.display ?? 'icon_label',
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? data.createdAt ?? now,
      });
    });
    return items;
  } catch {
    return [];
  }
};

const applyReorder = (existing: AiTriggerButtonRecord[], orderedIds: string[]): AiTriggerButtonRecord[] => {
  const byId = new Map<string, AiTriggerButtonRecord>();
  existing.forEach((item: AiTriggerButtonRecord) => byId.set(item.id, item));

  const seen = new Set<string>();
  const next: AiTriggerButtonRecord[] = [];

  orderedIds.forEach((id: string) => {
    const normalized = id.trim();
    if (!normalized) return;
    if (seen.has(normalized)) return;
    const record = byId.get(normalized);
    if (!record) return;
    seen.add(normalized);
    next.push(record);
  });

  // Preserve existing relative order for any ids not present in the payload.
  existing.forEach((item: AiTriggerButtonRecord) => {
    if (seen.has(item.id)) return;
    next.push(item);
  });

  return next;
};

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireAiPathsAccess();
  const parsed = await parseJsonBody(req, reorderSchema, {
    logPrefix: 'ai-paths.trigger-buttons.reorder.POST',
  });
  if (!parsed.ok) return parsed.response;

  const orderedIds = parsed.data.orderedIds ?? [];
  if (!Array.isArray(orderedIds)) {
    throw badRequestError('orderedIds must be an array.');
  }

  const raw = await readTriggerButtonsRaw();
  const existing = parseTriggerButtons(raw);
  const next = applyReorder(existing, orderedIds);
  await writeTriggerButtonsRaw(JSON.stringify(next));
  return NextResponse.json(next);
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'ai-paths.trigger-buttons.reorder.POST' }
);
