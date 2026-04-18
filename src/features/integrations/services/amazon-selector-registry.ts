import type { Collection, Document, Filter, ObjectId } from 'mongodb';

import type {
  AmazonSelectorRegistryDeleteResponse,
  AmazonSelectorRegistryEntry,
  AmazonSelectorRegistryListResponse,
  AmazonSelectorRegistryProfileActionResponse,
  AmazonSelectorRegistrySaveResponse,
  AmazonSelectorRegistrySyncResponse,
} from '@/shared/contracts/integrations/amazon-selector-registry';
import {
  AMAZON_DEFAULT_SELECTOR_RUNTIME,
  AMAZON_SELECTOR_REGISTRY_PROFILE,
  AMAZON_SELECTOR_REGISTRY_SEED_ENTRIES,
  resolveAmazonSelectorRuntimeFromEntries,
  type AmazonSelectorRegistryRuntimeEntry,
  type AmazonSelectorRegistrySeedEntry,
  type AmazonSelectorRuntime,
} from '@/shared/lib/browser-execution/selectors/amazon';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

const COLLECTION_NAME = 'integration_amazon_selector_registry';
const DEFAULT_SELECTOR_PROFILE = AMAZON_SELECTOR_REGISTRY_PROFILE;
const SEED_ENTRY_BY_KEY = new Map(
  AMAZON_SELECTOR_REGISTRY_SEED_ENTRIES.map((entry) => [entry.key, entry])
);

type AmazonSelectorRegistryDoc = Document & {
  _id: ObjectId;
  profile?: string;
  key: string;
  group: string;
  kind: AmazonSelectorRegistrySeedEntry['kind'];
  role?: AmazonSelectorRegistrySeedEntry['role'];
  description: string | null;
  valueType: AmazonSelectorRegistrySeedEntry['valueType'];
  valueJson: string;
  itemCount: number;
  preview: string[];
  source: 'code' | 'mongo';
  createdAt: Date;
  updatedAt: Date;
};

type AmazonSelectorRegistryValue = string | string[];

type PersistedAmazonSelectorRegistryEntry = {
  key: string;
  group: string;
  kind: AmazonSelectorRegistrySeedEntry['kind'];
  role: AmazonSelectorRegistrySeedEntry['role'];
  description: string | null;
  valueType: AmazonSelectorRegistrySeedEntry['valueType'];
  valueJson: string;
  itemCount: number;
  preview: string[];
  source: 'code' | 'mongo';
};

export type ResolvedAmazonSelectorRegistryRuntime = {
  selectorRuntime: AmazonSelectorRuntime;
  requestedProfile: string;
  resolvedProfile: string;
  sourceProfiles: string[];
  entryCount: number;
  overlayEntryCount: number;
  fallbackToCode: boolean;
  fallbackReason?: string;
};

let indexesReady = false;

const getCollection = async (): Promise<Collection<AmazonSelectorRegistryDoc>> => {
  const db = await getMongoDb();
  const collection = db.collection<AmazonSelectorRegistryDoc>(COLLECTION_NAME);
  if (!indexesReady) {
    indexesReady = true;
    void collection.createIndex({ profile: 1, key: 1 }, { unique: true });
    void collection.createIndex({ profile: 1, group: 1 });
  }
  return collection;
};

const normalizeSelectorProfile = (value: string | null | undefined): string => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.length > 0 ? normalized : DEFAULT_SELECTOR_PROFILE;
};

const resolveGroup = (key: string): string => {
  const segments = key.split('.');
  return segments.slice(0, 2).filter(Boolean).join('.') || 'amazon';
};

const parseValueJson = (
  valueJson: string,
  expectedValueType: AmazonSelectorRegistrySeedEntry['valueType'],
  key: string
): AmazonSelectorRegistryValue => {
  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(valueJson);
  } catch {
    throw new Error(`Amazon selector registry value for "${key}" must be valid JSON.`);
  }

  if (expectedValueType === 'string' && typeof parsedValue === 'string') {
    return parsedValue;
  }
  if (
    expectedValueType === 'string_array' &&
    Array.isArray(parsedValue) &&
    parsedValue.every((entry) => typeof entry === 'string')
  ) {
    return parsedValue;
  }

  throw new Error(`Amazon selector registry value for "${key}" must match ${expectedValueType}.`);
};

const normalizeValueJson = (value: AmazonSelectorRegistryValue): string => JSON.stringify(value);

const getItemCount = (value: AmazonSelectorRegistryValue): number =>
  Array.isArray(value) ? value.length : value.trim().length > 0 ? 1 : 0;

const getPreview = (value: AmazonSelectorRegistryValue): string[] =>
  (Array.isArray(value) ? value : [value]).filter((entry) => entry.trim().length > 0).slice(0, 6);

const toPersistedEntry = (
  entry: AmazonSelectorRegistryDoc | AmazonSelectorRegistrySeedEntry,
  source: 'code' | 'mongo' = 'code'
): PersistedAmazonSelectorRegistryEntry => {
  const parsedValue = parseValueJson(entry.valueJson, entry.valueType, entry.key);
  const seedEntry = SEED_ENTRY_BY_KEY.get(entry.key);
  return {
    key: entry.key,
    group: 'group' in entry ? entry.group : resolveGroup(entry.key),
    kind: entry.kind,
    role: entry.role ?? seedEntry?.role ?? 'generic',
    description: entry.description ?? null,
    valueType: entry.valueType,
    valueJson: normalizeValueJson(parsedValue),
    itemCount: getItemCount(parsedValue),
    preview: getPreview(parsedValue),
    source,
  };
};

const toDomain = (doc: AmazonSelectorRegistryDoc): AmazonSelectorRegistryEntry => ({
  id: doc._id.toString(),
  profile: normalizeSelectorProfile(doc.profile),
  key: doc.key,
  group: doc.group,
  kind: doc.kind,
  role: doc.role ?? resolveSeedEntry(doc.key).role,
  description: doc.description,
  valueType: doc.valueType,
  valueJson: doc.valueJson,
  itemCount: doc.itemCount,
  preview: doc.preview,
  source: doc.source,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

const buildProfileFilter = (profile: string): Filter<AmazonSelectorRegistryDoc> =>
  profile === DEFAULT_SELECTOR_PROFILE
    ? {
        $or: [{ profile: DEFAULT_SELECTOR_PROFILE }, { profile: { $exists: false } }],
      }
    : { profile };

const buildProfileScopedFilter = (
  profile: string,
  fields: Record<string, unknown>
): Filter<AmazonSelectorRegistryDoc> =>
  profile === DEFAULT_SELECTOR_PROFILE
    ? {
        ...fields,
        $or: [{ profile: DEFAULT_SELECTOR_PROFILE }, { profile: { $exists: false } }],
      }
    : { ...fields, profile };

const resolveSeedEntry = (key: string): AmazonSelectorRegistrySeedEntry => {
  const seedEntry = SEED_ENTRY_BY_KEY.get(key);
  if (!seedEntry) {
    throw new Error(`Unsupported Amazon selector registry key "${key}".`);
  }
  return seedEntry;
};

const syncProfile = async (
  collection: Collection<AmazonSelectorRegistryDoc>,
  profile: string
): Promise<AmazonSelectorRegistrySyncResponse> => {
  const now = new Date();
  let insertedCount = 0;
  let updatedCount = 0;

  for (const seed of AMAZON_SELECTOR_REGISTRY_SEED_ENTRIES) {
    const persisted = toPersistedEntry(seed, 'code');
    const existing = await collection.findOne(buildProfileScopedFilter(profile, { key: seed.key }));

    if (existing?.source === 'mongo') continue;

    if (!existing) {
      await collection.insertOne({
        profile,
        ...persisted,
        createdAt: now,
        updatedAt: now,
      } as AmazonSelectorRegistryDoc);
      insertedCount += 1;
      continue;
    }

    const result = await collection.updateOne(
      { _id: existing._id },
      {
        $set: {
          profile,
          ...persisted,
          updatedAt: now,
        },
      }
    );
    updatedCount += result.modifiedCount;
  }

  const total = await collection.countDocuments(buildProfileFilter(profile));
  const syncedAt = now.toISOString();
  return {
    insertedCount,
    updatedCount,
    deletedCount: 0,
    total,
    syncedAt,
    message:
      insertedCount > 0 || updatedCount > 0
        ? `Amazon selector registry profile "${profile}" synced from code into Mongo.`
        : `Amazon selector registry profile "${profile}" was already up to date.`,
  };
};

export async function listAmazonSelectorRegistry(options?: {
  profile?: string | null;
}): Promise<AmazonSelectorRegistryListResponse> {
  const profile = normalizeSelectorProfile(options?.profile);
  const collection = await getCollection();
  const docs = await collection.find(buildProfileFilter(profile)).sort({ key: 1 }).toArray();
  const storedProfiles = await collection.distinct('profile');
  const docsByKey = new Map(docs.map((doc) => [doc.key, doc]));
  const now = new Date().toISOString();

  const seededFallbacks: AmazonSelectorRegistryEntry[] = AMAZON_SELECTOR_REGISTRY_SEED_ENTRIES
    .filter((seed) => !docsByKey.has(seed.key))
    .map((seed) => {
      const persisted = toPersistedEntry(seed, 'code');
      return {
        id: `code:${profile}:${seed.key}`,
        profile,
        ...persisted,
        createdAt: now,
        updatedAt: now,
      };
    });

  const entries = [...docs.map(toDomain), ...seededFallbacks].sort((left, right) =>
    left.key.localeCompare(right.key)
  );
  const profiles = Array.from(
    new Set([
      DEFAULT_SELECTOR_PROFILE,
      profile,
      ...storedProfiles.map((value) =>
        normalizeSelectorProfile(typeof value === 'string' ? value : null)
      ),
    ])
  ).sort((left, right) => left.localeCompare(right));

  return {
    entries,
    profiles,
    total: entries.length,
    syncedAt: entries.length > 0 ? entries[0]?.updatedAt ?? null : null,
  };
}

export async function syncAmazonSelectorRegistryFromCode(options?: {
  profile?: string | null;
}): Promise<AmazonSelectorRegistrySyncResponse> {
  const profile = normalizeSelectorProfile(options?.profile);
  const collection = await getCollection();
  return await syncProfile(collection, profile);
}

export async function saveAmazonSelectorRegistryEntry(input: {
  profile: string;
  key: string;
  valueJson: string;
  role?: AmazonSelectorRegistrySeedEntry['role'];
}): Promise<AmazonSelectorRegistrySaveResponse> {
  const profile = normalizeSelectorProfile(input.profile);
  const seedEntry = resolveSeedEntry(input.key.trim());
  const parsedValue = parseValueJson(input.valueJson, seedEntry.valueType, seedEntry.key);
  const normalizedValueJson = normalizeValueJson(parsedValue);
  const collection = await getCollection();
  const now = new Date();
  const itemCount = getItemCount(parsedValue);
  const preview = getPreview(parsedValue);

  await collection.updateOne(
    buildProfileScopedFilter(profile, { key: seedEntry.key }),
    {
      $setOnInsert: { createdAt: now },
      $set: {
        profile,
        key: seedEntry.key,
        group: resolveGroup(seedEntry.key),
        kind: seedEntry.kind,
        role: input.role ?? seedEntry.role,
        description: seedEntry.description ?? null,
        valueType: seedEntry.valueType,
        valueJson: normalizedValueJson,
        itemCount,
        preview,
        source: 'mongo',
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  return {
    profile,
    key: seedEntry.key,
    itemCount,
    preview,
    message: `Amazon selector registry entry "${seedEntry.key}" saved for profile "${profile}".`,
  };
}

export async function deleteAmazonSelectorRegistryEntry(input: {
  profile: string;
  key: string;
}): Promise<AmazonSelectorRegistryDeleteResponse> {
  const profile = normalizeSelectorProfile(input.profile);
  const seedEntry = resolveSeedEntry(input.key.trim());
  const collection = await getCollection();
  const result = await collection.deleteOne(buildProfileScopedFilter(profile, { key: seedEntry.key }));

  return {
    profile,
    key: seedEntry.key,
    deleted: result.deletedCount > 0,
    message:
      result.deletedCount > 0
        ? `Amazon selector registry override "${seedEntry.key}" deleted for profile "${profile}".`
        : `No Amazon selector registry override existed for "${seedEntry.key}" in profile "${profile}".`,
  };
}

export async function cloneAmazonSelectorRegistryProfile(input: {
  sourceProfile: string;
  targetProfile: string;
}): Promise<AmazonSelectorRegistryProfileActionResponse> {
  const sourceProfile = normalizeSelectorProfile(input.sourceProfile);
  const targetProfile = normalizeSelectorProfile(input.targetProfile);
  const collection = await getCollection();
  const source = await listAmazonSelectorRegistry({ profile: sourceProfile });
  const now = new Date();

  for (const entry of source.entries) {
    await collection.updateOne(
      { profile: targetProfile, key: entry.key },
      {
        $setOnInsert: { createdAt: now },
        $set: {
          profile: targetProfile,
          key: entry.key,
          group: entry.group,
          kind: entry.kind,
          role: entry.role,
          description: entry.description,
          valueType: entry.valueType,
          valueJson: entry.valueJson,
          itemCount: entry.itemCount,
          preview: entry.preview,
          source: 'mongo',
          updatedAt: now,
        },
      },
      { upsert: true }
    );
  }

  return {
    action: 'clone_profile',
    profile: sourceProfile,
    targetProfile,
    affectedEntries: source.entries.length,
    message: `Amazon selector registry profile "${sourceProfile}" cloned to "${targetProfile}".`,
  };
}

export async function renameAmazonSelectorRegistryProfile(input: {
  profile: string;
  targetProfile: string;
}): Promise<AmazonSelectorRegistryProfileActionResponse> {
  const profile = normalizeSelectorProfile(input.profile);
  const targetProfile = normalizeSelectorProfile(input.targetProfile);
  const collection = await getCollection();
  const result = await collection.updateMany(buildProfileFilter(profile), {
    $set: { profile: targetProfile, updatedAt: new Date() },
  });

  return {
    action: 'rename_profile',
    profile,
    targetProfile,
    affectedEntries: result.modifiedCount,
    message: `Amazon selector registry profile "${profile}" renamed to "${targetProfile}".`,
  };
}

export async function deleteAmazonSelectorRegistryProfile(input: {
  profile: string;
}): Promise<AmazonSelectorRegistryProfileActionResponse> {
  const profile = normalizeSelectorProfile(input.profile);
  const collection = await getCollection();
  const result = await collection.deleteMany(buildProfileFilter(profile));

  return {
    action: 'delete_profile',
    profile,
    targetProfile: null,
    affectedEntries: result.deletedCount,
    message: `Amazon selector registry profile "${profile}" deleted.`,
  };
}

export async function resolveAmazonSelectorRegistryRuntime(options?: {
  profile?: string | null;
}): Promise<ResolvedAmazonSelectorRegistryRuntime> {
  const requestedProfile = normalizeSelectorProfile(options?.profile);
  const collection = await getCollection();
  const docs = await collection.find(buildProfileFilter(requestedProfile)).toArray();

  if (docs.length === 0) {
    return {
      selectorRuntime: AMAZON_DEFAULT_SELECTOR_RUNTIME,
      requestedProfile,
      resolvedProfile: DEFAULT_SELECTOR_PROFILE,
      sourceProfiles: ['code'],
      entryCount: AMAZON_SELECTOR_REGISTRY_SEED_ENTRIES.length,
      overlayEntryCount: 0,
      fallbackToCode: true,
      fallbackReason:
        'No Mongo selector registry entries were found for the requested Amazon profile.',
    };
  }

  const seedEntries = new Map<string, AmazonSelectorRegistryRuntimeEntry>(
    AMAZON_SELECTOR_REGISTRY_SEED_ENTRIES.map((entry) => [
      entry.key,
      { key: entry.key, valueJson: entry.valueJson },
    ])
  );

  for (const doc of docs) {
    seedEntries.set(doc.key, { key: doc.key, valueJson: doc.valueJson });
  }

  const entries = [...seedEntries.values()];
  return {
    selectorRuntime: resolveAmazonSelectorRuntimeFromEntries(entries),
    requestedProfile,
    resolvedProfile: requestedProfile,
    sourceProfiles: [requestedProfile, 'code'],
    entryCount: entries.length,
    overlayEntryCount: docs.length,
    fallbackToCode: false,
  };
}
