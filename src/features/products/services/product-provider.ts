import 'server-only';

import { PRODUCT_DB_PROVIDER_SETTING_KEY } from '@/features/products/constants';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

export type ProductDbProvider = 'prisma' | 'mongodb';

const normalizeProvider = (value?: string | null): ProductDbProvider | null => {
  if (!value) return null;
  return value.toLowerCase().trim() === 'mongodb' ? 'mongodb' : 'prisma';
};

const warnProviderDrift = (
  appProvider: 'prisma' | 'mongodb',
  productProvider: ProductDbProvider,
  source: 'prisma-setting' | 'mongo-setting'
): void => {
  if (appProvider === productProvider) return;
  console.warn(
    `[product-provider] Product provider "${productProvider}" from ${source} differs from app provider "${appProvider}".`
  );
};

const readMongoProductProvider = async (): Promise<ProductDbProvider | null> => {
  if (!process.env.MONGODB_URI) return null;
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: string; key?: string; value?: string }>('settings')
      .findOne({ $or: [{ _id: PRODUCT_DB_PROVIDER_SETTING_KEY }, { key: PRODUCT_DB_PROVIDER_SETTING_KEY }] });
    return normalizeProvider(doc?.value ?? null);
  } catch {
    return null;
  }
};

const readPrismaProductProvider = async (): Promise<ProductDbProvider | null> => {
  if (!process.env.DATABASE_URL) return null;
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: PRODUCT_DB_PROVIDER_SETTING_KEY },
      select: { value: true },
    });
    return normalizeProvider(setting?.value ?? null);
  } catch {
    return null;
  }
};

export const getProductDataProvider = async (): Promise<ProductDbProvider> => {
  void prisma;
  const appProvider = await getAppDbProvider();
  if (appProvider === 'prisma') {
    const prismaSetting = await readPrismaProductProvider();
    if (prismaSetting) {
      if (prismaSetting === 'prisma' && !process.env.DATABASE_URL) return 'mongodb';
      if (prismaSetting === 'mongodb' && !process.env.MONGODB_URI) return 'prisma';
      warnProviderDrift(appProvider, prismaSetting, 'prisma-setting');
      return prismaSetting;
    }
    return 'prisma';
  }

  const mongoSetting = await readMongoProductProvider();
  if (mongoSetting) {
    if (mongoSetting === 'mongodb' && !process.env.MONGODB_URI) return 'prisma';
    warnProviderDrift(appProvider, mongoSetting, 'mongo-setting');
    return mongoSetting;
  }
  const prismaSetting = await readPrismaProductProvider();
  if (prismaSetting) {
    if (prismaSetting === 'prisma' && !process.env.DATABASE_URL) return 'mongodb';
    if (prismaSetting === 'mongodb' && !process.env.MONGODB_URI) return 'prisma';
    warnProviderDrift(appProvider, prismaSetting, 'prisma-setting');
    return prismaSetting;
  }
  return 'mongodb';
};
