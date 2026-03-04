import 'dotenv/config';

import {
  IMAGE_STUDIO_PROJECT_SETTINGS_KEY_PREFIX,
  IMAGE_STUDIO_SETTINGS_KEY,
  parseImageStudioSettings,
} from '@/features/ai/image-studio/utils/studio-settings';
import { getAppDbProvider, type AppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import { decodeSettingValue, encodeSettingValue } from '@/shared/lib/settings/settings-compression';

type CliOptions = {
  dryRun: boolean;
  preferredProvider: 'auto' | AppDbProvider;
};

type MigrationStatus = 'missing' | 'invalid_json_or_shape' | 'unchanged' | 'changed';

type KeyReport = {
  key: string;
  sourceProvider: AppDbProvider | null;
  foundInProviders: AppDbProvider[];
  status: MigrationStatus;
  changed: boolean;
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
  invalid: number;
  missing: number;
  writesAttempted: number;
  writesApplied: number;
  writesFailed: number;
  reports: KeyReport[];
};

type MongoSettingDocument = {
  _id?: string;
  key?: unknown;
  value?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const SETTINGS_COLLECTION = 'settings';
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const hasOwnKey = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const parseCliOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    preferredProvider: 'auto',
  };

  for (const arg of argv) {
    if (arg === '--write') {
      options.dryRun = false;
      continue;
    }
    if (arg.startsWith('--provider=')) {
      const token = arg.slice('--provider='.length).trim().toLowerCase();
      if (token === 'auto' || token === 'mongodb' || token === 'prisma') {
        options.preferredProvider = token;
      }
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

const resolvePreferredProvider = async (
  preferred: 'auto' | AppDbProvider,
  availableProviders: AppDbProvider[]
): Promise<AppDbProvider> => {
  if (preferred !== 'auto') {
    if (!availableProviders.includes(preferred)) {
      throw new Error(`Preferred provider "${preferred}" is not configured in environment.`);
    }
    return preferred;
  }

  try {
    const provider = await getAppDbProvider();
    if (availableProviders.includes(provider)) return provider;
  } catch {
    // Fall back to available provider list.
  }

  if (availableProviders.includes('mongodb')) return 'mongodb';
  if (availableProviders.includes('prisma')) return 'prisma';
  throw new Error('No database provider configured. Set DATABASE_URL or MONGODB_URI.');
};

const isImageStudioSettingsKey = (key: string): boolean =>
  key === IMAGE_STUDIO_SETTINGS_KEY || key.startsWith(IMAGE_STUDIO_PROJECT_SETTINGS_KEY_PREFIX);

const listSettingsFromMongo = async (): Promise<Map<string, string>> => {
  const result = new Map<string, string>();
  if (!process.env['MONGODB_URI']) return result;

  const db = await getMongoDb();
  const docs = await db
    .collection<MongoSettingDocument>(SETTINGS_COLLECTION)
    .find(
      {
        $or: [
          { key: IMAGE_STUDIO_SETTINGS_KEY },
          { key: { $regex: `^${IMAGE_STUDIO_PROJECT_SETTINGS_KEY_PREFIX}` } },
          { _id: IMAGE_STUDIO_SETTINGS_KEY },
          { _id: { $regex: `^${IMAGE_STUDIO_PROJECT_SETTINGS_KEY_PREFIX}` } },
        ],
      },
      { projection: { _id: 1, key: 1, value: 1 } }
    )
    .toArray();

  for (const doc of docs) {
    const keyCandidate =
      typeof doc.key === 'string'
        ? doc.key
        : typeof doc._id === 'string'
          ? doc._id
          : '';
    if (!keyCandidate || !isImageStudioSettingsKey(keyCandidate)) continue;
    if (typeof doc.value !== 'string') continue;
    result.set(keyCandidate, doc.value);
  }

  return result;
};

const listSettingsFromPrisma = async (): Promise<Map<string, string>> => {
  const result = new Map<string, string>();
  if (!process.env['DATABASE_URL']) return result;
  if (!('setting' in prisma)) return result;

  const rows = await prisma.setting.findMany({
    where: {
      OR: [
        { key: IMAGE_STUDIO_SETTINGS_KEY },
        { key: { startsWith: IMAGE_STUDIO_PROJECT_SETTINGS_KEY_PREFIX } },
      ],
    },
    select: { key: true, value: true },
  });

  for (const row of rows) {
    if (!isImageStudioSettingsKey(row.key)) continue;
    result.set(row.key, row.value);
  }

  return result;
};

const writeSettingToMongo = async (key: string, encodedValue: string): Promise<void> => {
  if (!process.env['MONGODB_URI']) return;
  const db = await getMongoDb();
  const now = new Date();
  await db.collection<MongoSettingDocument>(SETTINGS_COLLECTION).updateOne(
    {
      $or: [{ key }, { _id: key }],
    },
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

const writeSettingToPrisma = async (key: string, encodedValue: string): Promise<void> => {
  if (!process.env['DATABASE_URL']) return;
  if (!('setting' in prisma)) return;
  await prisma.setting.upsert({
    where: { key },
    update: { value: encodedValue },
    create: { key, value: encodedValue },
  });
};

const writeSettingForProvider = async (
  provider: AppDbProvider,
  key: string,
  encodedValue: string
): Promise<void> => {
  if (provider === 'mongodb') {
    await writeSettingToMongo(key, encodedValue);
    return;
  }
  await writeSettingToPrisma(key, encodedValue);
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

const stripDeprecatedImageStudioSnapshotKeys = (value: unknown): unknown => {
  if (!isPlainObject(value)) return value;

  const nextRoot: Record<string, unknown> = { ...value };

  const promptExtraction = isPlainObject(nextRoot['promptExtraction'])
    ? { ...nextRoot['promptExtraction'] }
    : null;
  if (promptExtraction) {
    const gpt = isPlainObject(promptExtraction['gpt']) ? { ...promptExtraction['gpt'] } : null;
    if (gpt && hasOwnKey(gpt, 'model')) {
      delete gpt['model'];
    }
    if (gpt) {
      promptExtraction['gpt'] = gpt;
    }
    nextRoot['promptExtraction'] = promptExtraction;
  }

  const uiExtractor = isPlainObject(nextRoot['uiExtractor']) ? { ...nextRoot['uiExtractor'] } : null;
  if (uiExtractor && hasOwnKey(uiExtractor, 'model')) {
    delete uiExtractor['model'];
  }
  if (uiExtractor) {
    nextRoot['uiExtractor'] = uiExtractor;
  }

  const targetAi = isPlainObject(nextRoot['targetAi']) ? { ...nextRoot['targetAi'] } : null;
  const openai = targetAi && isPlainObject(targetAi['openai']) ? { ...targetAi['openai'] } : null;
  if (openai && hasOwnKey(openai, 'model')) {
    delete openai['model'];
  }
  if (openai && hasOwnKey(openai, 'modelPresets')) {
    delete openai['modelPresets'];
  }
  if (targetAi && openai) {
    targetAi['openai'] = openai;
    nextRoot['targetAi'] = targetAi;
  }

  return nextRoot;
};

const migrateDecodedValue = (decoded: string): string => {
  if (!decoded.trim()) {
    return JSON.stringify(parseImageStudioSettings(decoded));
  }
  const parsed = JSON.parse(decoded) as unknown;
  const sanitized = stripDeprecatedImageStudioSnapshotKeys(parsed);
  return JSON.stringify(parseImageStudioSettings(JSON.stringify(sanitized)));
};

const closeResources = async (): Promise<void> => {
  await prisma.$disconnect().catch(() => {});
  if (process.env['MONGODB_URI']) {
    const client = await getMongoClient().catch(() => null);
    await client?.close().catch(() => {});
  }
};

const run = async (): Promise<MigrationSummary> => {
  const options = parseCliOptions(process.argv.slice(2));
  const availableProviders = resolveAvailableProviders();
  const preferredProvider = await resolvePreferredProvider(
    options.preferredProvider,
    availableProviders
  );

  const rawByProvider = new Map<AppDbProvider, Map<string, string>>();
  if (availableProviders.includes('prisma')) {
    rawByProvider.set('prisma', await listSettingsFromPrisma());
  }
  if (availableProviders.includes('mongodb')) {
    rawByProvider.set('mongodb', await listSettingsFromMongo());
  }

  const allKeys = Array.from(
    new Set(
      availableProviders.flatMap((provider: AppDbProvider) =>
        Array.from(rawByProvider.get(provider)?.keys() ?? [])
      )
    )
  ).sort();

  const reports: KeyReport[] = [];
  let writesAttempted = 0;
  let writesApplied = 0;
  let writesFailed = 0;
  let changed = 0;
  let unchanged = 0;
  let invalid = 0;
  let missing = 0;
  let found = 0;

  for (const key of allKeys) {
    const valuesByProvider = new Map<AppDbProvider, string | null>();
    for (const provider of availableProviders) {
      const value = rawByProvider.get(provider)?.get(key) ?? null;
      valuesByProvider.set(provider, value);
    }

    const foundInProviders = availableProviders.filter((provider: AppDbProvider): boolean =>
      typeof valuesByProvider.get(provider) === 'string'
    );
    const sourceProvider = chooseSourceProvider(valuesByProvider, preferredProvider, availableProviders);

    if (!sourceProvider) {
      missing += 1;
      reports.push({
        key,
        sourceProvider: null,
        foundInProviders: [],
        status: 'missing',
        changed: false,
        writesAttempted: 0,
        writesApplied: 0,
        writesFailed: 0,
        writeFailures: [],
        error: null,
      });
      continue;
    }

    found += 1;
    const sourceEncoded = valuesByProvider.get(sourceProvider) ?? '';
    const sourceDecoded = decodeSettingValue(key, sourceEncoded);

    let nextDecoded: string;
    try {
      nextDecoded = migrateDecodedValue(sourceDecoded);
    } catch (error) {
      invalid += 1;
      reports.push({
        key,
        sourceProvider,
        foundInProviders,
        status: 'invalid_json_or_shape',
        changed: false,
        writesAttempted: 0,
        writesApplied: 0,
        writesFailed: 0,
        writeFailures: [],
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    if (nextDecoded === sourceDecoded) {
      unchanged += 1;
      reports.push({
        key,
        sourceProvider,
        foundInProviders,
        status: 'unchanged',
        changed: false,
        writesAttempted: 0,
        writesApplied: 0,
        writesFailed: 0,
        writeFailures: [],
        error: null,
      });
      continue;
    }

    changed += 1;
    const nextEncoded = encodeSettingValue(key, nextDecoded);
    const writeFailures: Array<{ provider: AppDbProvider; message: string }> = [];
    let keyWritesAttempted = 0;
    let keyWritesApplied = 0;

    if (!options.dryRun) {
      for (const provider of availableProviders) {
        const currentEncoded = valuesByProvider.get(provider);
        if (currentEncoded === nextEncoded) continue;
        keyWritesAttempted += 1;
        writesAttempted += 1;
        try {
          await writeSettingForProvider(provider, key, nextEncoded);
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

    reports.push({
      key,
      sourceProvider,
      foundInProviders,
      status: 'changed',
      changed: true,
      writesAttempted: keyWritesAttempted,
      writesApplied: keyWritesApplied,
      writesFailed: writeFailures.length,
      writeFailures,
      error: null,
    });
  }

  return {
    mode: options.dryRun ? 'dry-run' : 'write',
    preferredProvider,
    availableProviders,
    scanned: allKeys.length,
    found,
    changed,
    unchanged,
    invalid,
    missing,
    writesAttempted,
    writesApplied,
    writesFailed,
    reports,
  };
};

void run()
  .then(async (summary: MigrationSummary) => {
    console.log(JSON.stringify(summary, null, 2));
    await closeResources();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error('Failed to migrate Image Studio settings contract to v2:', error);
    await closeResources();
    process.exit(1);
  });
