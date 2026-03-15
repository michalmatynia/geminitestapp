
import type { MongoTimestampedStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const SETTINGS_COLLECTION = 'settings';
const CENTRAL_LOG_DEAD_LETTER_STORE_VERSION = 1;
const DEFAULT_MAX_ENTRIES = 200;

export const CENTRAL_LOG_DEAD_LETTER_SETTINGS_KEY = 'observability_central_log_dead_letters_v1';

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
  } catch (error) {
    logClientError(error);
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
  } catch (error) {
    logClientError(error);
    return null;
  }
};

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<MongoTimestampedStringSettingRecord<string, Date>>(SETTINGS_COLLECTION)
      .findOne({ $or: [{ _id: key }, { key }] }, { projection: { value: 1 } });
    return typeof doc?.value === 'string' ? doc.value : null;
  } catch (error) {
    logClientError(error);
    return null;
  }
};

const writeMongoSetting = async (key: string, value: string): Promise<boolean> => {
  if (!process.env['MONGODB_URI']) return false;
  try {
    const mongo = await getMongoDb();
    const now = new Date();
    await mongo
      .collection<MongoTimestampedStringSettingRecord<string, Date>>(SETTINGS_COLLECTION)
      .updateOne(
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
  } catch (error) {
    logClientError(error);
    return false;
  }
};

const readSettingByProviderPriority = async (key: string): Promise<string | null> =>
  readMongoSetting(key);

const writeSettingByProviderPriority = async (key: string, value: string): Promise<boolean> =>
  writeMongoSetting(key, value);

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
