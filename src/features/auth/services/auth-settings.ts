import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { AUTH_SETTINGS_KEYS } from "@/features/auth/utils/auth-management";
import { parseJsonSetting } from "@/shared/utils/settings-json";
import {
  DEFAULT_AUTH_USER_PAGE_SETTINGS,
  type AuthUserPageSettings,
} from "@/features/auth/utils/auth-user-pages";
import { MongoSettingRecord } from "@/shared/types/base-types";

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env.MONGODB_URI) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoSettingRecord>("settings")
    .findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === "string" ? doc.value : null;
};

const readSettingValue = async (key: string): Promise<string | null> => {
  return readMongoSetting(key);
};

export const getAuthUserPageSettings = async (): Promise<AuthUserPageSettings> => {
  const stored = await readSettingValue(AUTH_SETTINGS_KEYS.userPages);
  if (!stored) return DEFAULT_AUTH_USER_PAGE_SETTINGS;
  return parseJsonSetting<AuthUserPageSettings>(
    stored,
    DEFAULT_AUTH_USER_PAGE_SETTINGS
  );
};
