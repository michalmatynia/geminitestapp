import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";

export const APP_DB_PROVIDER_SETTING_KEY = "app_db_provider";

export type AppDbProvider = "prisma" | "mongodb";

const normalizeProvider = (value?: string | null): AppDbProvider | null => {
  if (!value) return null;
  return value.toLowerCase().trim() === "mongodb" ? "mongodb" : "prisma";
};

const readMongoAppProviderSetting = async (): Promise<AppDbProvider | null> => {
  if (!process.env.MONGODB_URI) return null;
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: string; key?: string; value?: string }>("settings")
      .findOne({
        $or: [
          { _id: APP_DB_PROVIDER_SETTING_KEY },
          { key: APP_DB_PROVIDER_SETTING_KEY },
        ],
      });
    return normalizeProvider(doc?.value ?? null);
  } catch {
    return null;
  }
};

const readPrismaAppProviderSetting = async (): Promise<AppDbProvider | null> => {
  if (!process.env.DATABASE_URL) return null;
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: APP_DB_PROVIDER_SETTING_KEY },
      select: { value: true },
    });
    return normalizeProvider(setting?.value ?? null);
  } catch {
    return null;
  }
};

export const getAppDbProviderSetting = async (): Promise<AppDbProvider | null> => {
  const mongoSetting = await readMongoAppProviderSetting();
  if (mongoSetting) return mongoSetting;
  const prismaSetting = await readPrismaAppProviderSetting();
  if (prismaSetting) return prismaSetting;
  if (process.env.APP_DB_PROVIDER) {
    return normalizeProvider(process.env.APP_DB_PROVIDER);
  }
  return null;
};

export const getAppDbProvider = async (): Promise<AppDbProvider> => {
  const setting = await getAppDbProviderSetting();
  if (setting === "mongodb") {
    if (process.env.MONGODB_URI) return "mongodb";
    console.warn("[app-db-provider] MONGODB_URI missing; falling back to Prisma.");
  }
  return "prisma";
};
