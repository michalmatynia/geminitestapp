import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";

export const PRODUCT_DB_PROVIDER_SETTING_KEY = "product_db_provider";

type ProductDbProvider = "prisma" | "mongodb";

const normalizeProvider = (value?: string | null): ProductDbProvider =>
  value && value.toLowerCase().trim() === "mongodb" ? "mongodb" : "prisma";

const readMongoProductProviderSetting = async (): Promise<string | null> => {
  if (!process.env.MONGODB_URI) return null;
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: string; key?: string; value?: string }>("settings")
      .findOne({
        $or: [
          { _id: PRODUCT_DB_PROVIDER_SETTING_KEY },
          { key: PRODUCT_DB_PROVIDER_SETTING_KEY },
        ],
      });
    return typeof doc?.value === "string" ? doc.value : null;
  } catch {
    return null;
  }
};

export const getProductDataProvider = async (): Promise<ProductDbProvider> => {
  if (process.env.PRODUCT_DB_PROVIDER) {
    return normalizeProvider(process.env.PRODUCT_DB_PROVIDER);
  }
  const mongoSetting = await readMongoProductProviderSetting();
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
      where: { key: PRODUCT_DB_PROVIDER_SETTING_KEY },
      select: { value: true },
    });
    return normalizeProvider(setting?.value ?? null);
  } catch {
    return "prisma";
  }
};
