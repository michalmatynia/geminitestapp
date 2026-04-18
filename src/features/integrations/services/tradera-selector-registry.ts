/* eslint-disable complexity, max-lines, max-lines-per-function */
import type { Collection, Document, Filter, ObjectId } from 'mongodb';

import { DEFAULT_TRADERA_SYSTEM_SETTINGS } from '@/features/integrations/constants/tradera';
import type {
  TraderaSelectorRegistryDeleteResponse,
  TraderaSelectorRegistryEntry,
  TraderaSelectorRegistryListResponse,
  TraderaSelectorRegistryProfileActionResponse,
  TraderaSelectorRegistrySaveResponse,
  TraderaSelectorRegistrySyncResponse,
} from '@/shared/contracts/integrations/tradera-selector-registry';
import {
  generateTraderaSelectorRegistryRuntimeFromEntries,
  TRADERA_SELECTOR_REGISTRY_RUNTIME,
  TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES,
  type TraderaSelectorRegistryRuntimeEntry,
  type TraderaSelectorRegistrySeedEntry,
} from '@/shared/lib/browser-execution/selectors/tradera';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

const COLLECTION_NAME = 'integration_tradera_selector_registry';
const DEFAULT_SELECTOR_PROFILE = DEFAULT_TRADERA_SYSTEM_SETTINGS.selectorProfile;
const SEED_ENTRY_BY_KEY = new Map(
  TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES.map((entry) => [entry.key, entry])
);

type TraderaSelectorRegistryDoc = Document & {
  _id: ObjectId;
  profile?: string;
  key: string;
  group: string;
  kind: TraderaSelectorRegistrySeedEntry['kind'];
  role?: TraderaSelectorRegistrySeedEntry['role'];
  description: string | null;
  valueType: TraderaSelectorRegistrySeedEntry['valueType'];
  valueJson: string;
  itemCount: number;
  preview: string[];
  source: 'code' | 'mongo';
  createdAt: Date;
  updatedAt: Date;
};

type TraderaSelectorRegistryValue =
  | string
  | number
  | boolean
  | null
  | TraderaSelectorRegistryValue[]
  | { [key: string]: TraderaSelectorRegistryValue };

type PersistedTraderaSelectorRegistryEntry = {
  key: string;
  group: string;
  kind: TraderaSelectorRegistrySeedEntry['kind'];
  role: TraderaSelectorRegistrySeedEntry['role'];
  description: string | null;
  valueType: TraderaSelectorRegistrySeedEntry['valueType'];
  valueJson: string;
  itemCount: number;
  preview: string[];
  source: 'code' | 'mongo';
};

export type ResolvedTraderaSelectorRegistryRuntime = {
  runtime: string;
  requestedProfile: string;
  resolvedProfile: string;
  sourceProfiles: string[];
  entryCount: number;
  overlayEntryCount: number;
  fallbackToCode: boolean;
  fallbackReason?: string;
};

const getCollection = async (): Promise<Collection<TraderaSelectorRegistryDoc>> => {
  const db = await getMongoDb();
  return db.collection<TraderaSelectorRegistryDoc>(COLLECTION_NAME);
};

const normalizeSelectorProfile = (value: string | null | undefined): string => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.length > 0 ? normalized : DEFAULT_SELECTOR_PROFILE;
};

const toDomain = (doc: TraderaSelectorRegistryDoc): TraderaSelectorRegistryEntry => ({
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

const buildProfileFilter = (profile: string): Filter<TraderaSelectorRegistryDoc> =>
  profile === DEFAULT_SELECTOR_PROFILE
    ? {
        $or: [{ profile: DEFAULT_SELECTOR_PROFILE }, { profile: { $exists: false } }],
      }
    : { profile };

const buildProfileScopedFilter = (
  profile: string,
  fields: Record<string, unknown>
): Filter<TraderaSelectorRegistryDoc> =>
  profile === DEFAULT_SELECTOR_PROFILE
    ? {
        ...fields,
        $or: [{ profile: DEFAULT_SELECTOR_PROFILE }, { profile: { $exists: false } }],
      }
    : { ...fields, profile };

const requireNonDefaultProfile = (profile: string, actionLabel: string): void => {
  if (profile === DEFAULT_SELECTOR_PROFILE) {
    throw new Error(`${actionLabel} is not supported for the default selector profile.`);
  }
};

const resolveSeedEntry = (key: string): TraderaSelectorRegistrySeedEntry => {
  const seedEntry = SEED_ENTRY_BY_KEY.get(key);
  if (!seedEntry) {
    throw new Error(`Unsupported Tradera selector registry key "${key}".`);
  }

  return seedEntry;
};

const detectValueType = (
  value: TraderaSelectorRegistryValue
): TraderaSelectorRegistrySeedEntry['valueType'] => {
  if (typeof value === 'string') {
    return 'string';
  }

  if (Array.isArray(value)) {
    if (value.every((entry) => typeof entry === 'string')) {
      return 'string_array';
    }

    if (value.every((entry) => Array.isArray(entry))) {
      return 'nested_string_array';
    }

    return 'object_array';
  }

  return 'object_array';
};

const collectPreviewStrings = (
  value: TraderaSelectorRegistryValue,
  limit = 4
): string[] => {
  const result: string[] = [];

  const visit = (candidate: TraderaSelectorRegistryValue): void => {
    if (result.length >= limit) return;

    if (typeof candidate === 'string') {
      const normalized = candidate.trim();
      if (normalized.length > 0) {
        result.push(normalized);
      }
      return;
    }

    if (
      candidate === null ||
      typeof candidate === 'number' ||
      typeof candidate === 'boolean'
    ) {
      return;
    }

    if (Array.isArray(candidate)) {
      for (const entry of candidate) {
        visit(entry);
        if (result.length >= limit) return;
      }
      return;
    }

    for (const entry of Object.values(candidate)) {
      visit(entry);
      if (result.length >= limit) return;
    }
  };

  visit(value);
  return result;
};

const getItemCount = (value: TraderaSelectorRegistryValue): number => {
  if (Array.isArray(value)) {
    return value.length;
  }

  return value === null ? 0 : 1;
};

const parseValueJson = (
  valueJson: string,
  expectedValueType: TraderaSelectorRegistrySeedEntry['valueType'],
  key: string
): TraderaSelectorRegistryValue => {
  let parsedValue: TraderaSelectorRegistryValue;

  try {
    parsedValue = JSON.parse(valueJson) as TraderaSelectorRegistryValue;
  } catch {
    throw new Error(`Selector "${key}" must be valid JSON.`);
  }

  if (detectValueType(parsedValue) !== expectedValueType) {
    throw new Error(
      `Selector "${key}" must match the "${expectedValueType}" registry value type.`
    );
  }

  return parsedValue;
};

const toPersistedEntry = (
  entry:
    | TraderaSelectorRegistryDoc
    | TraderaSelectorRegistrySeedEntry,
  source: 'code' | 'mongo' = 'mongo'
): PersistedTraderaSelectorRegistryEntry => {
  const seedEntry = SEED_ENTRY_BY_KEY.get(entry.key);
  return {
    key: entry.key,
    group: entry.group,
    kind: entry.kind,
    role: entry.role ?? seedEntry?.role ?? 'generic',
    description: entry.description,
    valueType: entry.valueType,
    valueJson: entry.valueJson,
    itemCount: entry.itemCount,
    preview: entry.preview,
    source,
  };
};

const getProfileMatchPriority = (
  doc: TraderaSelectorRegistryDoc,
  requestedProfile: string
): number => {
  const storedProfile = normalizeSelectorProfile(doc.profile);
  if (storedProfile !== requestedProfile) {
    return 0;
  }

  return typeof doc.profile === 'string' && doc.profile.trim().length > 0 ? 2 : 1;
};

const buildDocMap = (
  docs: readonly TraderaSelectorRegistryDoc[],
  requestedProfile: string
): Map<string, TraderaSelectorRegistryDoc> => {
  const map = new Map<string, TraderaSelectorRegistryDoc>();

  for (const doc of docs) {
    const existing = map.get(doc.key);
    if (!existing) {
      map.set(doc.key, doc);
      continue;
    }

    if (
      getProfileMatchPriority(doc, requestedProfile) >=
      getProfileMatchPriority(existing, requestedProfile)
    ) {
      map.set(doc.key, doc);
    }
  }

  return map;
};

const hasSeedChanged = (
  existing: TraderaSelectorRegistryDoc | undefined,
  seed: TraderaSelectorRegistrySeedEntry
): boolean => {
  if (!existing) {
    return true;
  }

  return [
    normalizeSelectorProfile(existing.profile) !== DEFAULT_SELECTOR_PROFILE,
    existing.group !== seed.group,
    existing.kind !== seed.kind,
    (existing.role ?? resolveSeedEntry(existing.key).role) !== seed.role,
    existing.description !== seed.description,
    existing.valueType !== seed.valueType,
    existing.valueJson !== seed.valueJson,
    existing.itemCount !== seed.itemCount,
    JSON.stringify(existing.preview) !== JSON.stringify(seed.preview),
    existing.source !== seed.source,
  ].some(Boolean);
};

const syncCollectionFromCode = async (
  collection: Collection<TraderaSelectorRegistryDoc>,
  profile?: string | null
): Promise<TraderaSelectorRegistrySyncResponse> => {
  const normalizedProfile = normalizeSelectorProfile(profile);
  const now = new Date();
  const existingDocs = await collection.find(buildProfileFilter(normalizedProfile)).toArray();
  const existingByKey = buildDocMap(existingDocs, normalizedProfile);
  const seedKeys = TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES.map((entry) => entry.key);

  const insertedCount = TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES.filter(
    (entry) => !existingByKey.has(entry.key)
  ).length;
  const updatedCount =
    TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES.filter((entry) =>
      hasSeedChanged(existingByKey.get(entry.key), entry)
    ).length - insertedCount;

  await collection.bulkWrite(
    TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES.map((entry) => ({
      updateOne: {
        filter: buildProfileScopedFilter(normalizedProfile, { key: entry.key }),
        update: {
          $set: {
            profile: normalizedProfile,
            key: entry.key,
            group: entry.group,
            kind: entry.kind,
            role: entry.role,
            description: entry.description,
            valueType: entry.valueType,
            valueJson: entry.valueJson,
            itemCount: entry.itemCount,
            preview: entry.preview,
            source: entry.source,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  const deleteResult = await collection.deleteMany(
    buildProfileScopedFilter(normalizedProfile, {
      key: { $nin: seedKeys },
    })
  );
  const deletedCount = deleteResult.deletedCount;

  return {
    insertedCount,
    updatedCount: Math.max(0, updatedCount),
    deletedCount,
    total: TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES.length,
    syncedAt: now.toISOString(),
    message:
      insertedCount > 0 || updatedCount > 0 || deletedCount > 0
        ? `Tradera selector registry profile "${normalizedProfile}" synced from code into Mongo.`
        : `Tradera selector registry profile "${normalizedProfile}" was already up to date.`,
  };
};

const ensureHydratedDefaultProfile = async (
  collection: Collection<TraderaSelectorRegistryDoc>
): Promise<void> => {
  const count = await collection.countDocuments(buildProfileFilter(DEFAULT_SELECTOR_PROFILE), {
    limit: 1,
  });

  if (count === 0) {
    await syncCollectionFromCode(collection, DEFAULT_SELECTOR_PROFILE);
  }
};

const isRuntimeEntryUsable = (entry: TraderaSelectorRegistryRuntimeEntry): boolean => {
  try {
    JSON.parse(entry.valueJson);
    return true;
  } catch {
    return false;
  }
};

const buildSeedRuntimeEntryMap = (): Map<string, TraderaSelectorRegistryRuntimeEntry> =>
  new Map(
    TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES.map((entry) => [
      entry.key,
      {
        key: entry.key,
        role: entry.role,
        valueJson: entry.valueJson,
      },
    ])
  );

const applyDocsToRuntimeEntryMap = (
  runtimeEntries: Map<string, TraderaSelectorRegistryRuntimeEntry>,
  docs: readonly TraderaSelectorRegistryDoc[],
  requestedProfile: string
): number => {
  let appliedCount = 0;

  for (const doc of buildDocMap(docs, requestedProfile).values()) {
    const entry = {
      key: doc.key,
      role: doc.role ?? resolveSeedEntry(doc.key).role,
      valueJson: doc.valueJson,
    };

    if (!isRuntimeEntryUsable(entry)) {
      continue;
    }

    runtimeEntries.set(doc.key, entry);
    appliedCount += 1;
  }

  return appliedCount;
};

const buildEffectivePersistedEntriesForProfile = async (
  collection: Collection<TraderaSelectorRegistryDoc>,
  profile: string
): Promise<PersistedTraderaSelectorRegistryEntry[]> => {
  await ensureHydratedDefaultProfile(collection);

  const [defaultDocs, sourceDocs] = await Promise.all([
    collection.find(buildProfileFilter(DEFAULT_SELECTOR_PROFILE)).toArray(),
    profile === DEFAULT_SELECTOR_PROFILE
      ? Promise.resolve<TraderaSelectorRegistryDoc[]>([])
      : collection.find(buildProfileFilter(profile)).toArray(),
  ]);

  if (profile !== DEFAULT_SELECTOR_PROFILE && sourceDocs.length === 0) {
    throw new Error(`Tradera selector profile "${profile}" does not exist.`);
  }

  const defaultDocMap = buildDocMap(defaultDocs, DEFAULT_SELECTOR_PROFILE);
  const sourceDocMap =
    profile === DEFAULT_SELECTOR_PROFILE
      ? defaultDocMap
      : buildDocMap(sourceDocs, profile);

  return TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES.map((seedEntry) => {
    const effectiveEntry =
      sourceDocMap.get(seedEntry.key) ?? defaultDocMap.get(seedEntry.key) ?? seedEntry;
    return toPersistedEntry(effectiveEntry, 'mongo');
  });
};

export async function listTraderaSelectorRegistry(options?: {
  profile?: string | null;
}): Promise<TraderaSelectorRegistryListResponse> {
  const collection = await getCollection();
  await ensureHydratedDefaultProfile(collection);

  const normalizedProfile =
    typeof options?.profile === 'string' && options.profile.trim().length > 0
      ? normalizeSelectorProfile(options.profile)
      : null;
  const docs = await collection
    .find(normalizedProfile !== null ? buildProfileFilter(normalizedProfile) : {})
    .sort({ profile: 1, group: 1, key: 1 })
    .toArray();
  const entries = docs.map(toDomain).sort((left, right) => {
    const profileCompare = left.profile.localeCompare(right.profile);
    if (profileCompare !== 0) return profileCompare;
    const groupCompare = left.group.localeCompare(right.group);
    if (groupCompare !== 0) return groupCompare;
    return left.key.localeCompare(right.key);
  });
  const syncedAt = docs.reduce<string | null>((latest, doc) => {
    const candidate = doc.updatedAt.toISOString();
    if (latest === null || candidate > latest) {
      return candidate;
    }
    return latest;
  }, null);

  return {
    entries,
    total: entries.length,
    syncedAt,
  };
}

export async function syncTraderaSelectorRegistryFromCode(options?: {
  profile?: string | null;
}): Promise<TraderaSelectorRegistrySyncResponse> {
  const collection = await getCollection();
  return syncCollectionFromCode(collection, options?.profile);
}

export async function saveTraderaSelectorRegistryEntry(input: {
  profile: string | null | undefined;
  key: string;
  valueJson: string;
  role?: TraderaSelectorRegistrySeedEntry['role'];
}): Promise<TraderaSelectorRegistrySaveResponse> {
  const normalizedProfile = normalizeSelectorProfile(input.profile);
  const normalizedKey = input.key.trim();
  const seedEntry = resolveSeedEntry(normalizedKey);
  const parsedValue = parseValueJson(input.valueJson, seedEntry.valueType, normalizedKey);
  const normalizedValueJson = JSON.stringify(parsedValue, null, 2);
  const itemCount = getItemCount(parsedValue);
  const preview = collectPreviewStrings(parsedValue);
  const now = new Date();
  const collection = await getCollection();

  await collection.updateOne(
    buildProfileScopedFilter(normalizedProfile, { key: normalizedKey }),
    {
      $set: {
        profile: normalizedProfile,
        key: normalizedKey,
        group: seedEntry.group,
        kind: seedEntry.kind,
        role: input.role ?? seedEntry.role,
        description: seedEntry.description,
        valueType: seedEntry.valueType,
        valueJson: normalizedValueJson,
        itemCount,
        preview,
        source: 'mongo',
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );

  return {
    profile: normalizedProfile,
    key: normalizedKey,
    itemCount,
    preview,
    message: `Tradera selector "${normalizedKey}" saved for profile "${normalizedProfile}".`,
  };
}

export async function deleteTraderaSelectorRegistryEntry(input: {
  profile: string | null | undefined;
  key: string;
}): Promise<TraderaSelectorRegistryDeleteResponse> {
  const normalizedProfile = normalizeSelectorProfile(input.profile);
  const normalizedKey = input.key.trim();
  resolveSeedEntry(normalizedKey);

  if (normalizedProfile === DEFAULT_SELECTOR_PROFILE) {
    throw new Error(
      'Default selector entries cannot be deleted. Sync the default profile from code to reset it.'
    );
  }

  const collection = await getCollection();
  const result = await collection.deleteOne({
    profile: normalizedProfile,
    key: normalizedKey,
  });
  const deleted = result.deletedCount > 0;

  return {
    profile: normalizedProfile,
    key: normalizedKey,
    deleted,
    message: deleted
      ? `Tradera selector "${normalizedKey}" reset for profile "${normalizedProfile}".`
      : `No selector override found for "${normalizedKey}" in profile "${normalizedProfile}".`,
  };
}

export async function cloneTraderaSelectorRegistryProfile(input: {
  sourceProfile: string | null | undefined;
  targetProfile: string | null | undefined;
}): Promise<TraderaSelectorRegistryProfileActionResponse> {
  const sourceProfile = normalizeSelectorProfile(input.sourceProfile);
  const targetProfile = normalizeSelectorProfile(input.targetProfile);

  requireNonDefaultProfile(targetProfile, 'Cloning');

  if (sourceProfile === targetProfile) {
    throw new Error('The target profile must be different from the source profile.');
  }

  const collection = await getCollection();
  const targetExists = await collection.countDocuments(buildProfileFilter(targetProfile), {
    limit: 1,
  });

  if (targetExists > 0) {
    throw new Error(`Tradera selector profile "${targetProfile}" already exists.`);
  }

  const entries = await buildEffectivePersistedEntriesForProfile(collection, sourceProfile);
  const now = new Date();

  await collection.bulkWrite(
    entries.map((entry) => ({
      updateOne: {
        filter: buildProfileScopedFilter(targetProfile, { key: entry.key }),
        update: {
          $set: {
            profile: targetProfile,
            ...entry,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  return {
    action: 'clone_profile',
    profile: sourceProfile,
    targetProfile,
    affectedEntries: entries.length,
    message: `Tradera selector profile "${sourceProfile}" cloned into "${targetProfile}".`,
  };
}

export async function renameTraderaSelectorRegistryProfile(input: {
  profile: string | null | undefined;
  targetProfile: string | null | undefined;
}): Promise<TraderaSelectorRegistryProfileActionResponse> {
  const profile = normalizeSelectorProfile(input.profile);
  const targetProfile = normalizeSelectorProfile(input.targetProfile);

  requireNonDefaultProfile(profile, 'Renaming');
  requireNonDefaultProfile(targetProfile, 'Renaming');

  if (profile === targetProfile) {
    throw new Error('The target profile name must be different.');
  }

  const collection = await getCollection();
  const [sourceExists, targetExists] = await Promise.all([
    collection.countDocuments({ profile }, { limit: 1 }),
    collection.countDocuments({ profile: targetProfile }, { limit: 1 }),
  ]);

  if (sourceExists === 0) {
    throw new Error(`Tradera selector profile "${profile}" does not exist.`);
  }

  if (targetExists > 0) {
    throw new Error(`Tradera selector profile "${targetProfile}" already exists.`);
  }

  const now = new Date();
  const result = await collection.updateMany(
    { profile },
    {
      $set: {
        profile: targetProfile,
        updatedAt: now,
      },
    }
  );

  return {
    action: 'rename_profile',
    profile,
    targetProfile,
    affectedEntries: result.modifiedCount,
    message: `Tradera selector profile "${profile}" renamed to "${targetProfile}".`,
  };
}

export async function deleteTraderaSelectorRegistryProfile(input: {
  profile: string | null | undefined;
}): Promise<TraderaSelectorRegistryProfileActionResponse> {
  const profile = normalizeSelectorProfile(input.profile);

  requireNonDefaultProfile(profile, 'Deleting');

  const collection = await getCollection();
  const result = await collection.deleteMany({ profile });
  const affectedEntries = result.deletedCount;

  return {
    action: 'delete_profile',
    profile,
    targetProfile: null,
    affectedEntries,
    message:
      affectedEntries > 0
        ? `Tradera selector profile "${profile}" deleted from Mongo.`
        : `No selector entries were stored for profile "${profile}".`,
  };
}

export async function resolveTraderaSelectorRegistryRuntime(options?: {
  profile?: string | null;
}): Promise<ResolvedTraderaSelectorRegistryRuntime> {
  const requestedProfile = normalizeSelectorProfile(options?.profile);

  try {
    const collection = await getCollection();
    await ensureHydratedDefaultProfile(collection);

    const [defaultDocs, requestedProfileDocs] = await Promise.all([
      collection.find(buildProfileFilter(DEFAULT_SELECTOR_PROFILE)).toArray(),
      requestedProfile === DEFAULT_SELECTOR_PROFILE
        ? Promise.resolve([])
        : collection.find(buildProfileFilter(requestedProfile)).toArray(),
    ]);

    const runtimeEntries = buildSeedRuntimeEntryMap();
    applyDocsToRuntimeEntryMap(runtimeEntries, defaultDocs, DEFAULT_SELECTOR_PROFILE);

    const overlayEntryCount =
      requestedProfile === DEFAULT_SELECTOR_PROFILE
        ? 0
        : applyDocsToRuntimeEntryMap(runtimeEntries, requestedProfileDocs, requestedProfile);
    const resolvedProfile =
      requestedProfile !== DEFAULT_SELECTOR_PROFILE && overlayEntryCount > 0
        ? requestedProfile
        : DEFAULT_SELECTOR_PROFILE;

    return {
      runtime: generateTraderaSelectorRegistryRuntimeFromEntries([...runtimeEntries.values()]),
      requestedProfile,
      resolvedProfile,
      sourceProfiles:
        resolvedProfile === DEFAULT_SELECTOR_PROFILE
          ? [DEFAULT_SELECTOR_PROFILE]
          : [DEFAULT_SELECTOR_PROFILE, resolvedProfile],
      entryCount: runtimeEntries.size,
      overlayEntryCount,
      fallbackToCode: false,
    };
  } catch (error) {
    return {
      runtime: TRADERA_SELECTOR_REGISTRY_RUNTIME,
      requestedProfile,
      resolvedProfile: DEFAULT_SELECTOR_PROFILE,
      sourceProfiles: ['code'],
      entryCount: TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES.length,
      overlayEntryCount: 0,
      fallbackToCode: true,
      fallbackReason: error instanceof Error ? error.message : 'Unknown selector runtime error.',
    };
  }
}
