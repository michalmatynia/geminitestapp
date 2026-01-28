import prisma from "@/shared/lib/db/prisma";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { AUTH_SETTINGS_KEYS } from "@/features/auth/utils/auth-management";
import { parseJsonSetting } from "@/shared/utils/settings-json";
import {
  DEFAULT_AUTH_USER_PAGE_SETTINGS,
  type AuthUserPageSettings,
} from "@/features/auth/utils/auth-user-pages";
import { getAppDbProvider } from "@/shared/lib/db/app-db-provider";

type SettingRecord = { _id: string; key: string; value: string };

const canUsePrismaSettings = () =>
  Boolean(process.env.DATABASE_URL) && "setting" in prisma;

const readPrismaSetting = async (key: string): Promise<string | null> => {
  if (!canUsePrismaSettings()) return null;
  const setting = await prisma.setting.findUnique({
    where: { key },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env.MONGODB_URI) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<SettingRecord>("settings")
    .findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === "string" ? doc.value : null;
};

const readSettingValue = async (key: string): Promise<string | null> => {
  const provider = await getAppDbProvider();
  if (provider === "mongodb") {
    return (await readMongoSetting(key)) ?? (await readPrismaSetting(key));
  }
  return (await readPrismaSetting(key)) ?? (await readMongoSetting(key));
};

export const getAuthUserPageSettings = async (): Promise<AuthUserPageSettings> => {
  const stored = await readSettingValue(AUTH_SETTINGS_KEYS.userPages);
  if (!stored) return DEFAULT_AUTH_USER_PAGE_SETTINGS;
  return parseJsonSetting<AuthUserPageSettings>(
    stored,
    DEFAULT_AUTH_USER_PAGE_SETTINGS
  );
};
