import 'server-only';

import { MongoClient, type Db } from 'mongodb';

import { configurationError } from '@/shared/errors/app-error';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { resolveStudiqMongoSourceConfig } from '@/shared/lib/db/utils/mongo';

// ---------------------------------------------------------------------------
// Collection selection (mirrors scripts/db/studiq-mongo-selection.mjs)
// ---------------------------------------------------------------------------

const SETTINGS_FILTER = {
  $or: [{ key: /^kangur_/ }, { _id: /^kangur_/ }],
} as const;

const ANALYTICS_FILTER = {
  path: /^\/(kangur|[a-z]{2}\/kangur)(\/|$)/,
} as const;

const isFullStudiqCollection = (name: string): boolean =>
  name.startsWith('kangur_') ||
  name === 'auth_login_challenges' ||
  name === 'auth_security_attempts';

type StudiqSelection = {
  name: string;
  filter: Record<string, unknown>;
  scope: 'full-collection' | 'related-auth' | 'studiq-settings' | 'studiq-analytics';
};

const buildIdCandidates = (
  ids: Array<string | null | undefined>
): { stringIds: string[] } => {
  const stringIds = [...new Set(ids.filter((id): id is string => id !== null && id !== undefined))];
  return { stringIds };
};

async function buildRelatedAuthFilters(
  sourceDb: Db,
  sourceCollectionNames: Set<string>
): Promise<Record<string, Record<string, unknown>>> {
  if (!sourceCollectionNames.has('kangur_learners')) {
    return {};
  }

  const learners = await sourceDb
    .collection<{ ownerUserId?: string; legacyUserKey?: string }>('kangur_learners')
    .find({}, { projection: { ownerUserId: 1, legacyUserKey: 1 } })
    .toArray();

  const ownerUserIds = [...new Set(
    learners.map((l) => l.ownerUserId).filter((id): id is string => id !== null && id !== undefined)
  )];
  const legacyEmails = [...new Set(
    learners.map((l) => l.legacyUserKey).filter((v): v is string => v !== null && v !== undefined)
  )];
  const ownerCandidates = buildIdCandidates(ownerUserIds);

  const usersFilter = {
    $or: [
      { id: { $in: ownerCandidates.stringIds } },
      { email: { $in: legacyEmails } },
    ],
  };

  const users = sourceCollectionNames.has('users')
    ? await sourceDb
        .collection<{ _id: unknown; id?: string }>('users')
        .find(usersFilter, { projection: { _id: 1, id: 1 } })
        .toArray()
    : [];

  const relatedUserIds = [...new Set([
    ...ownerUserIds,
    ...users.map((u) => String(u._id)),
    ...users.map((u) => u.id).filter((id): id is string => id !== null && id !== undefined),
  ])];
  const relatedCandidates = buildIdCandidates(relatedUserIds);

  const userLinkedFilter = { userId: { $in: relatedCandidates.stringIds } };

  return {
    users: {
      $or: [
        { id: { $in: relatedCandidates.stringIds } },
        { email: { $in: legacyEmails } },
      ],
    },
    accounts: userLinkedFilter,
    sessions: userLinkedFilter,
    auth_security_profiles: userLinkedFilter,
    user_preferences: {
      $or: [
        { userId: { $in: relatedCandidates.stringIds } },
      ],
    },
  };
}

async function collectStudiqSelections(sourceDb: Db): Promise<StudiqSelection[]> {
  const sourceCollections = await sourceDb.listCollections({}, { nameOnly: true }).toArray();
  const sourceCollectionNames = new Set(sourceCollections.map((c) => c.name));

  const selections: StudiqSelection[] = [...sourceCollectionNames]
    .filter(isFullStudiqCollection)
    .sort()
    .map((name) => ({ name, filter: {}, scope: 'full-collection' as const }));

  const relatedAuthFilters = await buildRelatedAuthFilters(sourceDb, sourceCollectionNames);
  for (const [name, filter] of Object.entries(relatedAuthFilters)) {
    if (!sourceCollectionNames.has(name)) continue;
    selections.push({ name, filter: filter as Record<string, unknown>, scope: 'related-auth' });
  }

  if (sourceCollectionNames.has('settings')) {
    selections.push({ name: 'settings', filter: SETTINGS_FILTER as Record<string, unknown>, scope: 'studiq-settings' });
  }

  if (sourceCollectionNames.has('analytics_events')) {
    selections.push({ name: 'analytics_events', filter: ANALYTICS_FILTER as Record<string, unknown>, scope: 'studiq-analytics' });
  }

  return selections;
}

// ---------------------------------------------------------------------------
// Progress & result types
// ---------------------------------------------------------------------------

export type StudiqPushProgress = {
  step: number;
  total: number;
  phase: 'connecting' | 'scanning' | 'writing' | 'done';
  message: string;
};

export type StudiqPushToCloudResult = {
  collections: string[];
  collectionCount: number;
  documentCount: number;
  updatedAt: string;
};

export type StudiqSourceStatus = {
  localConfigured: boolean;
  cloudConfigured: boolean;
};

export function getStudiqSourceStatus(): StudiqSourceStatus {
  const localConfig = resolveStudiqMongoSourceConfig('local');
  const cloudConfig = resolveStudiqMongoSourceConfig('cloud');
  return {
    localConfigured: localConfig.configured,
    cloudConfigured: cloudConfig.configured,
  };
}

// ---------------------------------------------------------------------------
// Core push function
// ---------------------------------------------------------------------------

const buildMongoOptions = (uri: string) => ({
  ...(uri.startsWith('mongodb+srv://') ? {} : { directConnection: true }),
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 60_000,
});

export async function pushStudiqLocalToCloud(
  onProgress?: (p: StudiqPushProgress) => Promise<void>
): Promise<StudiqPushToCloudResult> {
  const report = onProgress ?? (() => Promise.resolve());
  const now = new Date();

  const localConfig = resolveStudiqMongoSourceConfig('local');
  const cloudConfig = resolveStudiqMongoSourceConfig('cloud');

  if (!cloudConfig.configured || !cloudConfig.uri) {
    throw configurationError(
      'StudiQ cloud MongoDB is not configured. Set STUDIQ_MONGODB_CLOUD_URI and STUDIQ_MONGODB_CLOUD_DB.'
    );
  }

  if (!localConfig.uri) {
    throw configurationError('StudiQ local MongoDB URI is unavailable.');
  }

  await report({ step: 1, total: 4, phase: 'connecting', message: 'Connecting to local StudiQ database…' });

  const localClient = new MongoClient(localConfig.uri, buildMongoOptions(localConfig.uri));
  const cloudClient = new MongoClient(cloudConfig.uri, buildMongoOptions(cloudConfig.uri));

  try {
    await localClient.connect();
    await cloudClient.connect();

    const localDb = localClient.db(localConfig.dbName);
    const cloudDb = cloudClient.db(cloudConfig.dbName ?? undefined);

    await report({ step: 2, total: 4, phase: 'scanning', message: 'Scanning local collections…' });

    const selections = await collectStudiqSelections(localDb);

    if (selections.length === 0) {
      throw configurationError(
        'No StudiQ collections found in the local database. Run copy-studiq-local-mongo first.'
      );
    }

    const TOTAL_STEPS = 2 + selections.length + 1;

    await report({
      step: 3,
      total: TOTAL_STEPS,
      phase: 'writing',
      message: `Found ${selections.length} collection(s) — writing to cloud…`,
    });

    let totalDocuments = 0;
    const pushedCollections: string[] = [];

    for (let i = 0; i < selections.length; i++) {
      const selection = selections[i]!;

      await report({
        step: 3 + i + 1,
        total: TOTAL_STEPS,
        phase: 'writing',
        message: `Writing ${selection.name} (${i + 1}/${selections.length})…`,
      });

      const docs = await localDb.collection(selection.name).find(selection.filter).toArray();
      const cloudCollection = cloudDb.collection(selection.name);

      await cloudCollection.deleteMany(selection.filter as Parameters<typeof cloudCollection.deleteMany>[0]);

      if (docs.length > 0) {
        await cloudCollection.insertMany(docs as Parameters<typeof cloudCollection.insertMany>[0]);
        totalDocuments += docs.length;
      }

      pushedCollections.push(selection.name);
    }

    await report({
      step: TOTAL_STEPS,
      total: TOTAL_STEPS,
      phase: 'done',
      message: `Synced ${pushedCollections.length} collections, ${totalDocuments} documents`,
    });

    void logSystemEvent({
      level: 'info',
      source: 'studiq-push-to-cloud',
      message: `StudiQ push complete — ${pushedCollections.length} collections, ${totalDocuments} documents`,
      context: { collectionCount: pushedCollections.length, documentCount: totalDocuments, updatedAt: now.toISOString() },
    });

    return {
      collections: pushedCollections,
      collectionCount: pushedCollections.length,
      documentCount: totalDocuments,
      updatedAt: now.toISOString(),
    };
  } finally {
    await localClient.close().catch(() => undefined);
    await cloudClient.close().catch(() => undefined);
  }
}
