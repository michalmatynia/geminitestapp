import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { MongoClient, ObjectId } from 'mongodb';
import { Pool } from 'pg';

import {
  migrateCaseResolverWorkspaceDetachedDocumentsSchemaToV2,
  migrateCaseResolverWorkspaceDetachedHistorySchemaToV2,
} from './lib/case-resolver/workspace-detached-contract-migration';
import {
  COMPRESSED_SETTING_PREFIX,
  decodeSettingValue,
  encodeSettingValue,
} from '@/shared/lib/settings/settings-compression';

type CliOptions = {
  dryRun: boolean;
};

type KeySummary = {
  key: string;
  present: boolean;
  changed: boolean;
  legacyPayloadDetected: boolean;
  invalidPayload: boolean;
  compressed: boolean;
  schemaBefore: string | null;
  schemaAfter: string | null;
  warnings: string[];
};

type ProviderSummary = {
  provider: 'prisma' | 'mongodb';
  configured: boolean;
  changed: boolean;
  writesApplied: number;
  keys: KeySummary[];
  warnings: string[];
  error: string | null;
};

type MigrationSummary = {
  mode: 'dry-run' | 'write';
  providers: ProviderSummary[];
};

type SettingDoc = {
  _id?: string | ObjectId;
  key?: unknown;
  value?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type SchemaSpec = {
  key: string;
  migrate: (rawValue: string) => {
    nextValue: string;
    changed: boolean;
    legacyPayloadDetected: boolean;
    invalidPayload: boolean;
    schemaBefore: string | null;
    schemaAfter: string | null;
    warnings: string[];
  };
};

const SETTINGS_COLLECTION = 'settings';
const SCHEMA_SPECS: SchemaSpec[] = [
  {
    key: 'case_resolver_workspace_v2_history',
    migrate: migrateCaseResolverWorkspaceDetachedHistorySchemaToV2,
  },
  {
    key: 'case_resolver_workspace_v2_documents',
    migrate: migrateCaseResolverWorkspaceDetachedDocumentsSchemaToV2,
  },
];

const parseCliOptions = (argv: string[]): CliOptions => {
  const write = argv.some((arg: string) => arg === '--write' || arg === '--apply');
  return { dryRun: !write };
};

const emptyKeySummary = (key: string, warnings: string[] = []): KeySummary => ({
  key,
  present: false,
  changed: false,
  legacyPayloadDetected: false,
  invalidPayload: false,
  compressed: false,
  schemaBefore: null,
  schemaAfter: null,
  warnings,
});

const migrateSettingValue = ({
  key,
  encodedValue,
  migrate,
}: {
  key: string;
  encodedValue: string;
  migrate: SchemaSpec['migrate'];
}): { nextEncodedValue: string; summary: KeySummary } => {
  const compressed = encodedValue.startsWith(COMPRESSED_SETTING_PREFIX);
  const decodedValue = decodeSettingValue(key, encodedValue);
  const migrated = migrate(decodedValue);
  const nextEncodedValue = migrated.changed ? encodeSettingValue(key, migrated.nextValue) : encodedValue;
  return {
    nextEncodedValue,
    summary: {
      key,
      present: true,
      changed: migrated.changed && nextEncodedValue !== encodedValue ? true : migrated.changed,
      legacyPayloadDetected: migrated.legacyPayloadDetected,
      invalidPayload: migrated.invalidPayload,
      compressed,
      schemaBefore: migrated.schemaBefore,
      schemaAfter: migrated.schemaAfter,
      warnings: migrated.warnings,
    },
  };
};

const migratePrisma = async (options: CliOptions): Promise<ProviderSummary> => {
  if (!process.env['DATABASE_URL']) {
    return {
      provider: 'prisma',
      configured: false,
      changed: false,
      writesApplied: 0,
      keys: SCHEMA_SPECS.map((spec) =>
        emptyKeySummary(spec.key, ['DATABASE_URL is not configured.'])
      ),
      warnings: ['DATABASE_URL is not configured.'],
      error: null,
    };
  }

  let prisma: PrismaClient | null = null;
  let pool: Pool | null = null;
  try {
    pool = new Pool({
      connectionString: process.env['DATABASE_URL'],
    });
    prisma = new PrismaClient({
      adapter: new PrismaPg(pool),
    });

    const keys = SCHEMA_SPECS.map((spec: SchemaSpec) => spec.key);
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: keys,
        },
      },
      select: {
        key: true,
        value: true,
      },
    });
    const byKey = new Map<string, string>();
    settings.forEach((entry): void => {
      byKey.set(entry.key, entry.value);
    });

    let writesApplied = 0;
    const keySummaries: KeySummary[] = [];

    for (const spec of SCHEMA_SPECS) {
      const value = byKey.get(spec.key);
      if (typeof value !== 'string') {
        keySummaries.push(emptyKeySummary(spec.key, ['Setting not found.']));
        continue;
      }
      const migrated = migrateSettingValue({
        key: spec.key,
        encodedValue: value,
        migrate: spec.migrate,
      });
      keySummaries.push(migrated.summary);

      if (
        !options.dryRun &&
        migrated.summary.changed &&
        !migrated.summary.invalidPayload &&
        migrated.nextEncodedValue !== value
      ) {
        await prisma.setting.upsert({
          where: { key: spec.key },
          create: { key: spec.key, value: migrated.nextEncodedValue },
          update: { value: migrated.nextEncodedValue },
        });
        writesApplied += 1;
      }
    }

    return {
      provider: 'prisma',
      configured: true,
      changed: keySummaries.some((summary: KeySummary): boolean => summary.changed),
      writesApplied,
      keys: keySummaries,
      warnings: [],
      error: null,
    };
  } catch (error) {
    return {
      provider: 'prisma',
      configured: true,
      changed: false,
      writesApplied: 0,
      keys: SCHEMA_SPECS.map((spec) => emptyKeySummary(spec.key)),
      warnings: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await prisma?.$disconnect().catch(() => undefined);
    await pool?.end().catch(() => undefined);
  }
};

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const matchesSettingKey = (doc: SettingDoc, key: string): boolean => {
  const keyField = toTrimmedString(doc.key);
  const idField = typeof doc._id === 'string' ? doc._id.trim() : String(doc._id ?? '').trim();
  return keyField === key || idField === key;
};

const readMongoSettingValue = (
  docs: SettingDoc[],
  key: string
): { present: boolean; value: string | null; warnings: string[] } => {
  const matching = docs.find((doc: SettingDoc): boolean => matchesSettingKey(doc, key));
  if (!matching) {
    return {
      present: false,
      value: null,
      warnings: ['Setting not found.'],
    };
  }
  if (typeof matching.value === 'string') {
    return {
      present: true,
      value: matching.value,
      warnings: [],
    };
  }
  return {
    present: true,
    value: null,
    warnings: ['Setting exists but value is not a string.'],
  };
};

const migrateMongo = async (options: CliOptions): Promise<ProviderSummary> => {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    return {
      provider: 'mongodb',
      configured: false,
      changed: false,
      writesApplied: 0,
      keys: SCHEMA_SPECS.map((spec) =>
        emptyKeySummary(spec.key, ['MONGODB_URI is not configured.'])
      ),
      warnings: ['MONGODB_URI is not configured.'],
      error: null,
    };
  }

  const mongo = new MongoClient(uri);
  try {
    await mongo.connect();
    const db = mongo.db();
    const docs = await db
      .collection<SettingDoc>(SETTINGS_COLLECTION)
      .find({
        $or: SCHEMA_SPECS.flatMap((spec: SchemaSpec) => [{ _id: spec.key }, { key: spec.key }]),
      })
      .toArray();

    let writesApplied = 0;
    const keySummaries: KeySummary[] = [];

    for (const spec of SCHEMA_SPECS) {
      const read = readMongoSettingValue(docs, spec.key);
      if (!read.present || read.value === null) {
        keySummaries.push(
          emptyKeySummary(
            spec.key,
            read.warnings.length > 0 ? read.warnings : ['Setting not found.']
          )
        );
        continue;
      }

      const migrated = migrateSettingValue({
        key: spec.key,
        encodedValue: read.value,
        migrate: spec.migrate,
      });
      const mergedWarnings = Array.from(
        new Set([...read.warnings, ...migrated.summary.warnings])
      );
      const summary: KeySummary = {
        ...migrated.summary,
        warnings: mergedWarnings,
      };
      keySummaries.push(summary);

      if (
        !options.dryRun &&
        summary.changed &&
        !summary.invalidPayload &&
        migrated.nextEncodedValue !== read.value
      ) {
        const now = new Date();
        await db.collection<SettingDoc>(SETTINGS_COLLECTION).updateMany(
          {
            $or: [{ _id: spec.key }, { key: spec.key }],
          },
          {
            $set: {
              key: spec.key,
              value: migrated.nextEncodedValue,
              updatedAt: now,
            },
          }
        );
        writesApplied += 1;
      }
    }

    return {
      provider: 'mongodb',
      configured: true,
      changed: keySummaries.some((summary: KeySummary): boolean => summary.changed),
      writesApplied,
      keys: keySummaries,
      warnings: [],
      error: null,
    };
  } catch (error) {
    return {
      provider: 'mongodb',
      configured: true,
      changed: false,
      writesApplied: 0,
      keys: SCHEMA_SPECS.map((spec) => emptyKeySummary(spec.key)),
      warnings: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await mongo.close().catch(() => undefined);
  }
};

const main = async (): Promise<void> => {
  const options = parseCliOptions(process.argv.slice(2));
  const [prisma, mongodb] = await Promise.all([migratePrisma(options), migrateMongo(options)]);
  const summary: MigrationSummary = {
    mode: options.dryRun ? 'dry-run' : 'write',
    providers: [prisma, mongodb],
  };

  console.log('[migrate-case-resolver-workspace-detached-contract-v2] Summary');
  console.log(JSON.stringify(summary, null, 2));

  const failedProviders = summary.providers.filter(
    (provider: ProviderSummary): boolean =>
      provider.configured && typeof provider.error === 'string' && provider.error.length > 0
  );
  if (failedProviders.length > 0) {
    process.exitCode = 1;
  }
};

void main();
