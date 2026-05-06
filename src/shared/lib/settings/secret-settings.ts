import 'server-only';

/**
 * Secret Settings Management
 * 
 * Secure handling of sensitive configuration values.
 * Provides:
 * - Encrypted storage and retrieval of secrets
 * - Time-based caching with automatic expiration
 * - Database-backed secret persistence
 * - Provider-based secret resolution
 * - Error handling and observability integration
 */

import type { MongoStringSettingRecord } from '@/shared/contracts/settings';

import { configurationError } from '@/shared/errors/app-error';
import { findProviderForKey } from '@/shared/lib/db/settings-registry';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { hasConfiguredMongoSourceEnv } from '@/shared/lib/db/mongo-source-env';
import { encodeSettingValue } from '@/shared/lib/settings/settings-compression';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

// Cache secrets for 60 seconds to reduce database load
const SECRET_CACHE_TTL_MS = 60_000;
const secretCache = new Map<string, { value: string | null; fetchedAt: number }>();

type SecretProvider = NonNullable<Awaited<ReturnType<typeof findProviderForKey>>>;
type SecretProviderLookup = {
  key: string;
  provider: SecretProvider | null;
};
type SecretProviderValue = {
  key: string;
  value: string | null;
};

const normalizeSecretValue = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readMongoSettingDocumentKey = (doc: MongoStringSettingRecord): string | null => {
  if (typeof doc.key === 'string') return doc.key;
  if (typeof doc._id === 'string') return doc._id;
  return null;
};

const readMongoSecretSettingValues = async (
  keys: readonly string[]
): Promise<Map<string, string | null>> => {
  const values = new Map<string, string | null>(keys.map((key) => [key, null]));
  if (keys.length === 0 || !hasConfiguredMongoSourceEnv()) {
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
    const docKey = readMongoSettingDocumentKey(doc);
    if (docKey === null || !values.has(docKey)) continue;
    values.set(docKey, typeof doc.value === 'string' ? doc.value : null);
  }

  return values;
};

const buildSecretResult = (keys: readonly string[]): Record<string, string | null> =>
  Object.fromEntries(keys.map((key) => [key, null])) as Record<string, string | null>;

const collectMissingSecretKeys = (
  keys: readonly string[],
  now: number,
  result: Record<string, string | null>
): string[] => {
  const missingKeys: string[] = [];
  const target = result;
  for (const key of keys) {
    const cached = secretCache.get(key);
    if (cached !== undefined && now - cached.fetchedAt < SECRET_CACHE_TTL_MS) {
      target[key] = cached.value;
    } else {
      missingKeys.push(key);
    }
  }
  return missingKeys;
};

const readProviderLookups = async (
  keys: readonly string[]
): Promise<SecretProviderLookup[]> =>
  Promise.all(
    keys.map(async (key) => ({
      key,
      provider: await findProviderForKey(key),
    }))
  );

const hasSecretProvider = (
  entry: SecretProviderLookup
): entry is { key: string; provider: SecretProvider } => entry.provider !== null;

const readProviderSecretValues = async (
  lookups: readonly SecretProviderLookup[]
): Promise<SecretProviderValue[]> =>
  Promise.all(
    lookups.filter(hasSecretProvider).map(async ({ key, provider }) => ({
      key,
      value: await provider.readValue(key),
    }))
  );

const cacheSecretResult = (
  result: Record<string, string | null>,
  key: string,
  value: string | null | undefined,
  fetchedAt: number
): void => {
  const normalized = normalizeSecretValue(value);
  secretCache.set(key, { value: normalized, fetchedAt });
  const target = result;
  target[key] = normalized;
};

const cacheMissingSecretResults = (
  result: Record<string, string | null>,
  keys: readonly string[],
  fetchedAt: number
): void => {
  const target = result;
  keys.forEach((key) => {
    secretCache.set(key, { value: null, fetchedAt });
    target[key] = null;
  });
};

export const readSecretSettingValues = async (
  keys: readonly string[]
): Promise<Record<string, string | null>> => {
  const uniqueKeys = [...new Set(keys.filter((key) => key.trim().length > 0))];
  const now = Date.now();
  const result = buildSecretResult(uniqueKeys);
  const missingKeys = collectMissingSecretKeys(uniqueKeys, now, result);
  if (missingKeys.length === 0) return result;

  try {
    const providerLookups = await readProviderLookups(missingKeys);
    const mongoKeys = providerLookups
      .filter((entry) => entry.provider === null)
      .map((entry) => entry.key);
    const [providerValues, mongoValues] = await Promise.all([
      readProviderSecretValues(providerLookups),
      readMongoSecretSettingValues(mongoKeys),
    ]);

    for (const { key, value } of providerValues) {
      cacheSecretResult(result, key, value, now);
    }

    for (const key of mongoKeys) {
      cacheSecretResult(result, key, mongoValues.get(key) ?? null, now);
    }

    return result;
  } catch (error) {
    void ErrorSystem.captureException(error);
    cacheMissingSecretResults(result, missingKeys, now);
    return result;
  }
};

export const readSecretSettingValue = async (key: string): Promise<string | null> => {
  const values = await readSecretSettingValues([key]);
  return values[key] ?? null;
};

export const upsertSecretSettingValue = async (key: string, value: string): Promise<void> => {
  const provider = await findProviderForKey(key);
  if (provider !== null) {
    await provider.upsertValue(key, value);
    secretCache.delete(key);
    return;
  }
  if (!hasConfiguredMongoSourceEnv()) {
    throw configurationError('No MongoDB source is configured.');
  }

  const mongo = await getMongoDb();
  const now = new Date();
  const collection = mongo.collection<MongoStringSettingRecord>('settings');
  const update = {
    $set: {
      key,
      value: encodeSettingValue(key, value),
      updatedAt: now,
    },
  };
  const result = await collection.updateOne({ $or: [{ _id: key }, { key }] }, update);
  if (result.matchedCount === 0) {
    await collection.updateOne(
      { _id: key },
      {
        ...update,
        $setOnInsert: {
          _id: key,
          createdAt: now,
        },
      },
      { upsert: true }
    );
  }
  secretCache.delete(key);
};

export const deleteSecretSettingValues = async (keys: readonly string[]): Promise<void> => {
  const uniqueKeys = [...new Set(keys.filter((key) => key.trim().length > 0))];
  if (uniqueKeys.length === 0) return;
  await Promise.all(
    uniqueKeys.map(async (key) => {
      const provider = await findProviderForKey(key);
      if (provider !== null) {
        await provider.deleteValue(key);
      }
      secretCache.delete(key);
    })
  );
  if (!hasConfiguredMongoSourceEnv()) return;

  const mongoKeys = uniqueKeys;
  const mongo = await getMongoDb();
  await mongo.collection<MongoStringSettingRecord>('settings').deleteMany({
    $or: mongoKeys.flatMap((key) => [{ _id: key }, { key }]),
  });
};

export const clearSecretSettingCache = (): void => {
  secretCache.clear();
};
