import { Prisma } from '@prisma/client';

import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

const SETTINGS_COLLECTION = 'settings';
const CENTRAL_LOG_DEAD_LETTER_STORE_VERSION = 1;
const DEFAULT_MAX_ENTRIES = 200;

export const CENTRAL_LOG_DEAD_LETTER_SETTINGS_KEY = 'observability_central_log_dead_letters_v1';

type SettingDocument = {
  _id?: string;
  key?: string;
  value?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CentralLogDeadLetterStoredEntry = {
  payload: Record<string, unknown>;
  queuedAt: string;
  lastError: string;
  retryCount: number;
};

type CentralLogDeadLetterEnvelope = {
  version: number;
  updatedAt: string;
  entries: CentralLogDeadLetterStoredEntry[];
};

const canUsePrismaSettings = (): boolean =>
  Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;

const isPrismaMissingTableError = (error: unknown): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === 'P2021' || error.code === 'P2022');

const resolveMaxEntries = (value: number | undefined): number => {
  if (!Number.isFinite(value)) return DEFAULT_MAX_ENTRIES;
  const normalized = Math.floor(value ?? DEFAULT_MAX_ENTRIES);
  if (normalized <= 0) return DEFAULT_MAX_ENTRIES;
  return Math.min(normalized, 1000);
};

const normalizeStoredEntry = (value: unknown): CentralLogDeadLetterStoredEntry | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entry = value as Record<string, unknown>;
  const payload = entry['payload'];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const queuedAt =
    typeof entry['queuedAt'] === 'string' && entry['queuedAt'].trim().length > 0
      ? entry['queuedAt'].trim()
      : new Date().toISOString();
  const lastError =
    typeof entry['lastError'] === 'string' && entry['lastError'].trim().length > 0
      ? entry['lastError'].trim()
      : 'unknown_forward_error';
  const retryCountRaw =
    typeof entry['retryCount'] === 'number' ? entry['retryCount'] : Number(entry['retryCount']);
  const retryCount =
    Number.isFinite(retryCountRaw) && retryCountRaw > 0 ? Math.floor(retryCountRaw) : 1;

  return {
    payload: payload as Record<string, unknown>,
    queuedAt,
    lastError,
    retryCount,
  };
};

const normalizeEntries = (
  entries: unknown[],
  maxEntries: number
): CentralLogDeadLetterStoredEntry[] =>
  entries
    .map((entry) => normalizeStoredEntry(entry))
    .filter((entry): entry is CentralLogDeadLetterStoredEntry => entry !== null)
    .slice(-maxEntries);

const parseStoredEntries = (
  raw: string | null,
  maxEntries: number
): CentralLogDeadLetterStoredEntry[] => {
  if (!raw || raw.trim().length === 0) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return normalizeEntries(parsed, maxEntries);
    }
    if (!parsed || typeof parsed !== 'object') return [];
    const envelope = parsed as Partial<CentralLogDeadLetterEnvelope> & {
      entries?: unknown;
    };
    if (!Array.isArray(envelope.entries)) return [];
    return normalizeEntries(envelope.entries, maxEntries);
  } catch {
    return [];
  }
};

const stringifyEntries = (
  entries: CentralLogDeadLetterStoredEntry[],
  maxEntries: number
): string | null => {
  try {
    const payload: CentralLogDeadLetterEnvelope = {
      version: CENTRAL_LOG_DEAD_LETTER_STORE_VERSION,
      updatedAt: new Date().toISOString(),
      entries: normalizeEntries(entries, maxEntries),
    };
    return JSON.stringify(payload);
  } catch {
    return null;
  }
};

const readPrismaSetting = async (key: string): Promise<string | null> => {
  if (!canUsePrismaSettings()) return null;
  try {
    const setting = await prisma.setting.findUnique({
      where: { key },
      select: { value: true },
    });
    return setting?.value ?? null;
  } catch (error) {
    if (isPrismaMissingTableError(error)) return null;
    return null;
  }
};

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<SettingDocument>(SETTINGS_COLLECTION)
      .findOne({ $or: [{ _id: key }, { key }] }, { projection: { value: 1 } });
    return typeof doc?.value === 'string' ? doc.value : null;
  } catch {
    return null;
  }
};

const writePrismaSetting = async (key: string, value: string): Promise<boolean> => {
  if (!canUsePrismaSettings()) return false;
  try {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    return true;
  } catch (error) {
    if (isPrismaMissingTableError(error)) return false;
    return false;
  }
};

const writeMongoSetting = async (key: string, value: string): Promise<boolean> => {
  if (!process.env['MONGODB_URI']) return false;
  try {
    const mongo = await getMongoDb();
    const now = new Date();
    await mongo.collection<SettingDocument>(SETTINGS_COLLECTION).updateOne(
      { $or: [{ _id: key }, { key }] },
      {
        $set: {
          key,
          value,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: key,
          createdAt: now,
        },
      },
      { upsert: true }
    );
    return true;
  } catch {
    return false;
  }
};

const readSettingByProviderPriority = async (key: string): Promise<string | null> => {
  const provider = await Promise.resolve(getAppDbProvider()).catch(() => null);
  if (provider === 'mongodb') {
    const mongoValue = await readMongoSetting(key);
    if (mongoValue !== null) return mongoValue;
    return readPrismaSetting(key);
  }
  const prismaValue = await readPrismaSetting(key);
  if (prismaValue !== null) return prismaValue;
  return readMongoSetting(key);
};

const writeSettingByProviderPriority = async (key: string, value: string): Promise<boolean> => {
  const provider = await Promise.resolve(getAppDbProvider()).catch(() => null);
  if (provider === 'mongodb') {
    const mongoOk = await writeMongoSetting(key, value);
    if (mongoOk) return true;
    return writePrismaSetting(key, value);
  }
  const prismaOk = await writePrismaSetting(key, value);
  if (prismaOk) return true;
  return writeMongoSetting(key, value);
};

export const loadCentralLogDeadLetters = async (options?: {
  maxEntries?: number;
}): Promise<CentralLogDeadLetterStoredEntry[]> => {
  const maxEntries = resolveMaxEntries(options?.maxEntries);
  const raw = await readSettingByProviderPriority(CENTRAL_LOG_DEAD_LETTER_SETTINGS_KEY);
  return parseStoredEntries(raw, maxEntries);
};

export const saveCentralLogDeadLetters = async (
  entries: CentralLogDeadLetterStoredEntry[],
  options?: {
    maxEntries?: number;
  }
): Promise<boolean> => {
  const maxEntries = resolveMaxEntries(options?.maxEntries);
  const serialized = stringifyEntries(entries, maxEntries);
  if (!serialized) return false;
  return writeSettingByProviderPriority(CENTRAL_LOG_DEAD_LETTER_SETTINGS_KEY, serialized);
};
