import 'dotenv/config';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

type CliOptions = {
  dryRun: boolean;
  projectId: string | null;
};

type CollectionMigrationSummary = {
  collection: string;
  scanned: number;
  changed: number;
  rewrittenModeTokens: number;
  writesAttempted: number;
  writesApplied: number;
  writesFailed: number;
  writeFailures: Array<{ id: string; message: string }>;
};

type MigrationSummary = {
  mode: 'dry-run' | 'write';
  projectId: string | 'all';
  collections: CollectionMigrationSummary[];
  totals: {
    scanned: number;
    changed: number;
    rewrittenModeTokens: number;
    writesAttempted: number;
    writesApplied: number;
    writesFailed: number;
  };
};

type ModeTransformResult<T> = {
  value: T;
  changed: boolean;
  rewrittenModeTokens: number;
};

type MongoDoc = {
  _id: unknown;
  projectId?: unknown;
  request?: unknown;
  historyEvents?: unknown;
  metadata?: unknown;
};

const IMAGE_STUDIO_RUNS_COLLECTION = 'image_studio_runs';
const IMAGE_STUDIO_SEQUENCE_RUNS_COLLECTION = 'image_studio_sequence_runs';
const IMAGE_STUDIO_SLOTS_COLLECTION = 'image_studio_slots';
const IMAGE_STUDIO_SLOT_LINKS_COLLECTION = 'image_studio_slot_links';

const LEGACY_TO_CANONICAL_MODE: Record<string, string> = {
  client_object_layout_v1: 'client_object_layout',
  server_object_layout_v1: 'server_object_layout',
  client_analysis_v1: 'client_analysis',
  server_analysis_v1: 'server_analysis',
  client_auto_scaler_v1: 'client_auto_scaler',
  server_auto_scaler_v1: 'server_auto_scaler',
};

const CANONICAL_MODE_VALUES = new Set<string>([
  'client_object_layout',
  'server_object_layout',
  'client_analysis',
  'server_analysis',
  'client_auto_scaler',
  'server_auto_scaler',
]);

const MODE_FIELD_KEYS = new Set<string>(['mode', 'effectiveMode', 'requestedMode']);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const stringifyId = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
    return String(value);
  }
  return '[unknown]';
};

const parseCliOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    projectId: null,
  };

  for (const arg of argv) {
    if (arg === '--write') {
      options.dryRun = false;
      continue;
    }
    if (arg.startsWith('--project=')) {
      const raw = arg.slice('--project='.length).trim();
      if (raw) {
        options.projectId = raw.replace(/[^a-zA-Z0-9-_]/g, '_');
      }
    }
  }

  return options;
};

const normalizeModeValue = (raw: unknown): ModeTransformResult<unknown> => {
  if (typeof raw !== 'string') {
    return {
      value: raw,
      changed: false,
      rewrittenModeTokens: 0,
    };
  }

  const trimmed = raw.trim();
  const mapped = LEGACY_TO_CANONICAL_MODE[trimmed];
  if (mapped) {
    return {
      value: mapped,
      changed: mapped !== raw,
      rewrittenModeTokens: 1,
    };
  }

  if (CANONICAL_MODE_VALUES.has(trimmed) && trimmed !== raw) {
    return {
      value: trimmed,
      changed: true,
      rewrittenModeTokens: 1,
    };
  }

  return {
    value: raw,
    changed: false,
    rewrittenModeTokens: 0,
  };
};

const rewriteModeFieldsDeep = <T>(value: T, key: string | null = null): ModeTransformResult<T> => {
  if (MODE_FIELD_KEYS.has(key ?? '')) {
    const normalized = normalizeModeValue(value);
    return {
      value: normalized.value as T,
      changed: normalized.changed,
      rewrittenModeTokens: normalized.rewrittenModeTokens,
    };
  }

  if (Array.isArray(value)) {
    let changed = false;
    let rewrittenModeTokens = 0;
    const next = value.map((item: unknown) => {
      const migrated = rewriteModeFieldsDeep(item, null);
      if (migrated.changed) changed = true;
      rewrittenModeTokens += migrated.rewrittenModeTokens;
      return migrated.value;
    });
    return {
      value: (changed ? next : value) as T,
      changed,
      rewrittenModeTokens,
    };
  }

  if (!isPlainObject(value)) {
    return {
      value,
      changed: false,
      rewrittenModeTokens: 0,
    };
  }

  let changed = false;
  let rewrittenModeTokens = 0;
  const next: Record<string, unknown> = {};

  for (const [entryKey, entryValue] of Object.entries(value)) {
    const migrated = rewriteModeFieldsDeep(entryValue, entryKey);
    next[entryKey] = migrated.value;
    if (migrated.changed) changed = true;
    rewrittenModeTokens += migrated.rewrittenModeTokens;
  }

  return {
    value: (changed ? next : value) as T,
    changed,
    rewrittenModeTokens,
  };
};

const buildProjectFilter = (projectId: string | null): Record<string, unknown> =>
  projectId ? { projectId } : {};

const migrateModeFieldsForCollection = async (input: {
  collectionName: string;
  options: CliOptions;
  migrateDoc: (
    doc: MongoDoc
  ) => {
    changed: boolean;
    rewrittenModeTokens: number;
    setPatch: Record<string, unknown>;
  };
  projection: Record<string, 0 | 1>;
}): Promise<CollectionMigrationSummary> => {
  const db = await getMongoDb();
  const collection = db.collection<MongoDoc>(input.collectionName);
  const filter = buildProjectFilter(input.options.projectId);

  const summary: CollectionMigrationSummary = {
    collection: input.collectionName,
    scanned: 0,
    changed: 0,
    rewrittenModeTokens: 0,
    writesAttempted: 0,
    writesApplied: 0,
    writesFailed: 0,
    writeFailures: [],
  };

  const cursor = collection.find(filter, {
    projection: input.projection,
  });

  for await (const doc of cursor) {
    summary.scanned += 1;
    const migrated = input.migrateDoc(doc);
    if (!migrated.changed) continue;

    summary.changed += 1;
    summary.rewrittenModeTokens += migrated.rewrittenModeTokens;

    if (input.options.dryRun) continue;

    summary.writesAttempted += 1;
    try {
      await collection.updateOne(
        { _id: doc._id },
        {
          $set: {
            ...migrated.setPatch,
            updatedAt: new Date().toISOString(),
          },
        }
      );
      summary.writesApplied += 1;
    } catch (error) {
      summary.writesFailed += 1;
      summary.writeFailures.push({
        id: stringifyId(doc._id),
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return summary;
};

const migrateRunsCollection = async (options: CliOptions): Promise<CollectionMigrationSummary> =>
  migrateModeFieldsForCollection({
    collectionName: IMAGE_STUDIO_RUNS_COLLECTION,
    options,
    projection: {
      _id: 1,
      projectId: 1,
      request: 1,
      historyEvents: 1,
      updatedAt: 1,
    },
    migrateDoc: (doc: MongoDoc) => {
      const migratedRequest = rewriteModeFieldsDeep(doc.request ?? null);
      const migratedHistory = rewriteModeFieldsDeep(doc.historyEvents ?? null);
      const changed = migratedRequest.changed || migratedHistory.changed;
      return {
        changed,
        rewrittenModeTokens:
          migratedRequest.rewrittenModeTokens + migratedHistory.rewrittenModeTokens,
        setPatch: {
          ...(migratedRequest.changed ? { request: migratedRequest.value } : {}),
          ...(migratedHistory.changed ? { historyEvents: migratedHistory.value } : {}),
        },
      };
    },
  });

const migrateSequenceRunsCollection = async (
  options: CliOptions
): Promise<CollectionMigrationSummary> =>
  migrateModeFieldsForCollection({
    collectionName: IMAGE_STUDIO_SEQUENCE_RUNS_COLLECTION,
    options,
    projection: {
      _id: 1,
      projectId: 1,
      request: 1,
      historyEvents: 1,
      updatedAt: 1,
    },
    migrateDoc: (doc: MongoDoc) => {
      const migratedRequest = rewriteModeFieldsDeep(doc.request ?? null);
      const migratedHistory = rewriteModeFieldsDeep(doc.historyEvents ?? null);
      const changed = migratedRequest.changed || migratedHistory.changed;
      return {
        changed,
        rewrittenModeTokens:
          migratedRequest.rewrittenModeTokens + migratedHistory.rewrittenModeTokens,
        setPatch: {
          ...(migratedRequest.changed ? { request: migratedRequest.value } : {}),
          ...(migratedHistory.changed ? { historyEvents: migratedHistory.value } : {}),
        },
      };
    },
  });

const migrateSlotsCollection = async (options: CliOptions): Promise<CollectionMigrationSummary> =>
  migrateModeFieldsForCollection({
    collectionName: IMAGE_STUDIO_SLOTS_COLLECTION,
    options,
    projection: {
      _id: 1,
      projectId: 1,
      metadata: 1,
      updatedAt: 1,
    },
    migrateDoc: (doc: MongoDoc) => {
      const migratedMetadata = rewriteModeFieldsDeep(doc.metadata ?? null);
      return {
        changed: migratedMetadata.changed,
        rewrittenModeTokens: migratedMetadata.rewrittenModeTokens,
        setPatch: migratedMetadata.changed ? { metadata: migratedMetadata.value } : {},
      };
    },
  });

const migrateSlotLinksCollection = async (
  options: CliOptions
): Promise<CollectionMigrationSummary> =>
  migrateModeFieldsForCollection({
    collectionName: IMAGE_STUDIO_SLOT_LINKS_COLLECTION,
    options,
    projection: {
      _id: 1,
      projectId: 1,
      metadata: 1,
      updatedAt: 1,
    },
    migrateDoc: (doc: MongoDoc) => {
      const migratedMetadata = rewriteModeFieldsDeep(doc.metadata ?? null);
      return {
        changed: migratedMetadata.changed,
        rewrittenModeTokens: migratedMetadata.rewrittenModeTokens,
        setPatch: migratedMetadata.changed ? { metadata: migratedMetadata.value } : {},
      };
    },
  });

const run = async (): Promise<MigrationSummary> => {
  const options = parseCliOptions(process.argv.slice(2));
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required for Image Studio mode contract migration.');
  }

  const collections = await Promise.all([
    migrateRunsCollection(options),
    migrateSequenceRunsCollection(options),
    migrateSlotsCollection(options),
    migrateSlotLinksCollection(options),
  ]);

  const totals = collections.reduce(
    (acc, item) => ({
      scanned: acc.scanned + item.scanned,
      changed: acc.changed + item.changed,
      rewrittenModeTokens: acc.rewrittenModeTokens + item.rewrittenModeTokens,
      writesAttempted: acc.writesAttempted + item.writesAttempted,
      writesApplied: acc.writesApplied + item.writesApplied,
      writesFailed: acc.writesFailed + item.writesFailed,
    }),
    {
      scanned: 0,
      changed: 0,
      rewrittenModeTokens: 0,
      writesAttempted: 0,
      writesApplied: 0,
      writesFailed: 0,
    }
  );

  return {
    mode: options.dryRun ? 'dry-run' : 'write',
    projectId: options.projectId ?? 'all',
    collections,
    totals,
  };
};

void run()
  .then((summary: MigrationSummary) => {
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to migrate Image Studio mode contract v2:', error);
    process.exit(1);
  });
