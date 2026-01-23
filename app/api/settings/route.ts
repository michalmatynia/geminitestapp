import { NextResponse } from "next/server";
import { z } from "zod";

import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";
import { APP_DB_PROVIDER_SETTING_KEY, getAppDbProvider } from "@/lib/services/app-db-provider";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { parseJsonBody } from "@/lib/api/parse-json";
import { internalError } from "@/lib/errors/app-error";

const shouldLog = () => process.env.DEBUG_SETTINGS === "true";

type SettingRecord = { key: string; value: string };

type SettingDocument = {
  _id: string;
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
    .map((doc) => ({ key: doc.key ?? doc._id, value: doc.value }))
    .filter((doc) => typeof doc.key === "string" && typeof doc.value === "string");
};

const upsertMongoSetting = async (
  key: string,
  value: string
): Promise<SettingRecord | null> => {
  if (!process.env.MONGODB_URI) return null;
  const mongo = await getMongoDb();
  const now = new Date();
  await mongo.collection<SettingDocument>(SETTINGS_COLLECTION).updateOne(
    { _id: key },
    {
      $set: { key, value, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  return { key, value };
};

export async function GET(req: Request) {
  if (shouldLog()) {
    console.log("[settings] GET /api/settings");
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
      mongoSettings.forEach((setting) => {
        settingsMap.set(setting.key, setting);
      });
    } else {
      prismaSettings.forEach((setting) => {
        settingsMap.set(setting.key, setting);
      });
      mongoSettings.forEach((setting) => {
        const shouldOverride =
          productSettingKeys.has(setting.key) || !settingsMap.has(setting.key);
        if (shouldOverride) {
          settingsMap.set(setting.key, setting);
        }
      });
    }
    const settings = Array.from(settingsMap.values());
    if (shouldLog()) {
      console.log("[settings] fetched", {
        count: settings.length,
        keys: settings.map((setting) => setting.key),
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "settings.GET",
      fallbackMessage: "Failed to fetch settings",
    });
  }
}

export async function POST(req: Request) {
  if (shouldLog()) {
    console.log("[settings] POST /api/settings");
  }
  try {
    const parsed = await parseJsonBody(req, settingSchema, {
      logPrefix: "settings.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const { key, value } = parsed.data;
    if (shouldLog()) {
      console.log("[settings] upserting", { key, valuePreview: value.slice(0, 40) });
    }
    const provider = await getAppDbProvider();
    const shouldWriteMongo =
      Boolean(process.env.MONGODB_URI) &&
      (provider === "mongodb" || productSettingKeys.has(key) || !canUsePrismaSettings(provider));
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
      console.log("[settings] saved", { key: setting.key });
    }
    return NextResponse.json(setting);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "settings.POST",
      fallbackMessage: "Failed to save setting",
    });
  }
}
