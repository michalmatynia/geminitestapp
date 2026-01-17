import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";

export const INTEGRATION_DB_PROVIDER_SETTING_KEY = "integration_db_provider";

type IntegrationDbProvider = "prisma" | "mongodb";

const normalizeProvider = (value?: string | null): IntegrationDbProvider =>
  value && value.toLowerCase().trim() === "mongodb" ? "mongodb" : "prisma";

const readMongoIntegrationProviderSetting = async (): Promise<string | null> => {
  if (!process.env.MONGODB_URI) return null;
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: string; key?: string; value?: string }>("settings")
      .findOne({
        $or: [
          { _id: INTEGRATION_DB_PROVIDER_SETTING_KEY },
          { key: INTEGRATION_DB_PROVIDER_SETTING_KEY },
        ],
      });
    return typeof doc?.value === "string" ? doc.value : null;
  } catch {
    return null;
  }
};

export const getIntegrationDataProvider = async (): Promise<IntegrationDbProvider> => {
  if (process.env.INTEGRATION_DB_PROVIDER) {
    return normalizeProvider(process.env.INTEGRATION_DB_PROVIDER);
  }
  const mongoSetting = await readMongoIntegrationProviderSetting();
  if (mongoSetting) {
    return normalizeProvider(mongoSetting);
  }
  const hasPrisma = Boolean(process.env.DATABASE_URL);
  const hasMongo = Boolean(process.env.MONGODB_URI);
  if (!hasPrisma) {
    return hasMongo ? "mongodb" : "prisma";
  }
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: INTEGRATION_DB_PROVIDER_SETTING_KEY },
      select: { value: true },
    });
    return normalizeProvider(setting?.value ?? null);
  } catch {
    return "prisma";
  }
};
