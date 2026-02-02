import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import prisma from "@/shared/lib/db/prisma";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { getAppDbProvider } from "@/shared/lib/db/app-db-provider";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/shared/lib/api/parse-json";
import { badRequestError } from "@/shared/errors/app-error";
import { requireAiPathsAccess } from "@/features/ai/ai-paths/server";
import type { AiTriggerButtonRecord } from "@/shared/types/ai-trigger-buttons";

const SETTINGS_COLLECTION = "settings";
const AI_PATHS_TRIGGER_BUTTONS_KEY = "ai_paths_trigger_buttons";

const triggerButtonLocationSchema = z.enum([
  "product_modal",
  "product_list",
  "note_modal",
  "note_list",
]);

const triggerButtonModeSchema = z.enum(["click", "toggle"]);

const triggerButtonRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  iconId: z.string().nullable(),
  locations: z.array(triggerButtonLocationSchema),
  mode: triggerButtonModeSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

const createTriggerButtonSchema = z.object({
  name: z.string().trim().min(1),
  iconId: z.string().trim().min(1).nullable().optional(),
  locations: z.array(triggerButtonLocationSchema).min(1),
  mode: triggerButtonModeSchema.optional().default("click"),
});

type SettingDoc = { _id?: string; key?: string; value?: string; createdAt?: Date; updatedAt?: Date };

const canUsePrismaSettings = (): boolean =>
  Boolean(process.env.DATABASE_URL) && "setting" in prisma;

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env.MONGODB_URI) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<SettingDoc>(SETTINGS_COLLECTION)
    .findOne({ $or: [{ key }, { _id: key }] });
  const value = doc?.value;
  return typeof value === "string" ? value : null;
};

const writeMongoSetting = async (key: string, value: string): Promise<boolean> => {
  if (!process.env.MONGODB_URI) return false;
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
    return typeof setting?.value === "string" ? setting.value : null;
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
  if (provider === "mongodb") {
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
    provider === "mongodb"
      ? await writeMongoSetting(AI_PATHS_TRIGGER_BUTTONS_KEY, value)
      : await writePrismaSetting(AI_PATHS_TRIGGER_BUTTONS_KEY, value);
  if (!wrote) {
    const fallback =
      provider === "mongodb"
        ? await writePrismaSetting(AI_PATHS_TRIGGER_BUTTONS_KEY, value)
        : await writeMongoSetting(AI_PATHS_TRIGGER_BUTTONS_KEY, value);
    if (!fallback) {
      throw new Error("No settings store configured for trigger buttons.");
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
      items.push({
        id: data.id,
        name: data.name,
        iconId: data.iconId ?? null,
        locations: data.locations,
        mode: data.mode,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });
    return items;
  } catch {
    return [];
  }
};

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    await requireAiPathsAccess();
    const raw = await readTriggerButtonsRaw();
    const triggerButtons = parseTriggerButtons(raw);
    return NextResponse.json(triggerButtons);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "ai-paths.trigger-buttons.GET",
      fallbackMessage: "Failed to fetch trigger buttons",
    });
  }
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    await requireAiPathsAccess();
    const parsed = await parseJsonBody(req, createTriggerButtonSchema, {
      logPrefix: "ai-paths.trigger-buttons.POST",
    });
    if (!parsed.ok) return parsed.response;

    const { name, iconId, locations, mode } = parsed.data;
    const raw = await readTriggerButtonsRaw();
    const existing = parseTriggerButtons(raw);
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw badRequestError("Name is required.");
    }

    const now = new Date().toISOString();
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `trigger_${Math.random().toString(36).slice(2, 10)}`;

    const record: AiTriggerButtonRecord = {
      id,
      name: normalizedName,
      iconId: iconId ? iconId.trim() : null,
      locations,
      mode,
      createdAt: now,
      updatedAt: now,
    };

    const next = [...existing, record];
    await writeTriggerButtonsRaw(JSON.stringify(next));
    return NextResponse.json(record);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "ai-paths.trigger-buttons.POST",
      fallbackMessage: "Failed to create trigger button",
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: "ai-paths.trigger-buttons.GET" }
);

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: "ai-paths.trigger-buttons.POST" }
);

