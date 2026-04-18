import type { Collection, Document, Filter, ObjectId } from 'mongodb';

import type {
  SelectorRegistryDeleteResponse,
  SelectorRegistryEntry,
  SelectorRegistryProfileActionResponse,
  SelectorRegistryRole,
  SelectorRegistrySaveResponse,
  SelectorRegistrySyncResponse,
  SelectorRegistryValueType,
} from '@/shared/contracts/integrations/selector-registry';
import { inferSelectorRegistryRole } from '@/shared/lib/browser-execution/selector-registry-roles';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

const COLLECTION_NAME = 'integration_custom_selector_registry';
const DEFAULT_SELECTOR_PROFILE = 'custom';

type CustomSelectorRegistryValue = string | string[];

type CustomSelectorRegistryDoc = Document & {
  _id: ObjectId;
  profile?: string;
  key: string;
  group: string;
  kind: 'selector' | 'selectors';
  role?: SelectorRegistryRole;
  description: string | null;
  valueType: SelectorRegistryValueType;
  valueJson: string;
  itemCount: number;
  preview: string[];
  source: 'code' | 'mongo';
  createdAt: Date;
  updatedAt: Date;
};

type CustomSeedDefinition = {
  key: string;
  group: string;
  kind: 'selector';
  role: SelectorRegistryRole;
  description: string;
};

const CUSTOM_SELECTOR_REGISTRY_DEFINITIONS: CustomSeedDefinition[] = [
  {
    key: 'custom.form.input',
    group: 'custom.form',
    kind: 'selector',
    role: 'input',
    description: 'Primary text or search input selector for a custom website flow.',
  },
  {
    key: 'custom.form.submit',
    group: 'custom.form',
    kind: 'selector',
    role: 'submit',
    description: 'Primary submit or apply button selector for a custom website flow.',
  },
  {
    key: 'custom.discovery.result_hint',
    group: 'custom.discovery',
    kind: 'selector',
    role: 'result_hint',
    description: 'Result card or result link selector for a custom discovery page.',
  },
  {
    key: 'custom.discovery.result_shell',
    group: 'custom.discovery',
    kind: 'selector',
    role: 'result_shell',
    description: 'Container selector wrapping a custom result list or result shell.',
  },
  {
    key: 'custom.discovery.candidate_hint',
    group: 'custom.discovery',
    kind: 'selector',
    role: 'candidate_hint',
    description: 'Candidate selector for comparison or matching flows on a custom page.',
  },
  {
    key: 'custom.content.root',
    group: 'custom.content',
    kind: 'selector',
    role: 'content',
    description: 'Main content selector for a product or detail region on a custom page.',
  },
  {
    key: 'custom.content.title',
    group: 'custom.content',
    kind: 'selector',
    role: 'content_title',
    description: 'Title selector for product or content extraction on a custom page.',
  },
  {
    key: 'custom.content.price',
    group: 'custom.content',
    kind: 'selector',
    role: 'content_price',
    description: 'Price selector for product extraction on a custom page.',
  },
  {
    key: 'custom.content.description',
    group: 'custom.content',
    kind: 'selector',
    role: 'content_description',
    description: 'Description selector for product extraction on a custom page.',
  },
  {
    key: 'custom.content.image',
    group: 'custom.content',
    kind: 'selector',
    role: 'content_image',
    description: 'Image selector for hero or gallery extraction on a custom page.',
  },
  {
    key: 'custom.navigation.primary',
    group: 'custom.navigation',
    kind: 'selector',
    role: 'navigation',
    description: 'Primary navigation or pagination selector for custom flows.',
  },
  {
    key: 'custom.overlay.accept',
    group: 'custom.overlay',
    kind: 'selector',
    role: 'overlay_accept',
    description: 'Consent or accept selector for custom overlays.',
  },
  {
    key: 'custom.overlay.dismiss',
    group: 'custom.overlay',
    kind: 'selector',
    role: 'overlay_dismiss',
    description: 'Dismiss or close selector for custom overlays.',
  },
  {
    key: 'custom.state.ready',
    group: 'custom.state',
    kind: 'selector',
    role: 'ready_signal',
    description: 'Selector indicating a custom page is ready for the next action.',
  },
  {
    key: 'custom.state.feedback',
    group: 'custom.state',
    kind: 'selector',
    role: 'feedback',
    description: 'Feedback or validation selector on a custom page.',
  },
  {
    key: 'custom.access.barrier',
    group: 'custom.access',
    kind: 'selector',
    role: 'barrier',
    description: 'Access-barrier selector such as login gate or anti-bot prompt.',
  },
  {
    key: 'custom.access.barrier_title',
    group: 'custom.access',
    kind: 'selector',
    role: 'barrier_title',
    description: 'Barrier title selector for a custom access-blocking surface.',
  },
];

const SEED_ENTRY_BY_KEY = new Map(
  CUSTOM_SELECTOR_REGISTRY_DEFINITIONS.map((entry) => [entry.key, entry])
);

let indexesReady = false;

const getCollection = async (): Promise<Collection<CustomSelectorRegistryDoc>> => {
  const db = await getMongoDb();
  const collection = db.collection<CustomSelectorRegistryDoc>(COLLECTION_NAME);
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

const buildProfileFilter = (profile: string): Filter<CustomSelectorRegistryDoc> =>
  profile === DEFAULT_SELECTOR_PROFILE
    ? {
        $or: [{ profile: DEFAULT_SELECTOR_PROFILE }, { profile: { $exists: false } }],
      }
    : { profile };

const buildProfileScopedFilter = (
  profile: string,
  fields: Record<string, unknown>
): Filter<CustomSelectorRegistryDoc> =>
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

const resolveGroup = (key: string): string => {
  const seedEntry = SEED_ENTRY_BY_KEY.get(key);
  if (seedEntry) return seedEntry.group;
  const segments = key.split('.').filter(Boolean);
  return segments.slice(0, 2).join('.') || 'custom.registry';
};

const detectValueType = (value: CustomSelectorRegistryValue): SelectorRegistryValueType =>
  Array.isArray(value) ? 'string_array' : 'string';

const parseValueJson = (valueJson: string, key: string): CustomSelectorRegistryValue => {
  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(valueJson);
  } catch {
    throw new Error(`Custom selector registry value for "${key}" must be valid JSON.`);
  }

  if (typeof parsedValue === 'string') {
    return parsedValue;
  }
  if (Array.isArray(parsedValue) && parsedValue.every((entry) => typeof entry === 'string')) {
    return parsedValue;
  }

  throw new Error(
    `Custom selector registry value for "${key}" must be a string or string array.`
  );
};

const normalizeValueJson = (value: CustomSelectorRegistryValue): string => JSON.stringify(value);

const getItemCount = (value: CustomSelectorRegistryValue): number =>
  Array.isArray(value) ? value.length : value.trim().length > 0 ? 1 : 0;

const getPreview = (value: CustomSelectorRegistryValue): string[] =>
  (Array.isArray(value) ? value : [value])
    .filter((entry) => entry.trim().length > 0)
    .slice(0, 6);

const inferKind = (valueType: SelectorRegistryValueType): 'selector' | 'selectors' =>
  valueType === 'string' ? 'selector' : 'selectors';

const toDomain = (doc: CustomSelectorRegistryDoc): SelectorRegistryEntry => ({
  id: doc._id.toString(),
  namespace: 'custom',
  profile: normalizeSelectorProfile(doc.profile),
  key: doc.key,
  group: doc.group,
  kind: doc.kind,
  role:
    doc.role ??
    inferSelectorRegistryRole({
      namespace: 'custom',
      key: doc.key,
      kind: doc.kind,
      group: doc.group,
    }),
  description: doc.description,
  valueType: doc.valueType,
  valueJson: doc.valueJson,
  itemCount: doc.itemCount,
  preview: doc.preview,
  source: doc.source,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

const toSeedEntry = (
  profile: string,
  seed: CustomSeedDefinition,
  nowIso: string
): SelectorRegistryEntry => ({
  id: `code:${profile}:${seed.key}`,
  namespace: 'custom',
  profile,
  key: seed.key,
  group: seed.group,
  kind: seed.kind,
  role: seed.role,
  description: seed.description,
  valueType: 'string',
  valueJson: JSON.stringify(''),
  itemCount: 0,
  preview: [],
  source: 'code',
  createdAt: nowIso,
  updatedAt: nowIso,
});

const buildEffectiveEntriesForProfile = async (
  collection: Collection<CustomSelectorRegistryDoc>,
  profile: string
): Promise<SelectorRegistryEntry[]> => {
  const docs = await collection.find(buildProfileFilter(profile)).sort({ key: 1 }).toArray();
  const docsByKey = new Map(docs.map((doc) => [doc.key, doc]));
  const nowIso = new Date().toISOString();
  const seededFallbacks = CUSTOM_SELECTOR_REGISTRY_DEFINITIONS
    .filter((seed) => !docsByKey.has(seed.key))
    .map((seed) => toSeedEntry(profile, seed, nowIso));
  return [...docs.map((doc) => ({ ...toDomain(doc), profile })), ...seededFallbacks].sort(
    (left, right) => {
      const groupCompare = left.group.localeCompare(right.group);
      return groupCompare !== 0 ? groupCompare : left.key.localeCompare(right.key);
    }
  );
};

const latestSyncedAt = (entries: readonly SelectorRegistryEntry[]): string | null =>
  entries.reduce<string | null>((latest, entry) => {
    const candidate = entry.updatedAt;
    return latest === null || candidate > latest ? candidate : latest;
  }, null);

const syncProfile = async (
  collection: Collection<CustomSelectorRegistryDoc>,
  profile: string
): Promise<SelectorRegistrySyncResponse> => {
  const now = new Date();
  let insertedCount = 0;
  let updatedCount = 0;

  for (const seed of CUSTOM_SELECTOR_REGISTRY_DEFINITIONS) {
    const existing = await collection.findOne(buildProfileScopedFilter(profile, { key: seed.key }));

    if (existing?.source === 'mongo') continue;

    if (!existing) {
      await collection.insertOne({
        profile,
        key: seed.key,
        group: seed.group,
        kind: seed.kind,
        role: seed.role,
        description: seed.description,
        valueType: 'string',
        valueJson: JSON.stringify(''),
        itemCount: 0,
        preview: [],
        source: 'code',
        createdAt: now,
        updatedAt: now,
      } as CustomSelectorRegistryDoc);
      insertedCount += 1;
      continue;
    }

    const result = await collection.updateOne(
      { _id: existing._id },
      {
        $set: {
          profile,
          key: seed.key,
          group: seed.group,
          kind: seed.kind,
          role: seed.role,
          description: seed.description,
          valueType: 'string',
          valueJson: JSON.stringify(''),
          itemCount: 0,
          preview: [],
          source: 'code',
          updatedAt: now,
        },
      }
    );
    updatedCount += result.modifiedCount;
  }

  const total = await collection.countDocuments(buildProfileFilter(profile));
  const syncedAt = now.toISOString();
  return {
    namespace: 'custom',
    insertedCount,
    updatedCount,
    deletedCount: 0,
    total,
    syncedAt,
    message:
      insertedCount > 0 || updatedCount > 0
        ? `Custom selector registry profile "${profile}" synced from code into Mongo.`
        : `Custom selector registry profile "${profile}" was already up to date.`,
  };
};

export async function listCustomSelectorRegistry(options?: {
  profile?: string | null;
}): Promise<{
  entries: SelectorRegistryEntry[];
  profiles: string[];
  syncedAt: string | null;
}> {
  const profile = normalizeSelectorProfile(options?.profile);
  const collection = await getCollection();
  const [entries, storedProfiles] = await Promise.all([
    buildEffectiveEntriesForProfile(collection, profile),
    collection.distinct('profile'),
  ]);
  return {
    entries,
    profiles: Array.from(
      new Set([DEFAULT_SELECTOR_PROFILE, profile, ...storedProfiles])
    )
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .sort((left, right) => left.localeCompare(right)),
    syncedAt: latestSyncedAt(entries),
  };
}

export async function syncCustomSelectorRegistryFromCode(options?: {
  profile?: string | null;
}): Promise<SelectorRegistrySyncResponse> {
  const profile = normalizeSelectorProfile(options?.profile);
  const collection = await getCollection();
  return syncProfile(collection, profile);
}

export async function saveCustomSelectorRegistryEntry(input: {
  profile: string;
  key: string;
  valueJson: string;
  role?: SelectorRegistryRole;
}): Promise<SelectorRegistrySaveResponse> {
  const profile = normalizeSelectorProfile(input.profile);
  const key = input.key.trim();
  if (key.length === 0) {
    throw new Error('Custom selector registry key is required.');
  }

  const value = parseValueJson(input.valueJson, key);
  const valueType = detectValueType(value);
  const kind = inferKind(valueType);
  const group = resolveGroup(key);
  const seedEntry = SEED_ENTRY_BY_KEY.get(key);
  const role =
    input.role ??
    seedEntry?.role ??
    inferSelectorRegistryRole({ namespace: 'custom', key, kind, group });
  const description = seedEntry?.description ?? null;
  const now = new Date();
  const collection = await getCollection();

  await collection.updateOne(
    buildProfileScopedFilter(profile, { key }),
    {
      $set: {
        profile,
        key,
        group,
        kind,
        role,
        description,
        valueType,
        valueJson: normalizeValueJson(value),
        itemCount: getItemCount(value),
        preview: getPreview(value),
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
    namespace: 'custom',
    profile,
    key,
    itemCount: getItemCount(value),
    preview: getPreview(value),
    message: `Custom selector registry entry "${key}" saved for profile "${profile}".`,
  };
}

export async function deleteCustomSelectorRegistryEntry(input: {
  profile: string;
  key: string;
}): Promise<SelectorRegistryDeleteResponse> {
  const profile = normalizeSelectorProfile(input.profile);
  requireNonDefaultProfile(profile, 'Deleting selector overrides');
  const key = input.key.trim();
  const collection = await getCollection();
  const result = await collection.deleteOne(buildProfileScopedFilter(profile, { key }));
  if (result.deletedCount === 0) {
    throw new Error(
      `Custom selector registry entry "${key}" was not found in profile "${profile}".`
    );
  }
  return {
    namespace: 'custom',
    profile,
    key,
    deleted: true,
    message: `Custom selector registry entry "${key}" deleted from profile "${profile}".`,
  };
}

export async function cloneCustomSelectorRegistryProfile(input: {
  sourceProfile: string;
  targetProfile: string;
}): Promise<SelectorRegistryProfileActionResponse> {
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
    throw new Error(`Custom selector registry profile "${targetProfile}" already exists.`);
  }

  const entries = await buildEffectiveEntriesForProfile(collection, sourceProfile);
  const now = new Date();
  await collection.bulkWrite(
    entries.map((entry) => ({
      updateOne: {
        filter: buildProfileScopedFilter(targetProfile, { key: entry.key }),
        update: {
          $set: {
            profile: targetProfile,
            key: entry.key,
            group: entry.group,
            kind: entry.kind === 'selectors' ? 'selectors' : 'selector',
            role: entry.role,
            description: entry.description,
            valueType: entry.valueType,
            valueJson: entry.valueJson,
            itemCount: entry.itemCount,
            preview: entry.preview,
            source: 'mongo',
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        upsert: true,
      },
    }))
  );

  return {
    namespace: 'custom',
    action: 'clone_profile',
    profile: sourceProfile,
    targetProfile,
    affectedEntries: entries.length,
    message: `Cloned custom selector registry profile "${sourceProfile}" to "${targetProfile}".`,
  };
}

export async function renameCustomSelectorRegistryProfile(input: {
  profile: string;
  targetProfile: string;
}): Promise<SelectorRegistryProfileActionResponse> {
  const profile = normalizeSelectorProfile(input.profile);
  const targetProfile = normalizeSelectorProfile(input.targetProfile);
  requireNonDefaultProfile(profile, 'Renaming');
  requireNonDefaultProfile(targetProfile, 'Renaming');
  if (profile === targetProfile) {
    throw new Error('The target profile name must be different.');
  }

  const collection = await getCollection();
  const [profileCount, targetCount] = await Promise.all([
    collection.countDocuments(buildProfileFilter(profile), { limit: 1 }),
    collection.countDocuments(buildProfileFilter(targetProfile), { limit: 1 }),
  ]);

  if (profileCount === 0) {
    throw new Error(`Custom selector registry profile "${profile}" does not exist.`);
  }
  if (targetCount > 0) {
    throw new Error(`Custom selector registry profile "${targetProfile}" already exists.`);
  }

  const result = await collection.updateMany(buildProfileFilter(profile), {
    $set: { profile: targetProfile, updatedAt: new Date() },
  });

  return {
    namespace: 'custom',
    action: 'rename_profile',
    profile,
    targetProfile,
    affectedEntries: result.modifiedCount,
    message: `Renamed custom selector registry profile "${profile}" to "${targetProfile}".`,
  };
}

export async function deleteCustomSelectorRegistryProfile(input: {
  profile: string;
}): Promise<SelectorRegistryProfileActionResponse> {
  const profile = normalizeSelectorProfile(input.profile);
  requireNonDefaultProfile(profile, 'Deleting');
  const collection = await getCollection();
  const result = await collection.deleteMany(buildProfileFilter(profile));
  return {
    namespace: 'custom',
    action: 'delete_profile',
    profile,
    targetProfile: null,
    affectedEntries: result.deletedCount,
    message: `Deleted custom selector registry profile "${profile}".`,
  };
}
