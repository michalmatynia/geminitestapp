import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";
import { PRODUCT_DB_PROVIDER_SETTING_KEY } from "@/lib/services/product-provider";

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
const productSettingKeys = new Set([PRODUCT_DB_PROVIDER_SETTING_KEY]);

const canUsePrismaSettings = () =>
  Boolean(process.env.DATABASE_URL) && "setting" in prisma;

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

export async function GET() {
  if (shouldLog()) {
    console.log("[settings] GET /api/settings");
  }
  try {
    const prismaSettings: SettingRecord[] = [];
    if (canUsePrismaSettings()) {
      const settings = await prisma.setting.findMany({
        select: { key: true, value: true },
      });
      prismaSettings.push(...settings);
    }
    const mongoSettings = await listMongoSettings();
    const settingsMap = new Map<string, SettingRecord>();
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
    const settings = Array.from(settingsMap.values());
    if (shouldLog()) {
      console.log("[settings] fetched", {
        count: settings.length,
        keys: settings.map((setting) => setting.key),
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[settings] failed to fetch", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (shouldLog()) {
    console.log("[settings] POST /api/settings");
  }
  try {
    const { key, value } = (await req.json()) as SettingRecord;
    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { error: "Setting key is required" },
        { status: 400 }
      );
    }
    if (typeof value !== "string") {
      return NextResponse.json(
        { error: "Setting value must be a string" },
        { status: 400 }
      );
    }
    if (shouldLog()) {
      console.log("[settings] upserting", { key, valuePreview: value.slice(0, 40) });
    }
    const shouldWriteMongo =
      Boolean(process.env.MONGODB_URI) &&
      (productSettingKeys.has(key) || !canUsePrismaSettings());
    const [prismaSetting, mongoSetting] = await Promise.all([
      canUsePrismaSettings()
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
      return NextResponse.json(
        { error: "No settings store configured" },
        { status: 500 }
      );
    }
    if (shouldLog()) {
      console.log("[settings] saved", { key: setting.key });
    }
    return NextResponse.json(setting);
  } catch (error) {
    console.error("[settings] failed to save", error);
    return NextResponse.json(
      { error: "Failed to save setting" },
      { status: 500 }
    );
  }
}
