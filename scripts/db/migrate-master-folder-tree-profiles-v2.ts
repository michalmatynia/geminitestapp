import 'dotenv/config';

import { writeFile } from 'node:fs/promises';
import { getFolderTreeProfileV2Key } from '@/features/foldertree/v2/settings';
import { getAppDbProvider, type AppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import { decodeSettingValue, encodeSettingValue } from '@/shared/lib/settings/settings-compression';
import {
  defaultFolderTreeProfilesV2,
  folderTreeInstanceValues,
  parseFolderTreeProfileV2Strict,
  type FolderTreeInstance,
} from '@/shared/utils/folder-tree-profiles-v2';

type CliOptions = {
  dryRun: boolean;
  preferredProvider: 'auto' | AppDbProvider;
  reportJsonPath: string | null;
  instances: FolderTreeInstance[] | null;
  deleteLegacyKey: boolean;
};

type LegacyPayloadStatus = 'missing' | 'invalid_payload' | 'parsed';
type InstanceMigrationStatus = 'missing_in_legacy' | 'invalid_profile' | 'unchanged' | 'changed';

type MongoSettingDocument = {
  _id?: string;
  key?: unknown;
  value?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type InstanceReport = {
  instance: FolderTreeInstance;
  targetKey: string;
  status: InstanceMigrationStatus;
  writesAttempted: number;
  writesApplied: number;
  writesFailed: number;
  writeFailures: Array<{ provider: AppDbProvider; message: string }>;
  warnings: string[];
  error: string | null;
};

type MigrationSummary = {
  mode: 'dry-run' | 'write';
  preferredProvider: AppDbProvider;
  availableProviders: AppDbProvider[];
  legacyKey: string;
  legacySourceProvider: AppDbProvider | null;
  legacyFoundInProviders: AppDbProvider[];
  legacyPayloadStatus: LegacyPayloadStatus;
  legacyPayloadError: string | null;
  legacyUnknownKeys: string[];
  targetedInstances: FolderTreeInstance[];
  scannedInstances: number;
  foundInLegacy: number;
  changedInstances: number;
  unchangedInstances: number;
  invalidInstances: number;
  missingInstances: number;
  writesAttempted: number;
  writesApplied: number;
  writesFailed: number;
  legacyDeleteAttempted: number;
  legacyDeleteApplied: number;
  legacyDeleteFailed: number;
  legacyDeleteFailures: Array<{ provider: AppDbProvider; message: string }>;
  reportPath: string | null;
  reports: InstanceReport[];
};

type LegacyExtractionResult =
  | {
      ok: true;
      profilesByInstance: Map<FolderTreeInstance, unknown>;
      unknownKeys: string[];
    }
  | {
      ok: false;
      error: string;
      unknownKeys: string[];
    };

const LEGACY_FOLDER_TREE_PROFILES_KEY = 'folder_tree_profiles_v2';
const SETTINGS_COLLECTION = 'settings';
const FOLDER_TREE_INSTANCE_SET = new Set<FolderTreeInstance>(folderTreeInstanceValues);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const parseInstanceList = (raw: string): FolderTreeInstance[] => {
  const tokens = raw
    .split(',')
    .map((entry: string): string => entry.trim())
    .filter((entry: string): boolean => entry.length > 0);

  if (tokens.length === 0) return [];

  const instances: FolderTreeInstance[] = [];
  tokens.forEach((token: string) => {
    if (!FOLDER_TREE_INSTANCE_SET.has(token as FolderTreeInstance)) {
      throw new Error(`Unknown folder tree instance "${token}"`);
    }
    instances.push(token as FolderTreeInstance);
  });

  return Array.from(new Set(instances));
};

const parseCliOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    preferredProvider: 'auto',
    reportJsonPath: null,
    instances: null,
    deleteLegacyKey: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? '';
    if (arg === '--apply' || arg === '--write') {
      options.dryRun = false;
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--delete-legacy-key') {
      options.deleteLegacyKey = true;
      continue;
    }
    if (arg.startsWith('--provider=')) {
      const token = arg.slice('--provider='.length).trim().toLowerCase();
      if (token === 'auto' || token === 'mongodb' || token === 'prisma') {
        options.preferredProvider = token;
      }
      continue;
    }
    if (arg.startsWith('--report-json=')) {
      const reportPath = arg.slice('--report-json='.length).trim();
      if (reportPath.length > 0) options.reportJsonPath = reportPath;
      continue;
    }
    if (arg === '--report-json') {
      const next = argv[index + 1]?.trim() ?? '';
      if (next.length > 0) {
        options.reportJsonPath = next;
        index += 1;
      }
      continue;
    }
    if (arg.startsWith('--instances=')) {
      const parsed = parseInstanceList(arg.slice('--instances='.length));
      if (parsed.length > 0) options.instances = parsed;
      continue;
    }
    if (arg === '--instances') {
      const next = argv[index + 1]?.trim() ?? '';
      const parsed = parseInstanceList(next);
      if (parsed.length > 0) options.instances = parsed;
      index += 1;
      continue;
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

const readSettingFromMongo = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const db = await getMongoDb();
  const doc = await db.collection<MongoSettingDocument>(SETTINGS_COLLECTION).findOne({
    $or: [{ key }, { _id: key }],
  });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const readSettingFromPrisma = async (key: string): Promise<string | null> => {
  if (!process.env['DATABASE_URL']) return null;
  if (!('setting' in prisma)) return null;
  const row = await prisma.setting.findUnique({
    where: { key },
    select: { value: true },
  });
  return row?.value ?? null;
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
    create: { key, value: encodedValue },
    update: { value: encodedValue },
  });
};

const deleteSettingFromMongo = async (key: string): Promise<void> => {
  if (!process.env['MONGODB_URI']) return;
  const db = await getMongoDb();
  await db.collection<MongoSettingDocument>(SETTINGS_COLLECTION).deleteMany({
    $or: [{ key }, { _id: key }],
  });
};

const deleteSettingFromPrisma = async (key: string): Promise<void> => {
  if (!process.env['DATABASE_URL']) return;
  if (!('setting' in prisma)) return;
  await prisma.setting.deleteMany({
    where: { key },
  });
};

const readSettingForProvider = async (
  provider: AppDbProvider,
  key: string
): Promise<string | null> => (provider === 'mongodb' ? readSettingFromMongo(key) : readSettingFromPrisma(key));

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

const deleteSettingForProvider = async (provider: AppDbProvider, key: string): Promise<void> => {
  if (provider === 'mongodb') {
    await deleteSettingFromMongo(key);
    return;
  }
  await deleteSettingFromPrisma(key);
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

const extractLegacyProfiles = (decodedLegacyPayload: string): LegacyExtractionResult => {
  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(decodedLegacyPayload);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      unknownKeys: [],
    };
  }

  if (!isRecord(parsedPayload)) {
    return {
      ok: false,
      error: 'Legacy profile payload must be a JSON object.',
      unknownKeys: [],
    };
  }

  const nestedProfiles = parsedPayload['profiles'];
  const nestedInstances = parsedPayload['instances'];
  const sourceRecord = isRecord(nestedProfiles)
    ? nestedProfiles
    : isRecord(nestedInstances)
      ? nestedInstances
      : parsedPayload;

  const profilesByInstance = new Map<FolderTreeInstance, unknown>();
  const unknownKeys: string[] = [];

  Object.entries(sourceRecord).forEach(([key, value]: [string, unknown]) => {
    if (FOLDER_TREE_INSTANCE_SET.has(key as FolderTreeInstance)) {
      profilesByInstance.set(key as FolderTreeInstance, value);
      return;
    }
    unknownKeys.push(key);
  });

  return {
    ok: true,
    profilesByInstance,
    unknownKeys,
  };
};

const closeResources = async (): Promise<void> => {
  await prisma.$disconnect().catch(() => {});
  if (process.env['MONGODB_URI']) {
    const client = await getMongoClient().catch(() => null);
    if (client) {
      // Detach Mongo observability listeners before shutdown to avoid
      // fire-and-forget logger writes racing a closed client.
      const detach = client as unknown as {
        removeAllListeners: (event?: string) => void;
      };
      [
        'connectionPoolCreated',
        'connectionPoolCleared',
        'connectionCheckOutFailed',
        'connectionClosed',
        'commandFailed',
        'commandSucceeded',
      ].forEach((eventName: string) => {
        detach.removeAllListeners(eventName);
      });
      await client.close().catch(() => {});
    }
  }
};

const run = async (): Promise<MigrationSummary> => {
  const options = parseCliOptions(process.argv.slice(2));
  const availableProviders = resolveAvailableProviders();
  const preferredProvider = await resolvePreferredProvider(
    options.preferredProvider,
    availableProviders
  );
  const targetInstances = options.instances ?? [...folderTreeInstanceValues];

  const legacyValuesByProvider = new Map<AppDbProvider, string | null>();
  for (const provider of availableProviders) {
    const raw = await readSettingForProvider(provider, LEGACY_FOLDER_TREE_PROFILES_KEY);
    legacyValuesByProvider.set(provider, raw);
  }

  const legacyFoundInProviders = availableProviders.filter((provider: AppDbProvider): boolean => {
    const value = legacyValuesByProvider.get(provider);
    return typeof value === 'string';
  });
  const legacySourceProvider = chooseSourceProvider(
    legacyValuesByProvider,
    preferredProvider,
    availableProviders
  );

  let legacyPayloadStatus: LegacyPayloadStatus = 'missing';
  let legacyPayloadError: string | null = null;
  let legacyUnknownKeys: string[] = [];
  const legacyProfilesByInstance = new Map<FolderTreeInstance, unknown>();

  if (legacySourceProvider) {
    const legacyRaw = legacyValuesByProvider.get(legacySourceProvider) ?? '';
    const decodedLegacy = decodeSettingValue(LEGACY_FOLDER_TREE_PROFILES_KEY, legacyRaw);
    const extracted = extractLegacyProfiles(decodedLegacy);
    if (!extracted.ok) {
      legacyPayloadStatus = 'invalid_payload';
      legacyPayloadError = extracted.error;
    } else {
      legacyPayloadStatus = 'parsed';
      legacyUnknownKeys = extracted.unknownKeys;
      extracted.profilesByInstance.forEach((value: unknown, instance: FolderTreeInstance) => {
        legacyProfilesByInstance.set(instance, value);
      });
    }
  }

  const reports: InstanceReport[] = [];
  let foundInLegacy = 0;
  let changedInstances = 0;
  let unchangedInstances = 0;
  let invalidInstances = 0;
  let missingInstances = 0;
  let writesAttempted = 0;
  let writesApplied = 0;
  let writesFailed = 0;

  for (const instance of targetInstances) {
    const targetKey = getFolderTreeProfileV2Key(instance);
    const candidate = legacyProfilesByInstance.get(instance);
    const report: InstanceReport = {
      instance,
      targetKey,
      status: 'missing_in_legacy',
      writesAttempted: 0,
      writesApplied: 0,
      writesFailed: 0,
      writeFailures: [],
      warnings: [],
      error: null,
    };

    if (!legacySourceProvider) {
      report.warnings.push(`Legacy key "${LEGACY_FOLDER_TREE_PROFILES_KEY}" not found in configured providers.`);
      reports.push(report);
      missingInstances += 1;
      continue;
    }

    if (legacyPayloadStatus === 'invalid_payload') {
      report.warnings.push('Legacy payload could not be parsed.');
      report.error = legacyPayloadError;
      reports.push(report);
      missingInstances += 1;
      continue;
    }

    if (candidate === undefined) {
      report.warnings.push(`No legacy profile payload found for instance "${instance}".`);
      reports.push(report);
      missingInstances += 1;
      continue;
    }

    foundInLegacy += 1;

    let canonicalDecoded: string;
    try {
      const canonicalProfile = parseFolderTreeProfileV2Strict(
        candidate,
        defaultFolderTreeProfilesV2[instance]
      );
      canonicalDecoded = JSON.stringify(canonicalProfile);
    } catch (error) {
      report.status = 'invalid_profile';
      report.error = error instanceof Error ? error.message : String(error);
      invalidInstances += 1;
      reports.push(report);
      continue;
    }

    for (const provider of availableProviders) {
      const existingRaw = await readSettingForProvider(provider, targetKey);
      const existingDecoded =
        typeof existingRaw === 'string' ? decodeSettingValue(targetKey, existingRaw) : null;
      if (existingDecoded === canonicalDecoded) continue;

      report.writesAttempted += 1;
      writesAttempted += 1;

      if (options.dryRun) continue;

      try {
        await writeSettingForProvider(provider, targetKey, encodeSettingValue(targetKey, canonicalDecoded));
        report.writesApplied += 1;
        writesApplied += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        report.writesFailed += 1;
        writesFailed += 1;
        report.writeFailures.push({ provider, message });
      }
    }

    report.status = report.writesAttempted > 0 ? 'changed' : 'unchanged';
    if (report.status === 'changed') {
      changedInstances += 1;
    } else {
      unchangedInstances += 1;
    }
    reports.push(report);
  }

  let legacyDeleteAttempted = 0;
  let legacyDeleteApplied = 0;
  let legacyDeleteFailed = 0;
  const legacyDeleteFailures: Array<{ provider: AppDbProvider; message: string }> = [];
  if (options.deleteLegacyKey && legacyFoundInProviders.length > 0) {
    for (const provider of legacyFoundInProviders) {
      legacyDeleteAttempted += 1;
      if (options.dryRun) continue;

      try {
        await deleteSettingForProvider(provider, LEGACY_FOLDER_TREE_PROFILES_KEY);
        legacyDeleteApplied += 1;
      } catch (error) {
        legacyDeleteFailed += 1;
        legacyDeleteFailures.push({
          provider,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const summary: MigrationSummary = {
    mode: options.dryRun ? 'dry-run' : 'write',
    preferredProvider,
    availableProviders,
    legacyKey: LEGACY_FOLDER_TREE_PROFILES_KEY,
    legacySourceProvider,
    legacyFoundInProviders,
    legacyPayloadStatus,
    legacyPayloadError,
    legacyUnknownKeys,
    targetedInstances: targetInstances,
    scannedInstances: targetInstances.length,
    foundInLegacy,
    changedInstances,
    unchangedInstances,
    invalidInstances,
    missingInstances,
    writesAttempted,
    writesApplied,
    writesFailed,
    legacyDeleteAttempted,
    legacyDeleteApplied,
    legacyDeleteFailed,
    legacyDeleteFailures,
    reportPath: options.reportJsonPath,
    reports,
  };

  if (options.reportJsonPath) {
    await writeFile(options.reportJsonPath, JSON.stringify(summary, null, 2), 'utf8');
  }

  return summary;
};

void run()
  .then((summary: MigrationSummary) => {
    console.log(JSON.stringify(summary, null, 2));
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ ok: false, error: message }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeResources();
  });
