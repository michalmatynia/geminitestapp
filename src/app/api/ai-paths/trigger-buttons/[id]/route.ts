export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId, Filter } from "mongodb"; // Added imports

import prisma from "@/shared/lib/db/prisma";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { getAppDbProvider } from "@/shared/lib/db/app-db-provider";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/shared/lib/api/parse-json";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
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
const triggerButtonDisplaySchema = z.enum(["icon", "icon_label"]);

const triggerButtonRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  // Older persisted records may miss some fields; keep parsing lenient and normalize on read.
  iconId: z.string().nullable().optional(),
  locations: z
    .preprocess(
      (value) => (typeof value === "string" ? [value] : value),
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

const updateTriggerButtonSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    iconId: z.string().trim().min(1).nullable().optional(),
    locations: z.array(triggerButtonLocationSchema).min(1).optional(),
    mode: triggerButtonModeSchema.optional(),
    display: triggerButtonDisplaySchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No updates provided",
  });

type SettingDoc = { _id?: string | ObjectId; key?: string; value?: string; createdAt?: Date; updatedAt?: Date };

const canUsePrismaSettings = (): boolean =>
  Boolean(process.env.DATABASE_URL) && "setting" in prisma;

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env.MONGODB_URI) return null;
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
      const now = new Date().toISOString();
      const locations =
        Array.isArray(data.locations) && data.locations.length > 0
          ? data.locations
          : (["product_modal"] as const);
      items.push({
        id: data.id,
        name: data.name,
        iconId: data.iconId ?? null,
        locations: [...locations],
        mode: data.mode ?? "click",
        display: data.display ?? "icon_label",
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? data.createdAt ?? now,
      });
    });
    return items;
  } catch {
    return [];
  }
};

async function PATCH_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  try {
    await requireAiPathsAccess();
    const id = params.id;
    if (!id) throw badRequestError("Missing trigger button id.");
    const parsed = await parseJsonBody(req, updateTriggerButtonSchema, {
      logPrefix: "ai-paths.trigger-buttons.PATCH",
    });
    if (!parsed.ok) return parsed.response;
    const raw = await readTriggerButtonsRaw();
    const existing = parseTriggerButtons(raw);
    const index = existing.findIndex((item: AiTriggerButtonRecord) => item.id === id);
    if (index === -1) {
      throw notFoundError("Trigger button not found.", { id });
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
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "ai-paths.trigger-buttons.PATCH",
      fallbackMessage: "Failed to update trigger button",
    });
  }
}

async function DELETE_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  try {
    await requireAiPathsAccess();
    const id = params.id;
    if (!id) throw badRequestError("Missing trigger button id.");
    const raw = await readTriggerButtonsRaw();
    const existing = parseTriggerButtons(raw);
    const next = existing.filter((item: AiTriggerButtonRecord) => item.id !== id);
    if (next.length === existing.length) {
      throw notFoundError("Trigger button not found.", { id });
    }
    await writeTriggerButtonsRaw(JSON.stringify(next));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "ai-paths.trigger-buttons.DELETE",
      fallbackMessage: "Failed to delete trigger button",
    });
  }
}

export const PATCH = apiHandlerWithParams<{ id: string }>(PATCH_handler, {
  source: "ai-paths.trigger-buttons.PATCH",
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: "ai-paths.trigger-buttons.DELETE",
});
