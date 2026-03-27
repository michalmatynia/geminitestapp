import 'server-only';

import type { MongoStringSettingRecord } from '@/shared/contracts/settings';

import { findProviderForKey } from '@/shared/lib/db/settings-registry';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const SECRET_CACHE_TTL_MS = 60_000;
const secretCache = new Map<string, { value: string | null; fetchedAt: number }>();

const normalizeSecretValue = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readMongoSecretSettingValues = async (
  keys: readonly string[]
): Promise<Map<string, string | null>> => {
  const values = new Map<string, string | null>(keys.map((key) => [key, null]));
  if (keys.length === 0 || !process.env['MONGODB_URI']) {
    return values;
  }

  const mongo = await getMongoDb();
  const docs = await mongo
    .collection<MongoStringSettingRecord>('settings')
    .find({
      $or: keys.flatMap((key) => [{ _id: key }, { key }]),
    })
    .toArray();

  for (const doc of docs) {
    const docKey =
      typeof doc.key === 'string'
        ? doc.key
        : typeof doc._id === 'string'
          ? doc._id
          : null;
    if (!docKey || !values.has(docKey)) continue;
    values.set(docKey, typeof doc.value === 'string' ? doc.value : null);
  }

  return values;
};

export const readSecretSettingValues = async (
  keys: readonly string[]
): Promise<Record<string, string | null>> => {
  const uniqueKeys = [...new Set(keys.filter((key) => key.trim().length > 0))];
  const now = Date.now();
  const result = Object.fromEntries(uniqueKeys.map((key) => [key, null])) as Record<
    string,
    string | null
  >;
  const missingKeys: string[] = [];

  for (const key of uniqueKeys) {
    const cached = secretCache.get(key);
    if (cached && now - cached.fetchedAt < SECRET_CACHE_TTL_MS) {
      result[key] = cached.value;
      continue;
    }
    missingKeys.push(key);
  }

  if (missingKeys.length === 0) {
    return result;
  }

  try {
    const providerLookups = await Promise.all(
      missingKeys.map(async (key) => ({
        key,
        provider: await findProviderForKey(key),
      }))
    );

    const providerReads = providerLookups
      .filter(
        (
          entry
        ): entry is {
          key: string;
          provider: NonNullable<Awaited<ReturnType<typeof findProviderForKey>>>;
        } => entry.provider !== null
      )
      .map(async ({ key, provider }) => ({
        key,
        value: await provider.readValue(key),
      }));

    const mongoKeys = providerLookups
      .filter((entry) => entry.provider === null)
      .map((entry) => entry.key);

    const [providerValues, mongoValues] = await Promise.all([
      Promise.all(providerReads),
      readMongoSecretSettingValues(mongoKeys),
    ]);

    for (const { key, value } of providerValues) {
      const normalized = normalizeSecretValue(value);
      secretCache.set(key, { value: normalized, fetchedAt: now });
      result[key] = normalized;
    }

    for (const key of mongoKeys) {
      const normalized = normalizeSecretValue(mongoValues.get(key) ?? null);
      secretCache.set(key, { value: normalized, fetchedAt: now });
      result[key] = normalized;
    }

    return result;
  } catch (error) {
    void ErrorSystem.captureException(error);
    for (const key of missingKeys) {
      secretCache.set(key, { value: null, fetchedAt: now });
      result[key] = null;
    }
    return result;
  }
};

export const readSecretSettingValue = async (key: string): Promise<string | null> => {
  const values = await readSecretSettingValues([key]);
  return values[key] ?? null;
};

export const clearSecretSettingCache = (): void => {
  secretCache.clear();
};
