import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { WithId } from "mongodb";

import prisma from "@/shared/lib/db/prisma";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { APP_DB_PROVIDER_SETTING_KEY, getAppDbProvider } from "@/shared/lib/db/app-db-provider";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { internalError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { ErrorSystem } from "@/features/observability/server";

const shouldLog = () => process.env.DEBUG_SETTINGS === "true";

type SettingRecord = { key: string; value: string };

type SettingDocument = {
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
};

const SETTINGS_COLLECTION = "settings";
const productSettingKeys = new Set([
  APP_DB_PROVIDER_SETTING_KEY,
  "ai_vision_model",
  "ai_vision_user_prompt",
  "ai_vision_prompt",
  "ai_vision_output_enabled",
  "openai_model",
  "description_generation_user_prompt",
  "description_generation_prompt",
  "ai_generation_output_enabled",
  "ai_description_test_product_id",
]);

const isProductSettingKey = (key: string) => productSettingKeys.has(key);

const canUsePrismaSettings = (provider: "prisma" | "mongodb") =>
  provider === "prisma" && Boolean(process.env.DATABASE_URL) && "setting" in prisma;

const settingSchema = z.object({
  key: z.string().trim().min(1),
  value: z.string(),
});

const listMongoSettings = async (): Promise<SettingRecord[]> => {
  if (!process.env.MONGODB_URI) return [];
  const mongo = await getMongoDb();
  const docs = await mongo
    .collection<SettingDocument>(SETTINGS_COLLECTION)
    .find({})
    .toArray();
  return docs
    .map((doc: WithId<SettingDocument>) => ({ key: doc.key ?? String(doc._id), value: doc.value }))
    .filter((doc: SettingRecord) => typeof doc.key === "string" && typeof doc.value === "string");
};

const upsertMongoSetting = async (
  key: string,
  value: string
): Promise<SettingRecord | null> => {
  if (!process.env.MONGODB_URI) return null;
  const mongo = await getMongoDb();
  const now = new Date();
  await mongo.collection<SettingDocument>(SETTINGS_COLLECTION).updateOne(
    { key },
    {
      $set: { value, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  return { key, value };
};

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  if (shouldLog()) {
    await ErrorSystem.logInfo("[settings] GET /api/settings", { service: "api/settings" });
  }
  try {
    const provider = await getAppDbProvider();
    const prismaSettings: SettingRecord[] = [];
    if (canUsePrismaSettings(provider)) {
      const settings = await prisma.setting.findMany({
        select: { key: true, value: true },
      });
      prismaSettings.push(...settings);
    }
    const mongoSettings = await listMongoSettings();
    const settingsMap = new Map<string, SettingRecord>();
    if (provider === "mongodb") {
      mongoSettings.forEach((setting: SettingRecord) => {
        settingsMap.set(setting.key, setting);
      });
    } else {
      prismaSettings.forEach((setting: SettingRecord) => {
        settingsMap.set(setting.key, setting);
      });
      mongoSettings.forEach((setting: SettingRecord) => {
        const shouldOverride =
          isProductSettingKey(setting.key) || !settingsMap.has(setting.key);
        if (shouldOverride) {
          settingsMap.set(setting.key, setting);
        }
      });
    }
    const settings = Array.from(settingsMap.values());
    if (shouldLog()) {
      await ErrorSystem.logInfo("[settings] fetched", {
        service: "api/settings",
        count: settings.length,
        keys: settings.map((setting: SettingRecord) => setting.key),
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: "api/settings",
      method: "GET",
    });
    return createErrorResponse(error, {
      request: req,
      source: "settings.GET",
      fallbackMessage: "Failed to fetch settings",
    });
  }
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  if (shouldLog()) {
    await ErrorSystem.logInfo("[settings] POST /api/settings", { service: "api/settings" });
  }
  try {
    const parsed = await parseJsonBody(req, settingSchema, {
      logPrefix: "settings.POST",
    });
    if (!parsed.ok) {
      return parsed.response as Response;
    }
    const { key, value } = parsed.data;
    if (shouldLog()) {
      await ErrorSystem.logInfo("[settings] upserting", { service: "api/settings", key, valuePreview: value.slice(0, 40) });
    }
    const provider = await getAppDbProvider();
    const shouldWriteMongo =
      Boolean(process.env.MONGODB_URI) &&
      (provider === "mongodb" || isProductSettingKey(key) || !canUsePrismaSettings(provider));
    const [prismaSetting, mongoSetting] = await Promise.all([
      canUsePrismaSettings(provider)
        ? prisma.setting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
            select: { key: true, value: true },
          })
        : Promise.resolve(null),
      shouldWriteMongo ? upsertMongoSetting(key, value) : Promise.resolve(null),
    ]);
    const setting = prismaSetting ?? mongoSetting;
    if (!setting) {
      return createErrorResponse(
        internalError("No settings store configured"),
        { request: req, source: "settings.POST" }
      );
    }
    if (shouldLog()) {
      await ErrorSystem.logInfo("[settings] saved", { service: "api/settings", key: setting.key });
    }
    return NextResponse.json(setting);
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: "api/settings",
      method: "POST",
    });
    return createErrorResponse(error, {
      request: req,
      source: "settings.POST",
      fallbackMessage: "Failed to save setting",
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "settings.GET" });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "settings.POST" });
