import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";

export const AUTH_DB_PROVIDER_SETTING_KEY = "auth_db_provider";

type AuthDbProvider = "prisma" | "mongodb";

const normalizeProvider = (value?: string | null): AuthDbProvider =>
  value && value.toLowerCase().trim() === "mongodb" ? "mongodb" : "prisma";

const readMongoAuthProviderSetting = async (): Promise<string | null> => {
  if (!process.env.MONGODB_URI) return null;
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: string; key?: string; value?: string }>("settings")
      .findOne({
        $or: [
          { _id: AUTH_DB_PROVIDER_SETTING_KEY },
          { key: AUTH_DB_PROVIDER_SETTING_KEY },
        ],
      });
    return typeof doc?.value === "string" ? doc.value : null;
  } catch {
    return null;
  }
};

export const getAuthDataProvider = async (): Promise<AuthDbProvider> => {
  const mongoSetting = await readMongoAuthProviderSetting();
  if (mongoSetting) {
    return normalizeProvider(mongoSetting);
  }
  const hasPrisma = Boolean(process.env.DATABASE_URL);
  const hasMongo = Boolean(process.env.MONGODB_URI);
  if (hasPrisma) {
    try {
      const setting = await prisma.setting.findUnique({
        where: { key: AUTH_DB_PROVIDER_SETTING_KEY },
        select: { value: true },
      });
      if (setting?.value) {
        return normalizeProvider(setting.value);
      }
    } catch {
      // Ignore Prisma lookup errors and fall through to env/defaults.
    }
  }
  if (process.env.AUTH_DB_PROVIDER) {
    return normalizeProvider(process.env.AUTH_DB_PROVIDER);
  }
  if (!hasPrisma) {
    return hasMongo ? "mongodb" : "prisma";
  }
  return "prisma";
};
