import 'dotenv/config';

import {
  createDefaultKangurLessons,
  KANGUR_GEOMETRY_LESSON_COMPONENT_IDS,
  KANGUR_LESSONS_SETTING_KEY,
  appendMissingGeometryKangurLessons,
  normalizeKangurLessons,
} from '@/features/kangur/settings';
import type { KangurLesson } from '@/shared/contracts/kangur';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import { decodeSettingValue, encodeSettingValue } from '@/shared/lib/settings/settings-compression';

type AppDbProvider = 'prisma' | 'mongodb';

type CliOptions = {
  dryRun: boolean;
  preferredProvider: 'auto' | AppDbProvider;
  seedIfMissing: boolean;
};

type MigrationStatus =
  | 'missing'
  | 'invalid_json'
  | 'invalid_shape'
  | 'unchanged'
  | 'changed';

type KeyReport = {
  key: string;
  sourceProvider: AppDbProvider | null;
  foundInProviders: AppDbProvider[];
  status: MigrationStatus;
  seededFromDefaults: boolean;
  changed: boolean;
  previousLessonCount: number | null;
  nextLessonCount: number | null;
  geometryLessonsAdded: number;
  writesAttempted: number;
  writesApplied: number;
  writesFailed: number;
  writeFailures: Array<{ provider: AppDbProvider; message: string }>;
  error: string | null;
};

type MigrationSummary = {
  mode: 'dry-run' | 'write';
  preferredProvider: AppDbProvider;
  availableProviders: AppDbProvider[];
  scanned: number;
  found: number;
  changed: number;
  unchanged: number;
  missing: number;
  invalid: number;
  writesAttempted: number;
  writesApplied: number;
  writesFailed: number;
  reports: KeyReport[];
};

type MongoSettingDocument = {
  _id?: string | { toString?: () => string };
  key?: unknown;
  value?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const SETTINGS_COLLECTION = 'settings';

const parseCliOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    preferredProvider: 'auto',
    seedIfMissing: false,
  };

  for (const arg of argv) {
    if (arg === '--write') {
      options.dryRun = false;
      continue;
    }
    if (arg.startsWith('--provider=')) {
      const token = arg.slice('--provider='.length).trim().toLowerCase();
      if (token === 'auto' || token === 'prisma' || token === 'mongodb') {
        options.preferredProvider = token;
      }
    }
    if (arg === '--seed-if-missing') {
      options.seedIfMissing = true;
    }
  }

  return options;
};

const resolveAvailableProviders = (): AppDbProvider[] => {
  const providers: AppDbProvider[] = [];
  if (process.env['DATABASE_URL']) providers.push('prisma');
  if (process.env['MONGODB_URI']) providers.push('mongodb');
  return providers;
};

const resolvePreferredProvider = (
  preferred: 'auto' | AppDbProvider,
  availableProviders: AppDbProvider[]
): AppDbProvider => {
  if (preferred !== 'auto') {
    if (!availableProviders.includes(preferred)) {
      throw new Error(`Preferred provider "${preferred}" is not configured in environment.`);
    }
    return preferred;
  }
  if (availableProviders.includes('mongodb')) return 'mongodb';
  if (availableProviders.includes('prisma')) return 'prisma';
  throw new Error('No database provider configured. Set DATABASE_URL or MONGODB_URI.');
};

const readSettingFromPrisma = async (key: string): Promise<string | null> => {
  if (!process.env['DATABASE_URL']) return null;
  if (!('setting' in prisma)) return null;

  const row = await prisma.setting.findUnique({
    where: { key },
    select: { value: true },
  });

  if (typeof row?.value !== 'string') return null;
  return row.value;
};

const readSettingFromMongo = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;

  const db = await getMongoDb();
  const filter = {
    $or: [{ key }, { _id: key }],
  } as Record<string, unknown>;
  const doc = await db
    .collection<MongoSettingDocument>(SETTINGS_COLLECTION)
    .findOne(filter);

  if (typeof doc?.value !== 'string') return null;
  return doc.value;
};

const writeSettingToPrisma = async (key: string, encodedValue: string): Promise<void> => {
  if (!process.env['DATABASE_URL']) return;
  if (!('setting' in prisma)) return;

  await prisma.setting.upsert({
    where: { key },
    update: { value: encodedValue },
    create: { key, value: encodedValue },
  });
};

const writeSettingToMongo = async (key: string, encodedValue: string): Promise<void> => {
  if (!process.env['MONGODB_URI']) return;

  const db = await getMongoDb();
  const now = new Date();
  const filter = {
    $or: [{ key }, { _id: key }],
  } as Record<string, unknown>;
  await db.collection<MongoSettingDocument>(SETTINGS_COLLECTION).updateOne(
    filter,
    {
      $set: {
        key,
        value: encodedValue,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: key,
        createdAt: now,
      },
    },
    { upsert: true }
  );
};

const chooseSourceProvider = (
  valuesByProvider: Map<AppDbProvider, string | null>,
  preferredProvider: AppDbProvider,
  availableProviders: AppDbProvider[]
): AppDbProvider | null => {
  const readOrder: AppDbProvider[] = [
    preferredProvider,
    ...availableProviders.filter((provider: AppDbProvider): boolean => provider !== preferredProvider),
  ];

  return (
    readOrder.find((provider: AppDbProvider): boolean => {
      const value = valuesByProvider.get(provider);
      return typeof value === 'string';
    }) ?? null
  );
};

const tryParseLessonsPayload = (
  decoded: string
):
  | { ok: true; lessons: ReturnType<typeof normalizeKangurLessons> }
  | { ok: false; status: Exclude<MigrationStatus, 'missing' | 'unchanged' | 'changed'>; error: string } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch (error) {
    return {
      ok: false,
      status: 'invalid_json',
      error: error instanceof Error ? error.message : String(error),
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      ok: false,
      status: 'invalid_shape',
      error: 'Kangur lessons payload is not an array.',
    };
  }

  return {
    ok: true,
    lessons: normalizeKangurLessons(parsed),
  };
};

const run = async (): Promise<MigrationSummary> => {
  const options = parseCliOptions(process.argv.slice(2));
  const availableProviders = resolveAvailableProviders();
  const preferredProvider = resolvePreferredProvider(options.preferredProvider, availableProviders);

  const key = KANGUR_LESSONS_SETTING_KEY;
  const valuesByProvider = new Map<AppDbProvider, string | null>();

  if (availableProviders.includes('prisma')) {
    valuesByProvider.set('prisma', await readSettingFromPrisma(key));
  }
  if (availableProviders.includes('mongodb')) {
    valuesByProvider.set('mongodb', await readSettingFromMongo(key));
  }

  const foundInProviders = availableProviders.filter((provider: AppDbProvider): boolean =>
    typeof valuesByProvider.get(provider) === 'string'
  );
  const sourceProvider = chooseSourceProvider(valuesByProvider, preferredProvider, availableProviders);

  let writesAttempted = 0;
  let writesApplied = 0;
  let writesFailed = 0;

  if (!sourceProvider && !options.seedIfMissing) {
    return {
      mode: options.dryRun ? 'dry-run' : 'write',
      preferredProvider,
      availableProviders,
      scanned: 1,
      found: 0,
      changed: 0,
      unchanged: 0,
      missing: 1,
      invalid: 0,
      writesAttempted,
      writesApplied,
      writesFailed,
      reports: [
        {
          key,
          sourceProvider: null,
          foundInProviders,
          status: 'missing',
          seededFromDefaults: false,
          changed: false,
          previousLessonCount: null,
          nextLessonCount: null,
          geometryLessonsAdded: 0,
          writesAttempted: 0,
          writesApplied: 0,
          writesFailed: 0,
          writeFailures: [],
          error: null,
        },
      ],
    };
  }

  const geometryLessonIds = new Set<KangurLesson['componentId']>(
    KANGUR_GEOMETRY_LESSON_COMPONENT_IDS
  );

  if (!sourceProvider && options.seedIfMissing) {
    const seededLessons = createDefaultKangurLessons();
    const nextDecoded = JSON.stringify(seededLessons);
    const nextEncoded = encodeSettingValue(key, nextDecoded);
    const writeFailures: Array<{ provider: AppDbProvider; message: string }> = [];
    let keyWritesAttempted = 0;
    let keyWritesApplied = 0;

    if (!options.dryRun) {
      for (const provider of availableProviders) {
        keyWritesAttempted += 1;
        writesAttempted += 1;
        try {
          if (provider === 'prisma') {
            await writeSettingToPrisma(key, nextEncoded);
          } else {
            await writeSettingToMongo(key, nextEncoded);
          }
          keyWritesApplied += 1;
          writesApplied += 1;
        } catch (error) {
          writesFailed += 1;
          writeFailures.push({
            provider,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    const geometryLessonsAdded = seededLessons.filter((lesson) =>
      geometryLessonIds.has(lesson.componentId)
    ).length;

    return {
      mode: options.dryRun ? 'dry-run' : 'write',
      preferredProvider,
      availableProviders,
      scanned: 1,
      found: 0,
      changed: 1,
      unchanged: 0,
      missing: 0,
      invalid: 0,
      writesAttempted,
      writesApplied,
      writesFailed,
      reports: [
        {
          key,
          sourceProvider: null,
          foundInProviders,
          status: 'changed',
          seededFromDefaults: true,
          changed: true,
          previousLessonCount: 0,
          nextLessonCount: seededLessons.length,
          geometryLessonsAdded,
          writesAttempted: keyWritesAttempted,
          writesApplied: keyWritesApplied,
          writesFailed: writeFailures.length,
          writeFailures,
          error: null,
        },
      ],
    };
  }

  if (!sourceProvider) {
    throw new Error('Internal migration invariant: source provider missing after seed resolution.');
  }

  const sourceEncoded = valuesByProvider.get(sourceProvider) ?? '';
  const sourceDecoded = decodeSettingValue(key, sourceEncoded);
  const parsed = tryParseLessonsPayload(sourceDecoded);

  if (!parsed.ok) {
    return {
      mode: options.dryRun ? 'dry-run' : 'write',
      preferredProvider,
      availableProviders,
      scanned: 1,
      found: 1,
      changed: 0,
      unchanged: 0,
      missing: 0,
      invalid: 1,
      writesAttempted,
      writesApplied,
      writesFailed,
      reports: [
        {
          key,
          sourceProvider,
          foundInProviders,
          status: parsed.status,
          seededFromDefaults: false,
          changed: false,
          previousLessonCount: null,
          nextLessonCount: null,
          geometryLessonsAdded: 0,
          writesAttempted: 0,
          writesApplied: 0,
          writesFailed: 0,
          writeFailures: [],
          error: parsed.error,
        },
      ],
    };
  }

  const previousLessons = parsed.lessons;
  const migrationResult = appendMissingGeometryKangurLessons(previousLessons);
  const previousLessonCount = previousLessons.length;
  const nextLessonCount = migrationResult.lessons.length;
  const geometryLessonsAdded = migrationResult.addedCount;

  if (geometryLessonsAdded === 0) {
    return {
      mode: options.dryRun ? 'dry-run' : 'write',
      preferredProvider,
      availableProviders,
      scanned: 1,
      found: 1,
      changed: 0,
      unchanged: 1,
      missing: 0,
      invalid: 0,
      writesAttempted,
      writesApplied,
      writesFailed,
      reports: [
        {
          key,
          sourceProvider,
          foundInProviders,
          status: 'unchanged',
          seededFromDefaults: false,
          changed: false,
          previousLessonCount,
          nextLessonCount,
          geometryLessonsAdded,
          writesAttempted: 0,
          writesApplied: 0,
          writesFailed: 0,
          writeFailures: [],
          error: null,
        },
      ],
    };
  }

  const nextDecoded = JSON.stringify(migrationResult.lessons);
  const nextEncoded = encodeSettingValue(key, nextDecoded);

  const writeFailures: Array<{ provider: AppDbProvider; message: string }> = [];
  let keyWritesAttempted = 0;
  let keyWritesApplied = 0;

  if (!options.dryRun) {
    for (const provider of availableProviders) {
      const currentValue = valuesByProvider.get(provider);
      if (currentValue === nextEncoded) continue;

      keyWritesAttempted += 1;
      writesAttempted += 1;
      try {
        if (provider === 'prisma') {
          await writeSettingToPrisma(key, nextEncoded);
        } else {
          await writeSettingToMongo(key, nextEncoded);
        }
        keyWritesApplied += 1;
        writesApplied += 1;
      } catch (error) {
        writesFailed += 1;
        writeFailures.push({
          provider,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return {
    mode: options.dryRun ? 'dry-run' : 'write',
    preferredProvider,
    availableProviders,
    scanned: 1,
    found: 1,
    changed: 1,
    unchanged: 0,
    missing: 0,
    invalid: 0,
    writesAttempted,
    writesApplied,
    writesFailed,
    reports: [
      {
        key,
        sourceProvider,
        foundInProviders,
        status: 'changed',
        seededFromDefaults: false,
        changed: true,
        previousLessonCount,
        nextLessonCount,
        geometryLessonsAdded,
        writesAttempted: keyWritesAttempted,
        writesApplied: keyWritesApplied,
        writesFailed: writeFailures.length,
        writeFailures,
        error: null,
      },
    ],
  };
};

const closeResources = async (): Promise<void> => {
  await prisma.$disconnect().catch(() => {});
  if (process.env['MONGODB_URI']) {
    const client = await getMongoClient().catch(() => null);
    await client?.close().catch(() => {});
  }
};

void run()
  .then(async (summary: MigrationSummary) => {
    console.log(JSON.stringify(summary, null, 2));
    await closeResources();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error('Failed to migrate Kangur geometry lesson pack:', error);
    await closeResources();
    process.exit(1);
  });
