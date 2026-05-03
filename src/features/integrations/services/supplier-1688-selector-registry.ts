import type { Collection, Document, Filter, ObjectId } from 'mongodb';

import type {
  Supplier1688SelectorRegistryDeleteResponse,
  Supplier1688SelectorRegistryEntry,
  Supplier1688SelectorRegistryListResponse,
  Supplier1688SelectorRegistryProfileActionResponse,
  Supplier1688SelectorRegistrySaveResponse,
  Supplier1688SelectorRegistrySyncResponse,
} from '@/shared/contracts/integrations/supplier-1688-selector-registry';
import {
  resolveSupplier1688SelectorRuntimeFromEntries,
  SUPPLIER_1688_DEFAULT_SELECTOR_RUNTIME,
  SUPPLIER_1688_SELECTOR_REGISTRY_PROFILE,
  SUPPLIER_1688_SELECTOR_REGISTRY_SEED_ENTRIES,
  type Supplier1688SelectorRuntime,
  type Supplier1688SelectorRegistryRuntimeEntry,
  type Supplier1688SelectorRegistrySeedEntry,
} from '@/shared/lib/browser-execution/selectors/supplier-1688';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

const COLLECTION_NAME = 'integration_supplier_1688_selector_registry';
const DEFAULT_SELECTOR_PROFILE = SUPPLIER_1688_SELECTOR_REGISTRY_PROFILE;
const SEED_ENTRY_BY_KEY = new Map(
  SUPPLIER_1688_SELECTOR_REGISTRY_SEED_ENTRIES.map((entry) => [entry.key, entry])
);

type Supplier1688SelectorRegistryDoc = Document & {
  _id: ObjectId;
  profile?: string;
  key: string;
  group: string;
  kind: Supplier1688SelectorRegistrySeedEntry['kind'];
  role?: Supplier1688SelectorRegistrySeedEntry['role'];
  description: string | null;
  valueType: Supplier1688SelectorRegistrySeedEntry['valueType'];
  valueJson: string;
  itemCount: number;
  preview: string[];
  source: 'code' | 'mongo';
  createdAt: Date;
  updatedAt: Date;
};

type Supplier1688SelectorRegistryValue = string | string[];

type PersistedSupplier1688SelectorRegistryEntry = {
  key: string;
  group: string;
  kind: Supplier1688SelectorRegistrySeedEntry['kind'];
  role: Supplier1688SelectorRegistrySeedEntry['role'];
  description: string | null;
  valueType: Supplier1688SelectorRegistrySeedEntry['valueType'];
  valueJson: string;
  itemCount: number;
  preview: string[];
  source: 'code' | 'mongo';
};

export type ResolvedSupplier1688SelectorRegistryNativeRuntime = {
  selectorRuntime: Supplier1688SelectorRuntime;
  requestedProfile: string;
  resolvedProfile: string;
  sourceProfiles: string[];
  entryCount: number;
  overlayEntryCount: number;
  fallbackToCode: boolean;
  fallbackReason?: string;
};

export type Supplier1688SelectorRegistryResolutionSummary = Omit<
  ResolvedSupplier1688SelectorRegistryNativeRuntime,
  'selectorRuntime' | 'fallbackReason'
> & {
  fallbackReason: string | null;
};

export const toSupplier1688SelectorRegistryResolutionSummary = (
  resolution: ResolvedSupplier1688SelectorRegistryNativeRuntime | null | undefined
): Supplier1688SelectorRegistryResolutionSummary | null =>
  resolution
    ? {
        requestedProfile: resolution.requestedProfile,
        resolvedProfile: resolution.resolvedProfile,
        sourceProfiles: resolution.sourceProfiles,
        entryCount: resolution.entryCount,
        overlayEntryCount: resolution.overlayEntryCount,
        fallbackToCode: resolution.fallbackToCode,
        fallbackReason: resolution.fallbackReason ?? null,
      }
    : null;

let indexesReady = false;

const getCollection = async (): Promise<Collection<Supplier1688SelectorRegistryDoc>> => {
  const db = await getMongoDb();
  const collection = db.collection<Supplier1688SelectorRegistryDoc>(COLLECTION_NAME);
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
  const [scope, area] = key.split('.');
  return [scope, area].filter(Boolean).join('.') || 'supplier1688';
};

const parseValueJson = (
  valueJson: string,
  expectedValueType: Supplier1688SelectorRegistrySeedEntry['valueType'],
  key: string
): Supplier1688SelectorRegistryValue => {
  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(valueJson);
  } catch {
    throw new Error(`1688 selector registry value for "${key}" must be valid JSON.`);
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

  throw new Error(`1688 selector registry value for "${key}" must match ${expectedValueType}.`);
};

const normalizeValueJson = (value: Supplier1688SelectorRegistryValue): string =>
  JSON.stringify(value);

const getItemCount = (value: Supplier1688SelectorRegistryValue): number =>
  Array.isArray(value) ? value.length : value.trim().length > 0 ? 1 : 0;

const getPreview = (value: Supplier1688SelectorRegistryValue): string[] =>
  (Array.isArray(value) ? value : [value]).filter((entry) => entry.trim().length > 0).slice(0, 6);

const toPersistedEntry = (
  entry: Supplier1688SelectorRegistryDoc | Supplier1688SelectorRegistrySeedEntry,
  source: 'code' | 'mongo' = 'code'
): PersistedSupplier1688SelectorRegistryEntry => {
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

const toDomain = (doc: Supplier1688SelectorRegistryDoc): Supplier1688SelectorRegistryEntry => ({
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

const buildProfileFilter = (profile: string): Filter<Supplier1688SelectorRegistryDoc> =>
  profile === DEFAULT_SELECTOR_PROFILE
    ? {
        $or: [{ profile: DEFAULT_SELECTOR_PROFILE }, { profile: { $exists: false } }],
      }
    : { profile };

const buildProfileScopedFilter = (
  profile: string,
  fields: Record<string, unknown>
): Filter<Supplier1688SelectorRegistryDoc> =>
  profile === DEFAULT_SELECTOR_PROFILE
    ? {
        ...fields,
        $or: [{ profile: DEFAULT_SELECTOR_PROFILE }, { profile: { $exists: false } }],
      }
    : { ...fields, profile };

const resolveSeedEntry = (key: string): Supplier1688SelectorRegistrySeedEntry => {
  const seedEntry = SEED_ENTRY_BY_KEY.get(key);
  if (!seedEntry) {
    throw new Error(`Unsupported 1688 selector registry key "${key}".`);
  }
  return seedEntry;
};

const syncProfile = async (
  collection: Collection<Supplier1688SelectorRegistryDoc>,
  profile: string
): Promise<Supplier1688SelectorRegistrySyncResponse> => {
  const now = new Date();
  let insertedCount = 0;
  let updatedCount = 0;

  for (const seed of SUPPLIER_1688_SELECTOR_REGISTRY_SEED_ENTRIES) {
    const persisted = toPersistedEntry(seed, 'code');
    const existing = await collection.findOne(buildProfileScopedFilter(profile, { key: seed.key }));

    if (existing?.source === 'mongo') {
      continue;
    }

    if (!existing) {
      await collection.insertOne({
        profile,
        ...persisted,
        createdAt: now,
        updatedAt: now,
      } as Supplier1688SelectorRegistryDoc);
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
        ? `1688 selector registry profile "${profile}" synced from code into Mongo.`
        : `1688 selector registry profile "${profile}" was already up to date.`,
  };
};

export async function listSupplier1688SelectorRegistry(options?: {
  profile?: string | null;
}): Promise<Supplier1688SelectorRegistryListResponse> {
  const profile = normalizeSelectorProfile(options?.profile);
  const collection = await getCollection();
  const docs = await collection.find(buildProfileFilter(profile)).sort({ key: 1 }).toArray();
  const docsByKey = new Map(docs.map((doc) => [doc.key, doc]));
  const now = new Date().toISOString();

  const seededFallbacks: Supplier1688SelectorRegistryEntry[] =
    SUPPLIER_1688_SELECTOR_REGISTRY_SEED_ENTRIES
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

  return {
    entries,
    total: entries.length,
    syncedAt: entries.length > 0 ? entries[0]?.updatedAt ?? null : null,
  };
}

export async function syncSupplier1688SelectorRegistryFromCode(options?: {
  profile?: string | null;
}): Promise<Supplier1688SelectorRegistrySyncResponse> {
  const profile = normalizeSelectorProfile(options?.profile);
  const collection = await getCollection();
  return await syncProfile(collection, profile);
}

export async function saveSupplier1688SelectorRegistryEntry(input: {
  profile: string;
  key: string;
  valueJson: string;
  role?: Supplier1688SelectorRegistrySeedEntry['role'];
}): Promise<Supplier1688SelectorRegistrySaveResponse> {
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
    message: `1688 selector registry entry "${seedEntry.key}" saved for profile "${profile}".`,
  };
}

export async function deleteSupplier1688SelectorRegistryEntry(input: {
  profile: string;
  key: string;
}): Promise<Supplier1688SelectorRegistryDeleteResponse> {
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
        ? `1688 selector registry override "${seedEntry.key}" deleted for profile "${profile}".`
        : `No 1688 selector registry override existed for "${seedEntry.key}" in profile "${profile}".`,
  };
}

export async function cloneSupplier1688SelectorRegistryProfile(input: {
  sourceProfile: string;
  targetProfile: string;
}): Promise<Supplier1688SelectorRegistryProfileActionResponse> {
  const sourceProfile = normalizeSelectorProfile(input.sourceProfile);
  const targetProfile = normalizeSelectorProfile(input.targetProfile);
  const collection = await getCollection();
  const source = await listSupplier1688SelectorRegistry({ profile: sourceProfile });
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
    message: `1688 selector registry profile "${sourceProfile}" cloned to "${targetProfile}".`,
  };
}

export async function renameSupplier1688SelectorRegistryProfile(input: {
  profile: string;
  targetProfile: string;
}): Promise<Supplier1688SelectorRegistryProfileActionResponse> {
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
    message: `1688 selector registry profile "${profile}" renamed to "${targetProfile}".`,
  };
}

export async function deleteSupplier1688SelectorRegistryProfile(input: {
  profile: string;
}): Promise<Supplier1688SelectorRegistryProfileActionResponse> {
  const profile = normalizeSelectorProfile(input.profile);
  const collection = await getCollection();
  const result = await collection.deleteMany(buildProfileFilter(profile));

  return {
    action: 'delete_profile',
    profile,
    targetProfile: null,
    affectedEntries: result.deletedCount,
    message: `1688 selector registry profile "${profile}" deleted.`,
  };
}

export async function resolveSupplier1688SelectorRegistryNativeRuntime(options?: {
  profile?: string | null;
}): Promise<ResolvedSupplier1688SelectorRegistryNativeRuntime> {
  const requestedProfile = normalizeSelectorProfile(options?.profile);
  const collection = await getCollection();
  const docs = await collection.find(buildProfileFilter(requestedProfile)).toArray();

  if (docs.length === 0) {
    return {
      selectorRuntime: SUPPLIER_1688_DEFAULT_SELECTOR_RUNTIME,
      requestedProfile,
      resolvedProfile: DEFAULT_SELECTOR_PROFILE,
      sourceProfiles: ['code'],
      entryCount: SUPPLIER_1688_SELECTOR_REGISTRY_SEED_ENTRIES.length,
      overlayEntryCount: 0,
      fallbackToCode: true,
      fallbackReason: 'No Mongo selector registry entries were found for the requested 1688 profile.',
    };
  }

  const seedEntries = new Map<string, Supplier1688SelectorRegistryRuntimeEntry>(
    SUPPLIER_1688_SELECTOR_REGISTRY_SEED_ENTRIES.map((entry) => [
      entry.key,
      { key: entry.key, valueJson: entry.valueJson },
    ])
  );
  for (const doc of docs) {
    seedEntries.set(doc.key, { key: doc.key, valueJson: doc.valueJson });
  }

  const entries = [...seedEntries.values()];
  return {
    selectorRuntime: resolveSupplier1688SelectorRuntimeFromEntries(entries),
    requestedProfile,
    resolvedProfile: requestedProfile,
    sourceProfiles: [requestedProfile, 'code'],
    entryCount: entries.length,
    overlayEntryCount: docs.length,
    fallbackToCode: false,
  };
}
