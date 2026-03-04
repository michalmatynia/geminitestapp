import 'dotenv/config';

import { normalizeAgentPersonas } from '@/features/ai/agentcreator/utils/personas';
import { AGENT_PERSONA_SETTINGS_KEY, type AgentPersona } from '@/shared/contracts/agents';
import { getAppDbProvider, type AppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import { decodeSettingValue, encodeSettingValue } from '@/shared/lib/settings/settings-compression';
import { ObjectId, type Filter } from 'mongodb';

type CliOptions = {
  dryRun: boolean;
  preferredProvider: 'auto' | AppDbProvider;
};

type MigrationStatus = 'missing' | 'invalid_json' | 'invalid_payload' | 'unchanged' | 'changed';

type MigrationReport = {
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
  reports: MigrationReport[];
};

type MongoSettingDocument = {
  _id?: string | ObjectId;
  key?: unknown;
  value?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

class PersonaMigrationError extends Error {
  code: 'invalid_json' | 'invalid_payload';

  constructor(code: 'invalid_json' | 'invalid_payload', message: string) {
    super(message);
    this.code = code;
  }
}

const SETTINGS_COLLECTION = 'settings';
const UNSUPPORTED_AGENT_PERSONA_SETTINGS_KEYS = [
  'executorModel',
  'plannerModel',
  'selfCheckModel',
  'extractionValidationModel',
  'toolRouterModel',
  'memoryValidationModel',
  'memorySummarizationModel',
  'loopGuardModel',
  'approvalGateModel',
  'selectorInferenceModel',
  'outputNormalizationModel',
  'modelId',
  'temperature',
  'maxTokens',
] as const;
const UNSUPPORTED_AGENT_PERSONA_TOP_LEVEL_KEYS = ['modelId', 'temperature', 'maxTokens'] as const;

const toMongoId = (id: string): string | ObjectId => {
  if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
  return id;
};

const buildMongoKeyFilter = (key: string): Filter<MongoSettingDocument> =>
  ({
    $or: [{ _id: toMongoId(key) }, { key }],
  }) as Filter<MongoSettingDocument>;

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
    // Fall back to availability ordering when provider lookup is unavailable.
  }

  if (availableProviders.includes('mongodb')) return 'mongodb';
  if (availableProviders.includes('prisma')) return 'prisma';
  throw new Error('No database provider configured. Set DATABASE_URL or MONGODB_URI.');
};

const readSettingFromMongo = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const db = await getMongoDb();
  const doc = await db
    .collection<MongoSettingDocument>(SETTINGS_COLLECTION)
    .findOne(buildMongoKeyFilter(key));
  return typeof doc?.value === 'string' ? doc.value : null;
};

const readSettingFromPrisma = async (key: string): Promise<string | null> => {
  if (!process.env['DATABASE_URL']) return null;
  if (!('setting' in prisma)) return null;
  const setting = await prisma.setting.findUnique({
    where: { key },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const writeSettingToMongo = async (key: string, encodedValue: string): Promise<void> => {
  if (!process.env['MONGODB_URI']) return;
  const db = await getMongoDb();
  const now = new Date();
  await db.collection<MongoSettingDocument>(SETTINGS_COLLECTION).updateOne(
    buildMongoKeyFilter(key),
    {
      $set: {
        key,
        value: encodedValue,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: toMongoId(key),
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

const readSettingForProvider = async (
  provider: AppDbProvider,
  key: string
): Promise<string | null> =>
  provider === 'mongodb' ? readSettingFromMongo(key) : readSettingFromPrisma(key);

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

const parseStoredPersonas = (decodedValue: string): unknown => {
  if (!decodedValue.trim()) return [];
  try {
    return JSON.parse(decodedValue) as unknown;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to parse persisted agent persona JSON payload.';
    throw new PersonaMigrationError('invalid_json', message);
  }
};

const stripUnsupportedAgentPersonaSnapshotKeys = (payload: unknown[]): unknown[] =>
  payload.map((item: unknown): unknown => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    const rawPersona = item as Record<string, unknown>;
    const nextPersona = { ...rawPersona };

    UNSUPPORTED_AGENT_PERSONA_TOP_LEVEL_KEYS.forEach((key: string) => {
      if (Object.prototype.hasOwnProperty.call(nextPersona, key)) {
        delete nextPersona[key];
      }
    });

    const settings = nextPersona['settings'];
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return nextPersona;
    }

    const rawSettings = settings as Record<string, unknown>;
    const nextSettings = { ...rawSettings };
    UNSUPPORTED_AGENT_PERSONA_SETTINGS_KEYS.forEach((key: string) => {
      if (Object.prototype.hasOwnProperty.call(nextSettings, key)) {
        delete nextSettings[key];
      }
    });
    nextPersona['settings'] = nextSettings;
    return nextPersona;
  });

const migrateDecodedPersonas = (decodedValue: string): string => {
  const parsed = parseStoredPersonas(decodedValue);
  if (!Array.isArray(parsed)) {
    throw new PersonaMigrationError('invalid_payload', 'Agent personas payload is not an array.');
  }
  try {
    const sanitized = stripUnsupportedAgentPersonaSnapshotKeys(parsed);
    const normalized = normalizeAgentPersonas(sanitized);
    return JSON.stringify(normalized satisfies AgentPersona[]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to normalize agent personas payload.';
    throw new PersonaMigrationError('invalid_payload', message);
  }
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

  const key = AGENT_PERSONA_SETTINGS_KEY;
  const valuesByProvider = new Map<AppDbProvider, string | null>();
  for (const provider of availableProviders) {
    const value = await readSettingForProvider(provider, key);
    valuesByProvider.set(provider, value);
  }

  const foundInProviders = availableProviders.filter((provider: AppDbProvider): boolean =>
    typeof valuesByProvider.get(provider) === 'string'
  );
  const sourceProvider = chooseSourceProvider(valuesByProvider, preferredProvider, availableProviders);

  let writesAttempted = 0;
  let writesApplied = 0;
  let writesFailed = 0;
  let changed = 0;
  let unchanged = 0;
  let invalid = 0;
  let missing = 0;

  const report: MigrationReport = {
    key,
    sourceProvider,
    foundInProviders,
    status: 'missing',
    changed: false,
    writesAttempted: 0,
    writesApplied: 0,
    writesFailed: 0,
    writeFailures: [],
    error: null,
  };

  if (!sourceProvider) {
    missing = 1;
    return {
      mode: options.dryRun ? 'dry-run' : 'write',
      preferredProvider,
      availableProviders,
      scanned: 1,
      found: 0,
      changed: 0,
      unchanged: 0,
      invalid: 0,
      missing: 1,
      writesAttempted: 0,
      writesApplied: 0,
      writesFailed: 0,
      reports: [report],
    };
  }

  const sourceEncodedValue = valuesByProvider.get(sourceProvider) ?? '';
  const sourceDecodedValue = decodeSettingValue(key, sourceEncodedValue);

  let nextDecodedValue: string;
  try {
    nextDecodedValue = migrateDecodedPersonas(sourceDecodedValue);
  } catch (error) {
    invalid = 1;
    report.status =
      error instanceof PersonaMigrationError && error.code === 'invalid_json'
        ? 'invalid_json'
        : 'invalid_payload';
    report.error = error instanceof Error ? error.message : String(error);
    return {
      mode: options.dryRun ? 'dry-run' : 'write',
      preferredProvider,
      availableProviders,
      scanned: 1,
      found: 1,
      changed: 0,
      unchanged: 0,
      invalid,
      missing: 0,
      writesAttempted: 0,
      writesApplied: 0,
      writesFailed: 0,
      reports: [report],
    };
  }

  if (nextDecodedValue === sourceDecodedValue) {
    unchanged = 1;
    report.status = 'unchanged';
    return {
      mode: options.dryRun ? 'dry-run' : 'write',
      preferredProvider,
      availableProviders,
      scanned: 1,
      found: 1,
      changed,
      unchanged,
      invalid,
      missing,
      writesAttempted,
      writesApplied,
      writesFailed,
      reports: [report],
    };
  }

  changed = 1;
  report.status = 'changed';
  report.changed = true;
  const nextEncodedValue = encodeSettingValue(key, nextDecodedValue);
  if (!options.dryRun) {
    for (const provider of availableProviders) {
      const currentEncodedValue = valuesByProvider.get(provider);
      if (currentEncodedValue === nextEncodedValue) continue;
      writesAttempted += 1;
      report.writesAttempted += 1;
      try {
        await writeSettingForProvider(provider, key, nextEncodedValue);
        writesApplied += 1;
        report.writesApplied += 1;
      } catch (error) {
        writesFailed += 1;
        report.writesFailed += 1;
        report.writeFailures.push({
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
    changed,
    unchanged,
    invalid,
    missing,
    writesAttempted,
    writesApplied,
    writesFailed,
    reports: [report],
  };
};

void run()
  .then(async (summary: MigrationSummary) => {
    console.log(JSON.stringify(summary, null, 2));
    await closeResources();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error('Failed to migrate agent persona snapshot keys:', error);
    await closeResources();
    process.exit(1);
  });
