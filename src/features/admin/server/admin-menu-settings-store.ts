import 'server-only';

import { MongoClient, type Db, type MongoClientOptions } from 'mongodb';

import { configurationError } from '@/shared/errors/app-error';
import type {
  MongoPersistedStringSettingDocument,
  MongoStringSettingRecord,
} from '@/shared/contracts/settings';
import { decodeSettingValue, encodeSettingValue } from '@/shared/lib/settings/settings-compression';

const SETTINGS_COLLECTION = 'settings';

export const ADMIN_MENU_SETTING_KEYS = [
  'admin_menu_favorites',
  'admin_menu_section_colors',
  'admin_menu_custom_enabled',
  'admin_menu_custom_nav',
] as const;

const ADMIN_MENU_SETTING_KEY_SET = new Set<string>(ADMIN_MENU_SETTING_KEYS);

type AdminMenuSettingKey = (typeof ADMIN_MENU_SETTING_KEYS)[number];
type LocalAppMongoConfig = {
  dbName: string;
  uri: string;
};

type AdminMenuSettingsGlobalState = {
  __adminMenuLocalMongoClientByKey?: Map<string, MongoClient>;
  __adminMenuLocalMongoClientPromiseByKey?: Map<string, Promise<MongoClient>>;
};

const globalForAdminMenuSettings = globalThis as typeof globalThis & AdminMenuSettingsGlobalState;

export const isAdminMenuSettingKey = (key: string): key is AdminMenuSettingKey =>
  ADMIN_MENU_SETTING_KEY_SET.has(key);

const getClientByKeyStore = (): Map<string, MongoClient> => {
  if (!globalForAdminMenuSettings.__adminMenuLocalMongoClientByKey) {
    globalForAdminMenuSettings.__adminMenuLocalMongoClientByKey = new Map<string, MongoClient>();
  }
  return globalForAdminMenuSettings.__adminMenuLocalMongoClientByKey;
};

const getClientPromiseByKeyStore = (): Map<string, Promise<MongoClient>> => {
  if (!globalForAdminMenuSettings.__adminMenuLocalMongoClientPromiseByKey) {
    globalForAdminMenuSettings.__adminMenuLocalMongoClientPromiseByKey =
      new Map<string, Promise<MongoClient>>();
  }
  return globalForAdminMenuSettings.__adminMenuLocalMongoClientPromiseByKey;
};

const parseDbNameFromUri = (uri: string): string | null => {
  try {
    const pathname = new URL(uri).pathname.replace(/^\/+/, '').trim();
    return pathname.length > 0 ? decodeURIComponent(pathname) : null;
  } catch {
    return null;
  }
};

const isLocalMongoUri = (uri: string): boolean => {
  try {
    const hostname = new URL(uri).hostname.trim().toLowerCase();
    return hostname === '127.0.0.1' || hostname === 'localhost';
  } catch {
    return uri.includes('127.0.0.1') || uri.includes('localhost');
  }
};

const isSingleNodeLocalMongoUri = (uri: string): boolean => {
  try {
    const parsed = new URL(uri);
    return isLocalMongoUri(uri) && !parsed.searchParams.has('replicaSet');
  } catch {
    return isLocalMongoUri(uri);
  }
};

const resolveLocalAppMongoConfig = (): LocalAppMongoConfig => {
  const explicitLocalUri = process.env['MONGODB_LOCAL_URI']?.trim() ?? '';
  const activeUri = process.env['MONGODB_URI']?.trim() ?? '';
  const uri = explicitLocalUri || (activeUri && isLocalMongoUri(activeUri) ? activeUri : '');

  if (!uri) {
    throw configurationError(
      'Admin menu settings require the geminitestapp local MongoDB source. Set MONGODB_LOCAL_URI.'
    );
  }

  return {
    uri,
    dbName:
      process.env['MONGODB_LOCAL_DB']?.trim() ||
      parseDbNameFromUri(uri) ||
      'app',
  };
};

const getMongoClientOptions = (uri: string): MongoClientOptions => ({
  maxPoolSize: 5,
  minPoolSize: 0,
  serverSelectionTimeoutMS: 5_000,
  connectTimeoutMS: 5_000,
  socketTimeoutMS: 60_000,
  retryWrites: true,
  ...(isSingleNodeLocalMongoUri(uri) ? { directConnection: true } : {}),
});

const getAdminMenuLocalMongoClient = async (): Promise<MongoClient> => {
  const config = resolveLocalAppMongoConfig();
  const cacheKey = `${config.uri}::${config.dbName}`;
  const clients = getClientByKeyStore();
  const promises = getClientPromiseByKeyStore();
  const cached = clients.get(cacheKey);
  if (cached) return cached;

  if (!promises.has(cacheKey)) {
    promises.set(cacheKey, new MongoClient(config.uri, getMongoClientOptions(config.uri)).connect());
  }

  try {
    const client = await promises.get(cacheKey)!;
    clients.set(cacheKey, client);
    return client;
  } catch (error) {
    promises.delete(cacheKey);
    throw error;
  }
};

const getAdminMenuLocalMongoDb = async (): Promise<Db> => {
  const config = resolveLocalAppMongoConfig();
  const client = await getAdminMenuLocalMongoClient();
  return client.db(config.dbName);
};

const toSettingRecord = (doc: MongoStringSettingRecord | null): { key: string; value: string } | null => {
  if (!doc) return null;
  const key = doc.key ?? (typeof doc._id === 'string' ? doc._id : '');
  if (!key || !isAdminMenuSettingKey(key) || typeof doc.value !== 'string') return null;
  return { key, value: decodeSettingValue(key, doc.value) };
};

export const listAdminMenuSettingsFromLocalAppDb = async (
  keys: readonly string[] = ADMIN_MENU_SETTING_KEYS
): Promise<Array<{ key: string; value: string }>> => {
  const adminKeys = keys.filter(isAdminMenuSettingKey);
  if (adminKeys.length === 0) return [];
  const mongo = await getAdminMenuLocalMongoDb();
  const docs = await mongo
    .collection<MongoStringSettingRecord>(SETTINGS_COLLECTION)
    .find(
      { $or: [{ key: { $in: adminKeys } }, { _id: { $in: adminKeys } }] },
      { projection: { _id: 1, key: 1, value: 1 } }
    )
    .toArray();

  return docs
    .map(toSettingRecord)
    .filter((record): record is { key: string; value: string } => record !== null);
};

export const readAdminMenuSettingFromLocalAppDb = async (
  key: string
): Promise<string | null> => {
  if (!isAdminMenuSettingKey(key)) return null;
  const mongo = await getAdminMenuLocalMongoDb();
  const doc = await mongo
    .collection<MongoStringSettingRecord>(SETTINGS_COLLECTION)
    .findOne(
      { $or: [{ key }, { _id: key }] },
      { projection: { _id: 1, key: 1, value: 1 } }
    );
  return toSettingRecord(doc)?.value ?? null;
};

export const upsertAdminMenuSettingInLocalAppDb = async (
  key: string,
  value: string
): Promise<{ key: string; value: string } | null> => {
  if (!isAdminMenuSettingKey(key)) return null;
  const mongo = await getAdminMenuLocalMongoDb();
  const now = new Date();
  const encodedValue = encodeSettingValue(key, value);
  await mongo.collection<MongoPersistedStringSettingDocument>(SETTINGS_COLLECTION).updateOne(
    { key },
    {
      $set: { key, value: encodedValue, updatedAt: now },
      $setOnInsert: { _id: key, createdAt: now },
    },
    { upsert: true }
  );
  return { key, value: encodedValue };
};
