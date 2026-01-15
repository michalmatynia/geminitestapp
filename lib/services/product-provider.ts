import prisma from "@/lib/prisma";

export const PRODUCT_DB_PROVIDER_SETTING_KEY = "product_db_provider";

type ProductDbProvider = "prisma" | "mongodb";

const normalizeProvider = (value?: string | null): ProductDbProvider =>
  value && value.toLowerCase().trim() === "mongodb" ? "mongodb" : "prisma";

export const getProductDataProvider = async (): Promise<ProductDbProvider> => {
  if (process.env.PRODUCT_DB_PROVIDER) {
    return normalizeProvider(process.env.PRODUCT_DB_PROVIDER);
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
