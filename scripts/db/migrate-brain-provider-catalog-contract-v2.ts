import 'dotenv/config';

import {
  AI_BRAIN_PROVIDER_CATALOG_KEY,
  defaultBrainProviderCatalog,
  parseBrainProviderCatalog,
  sanitizeBrainProviderCatalog,
  toPersistedBrainProviderCatalog,
  type AiBrainCatalogEntry,
  type AiBrainProviderCatalog,
} from '@/shared/lib/ai-brain/settings';
import { BRAIN_CATALOG_POOL_VALUES, sanitizeCatalogEntries } from '@/shared/lib/ai-brain/catalog-entries';
import { getAppDbProvider, type AppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

type CliOptions = {
  dryRun: boolean;
  preferredProvider: 'auto' | AppDbProvider;
};

type MigrationStatus = 'missing' | 'canonical' | 'migrated' | 'reset';

type Summary = {
  mode: 'dry-run' | 'write';
  preferredProvider: AppDbProvider;
  availableProviders: AppDbProvider[];
  sourceProvider: AppDbProvider | null;
  status: MigrationStatus;
  changed: boolean;
  writesAttempted: number;
  writesApplied: number;
  writesFailed: number;
  canonicalEntryCount: number;
};

type SettingDoc = {
  _id?: string;
  key?: unknown;
  value?: unknown;
};

const parseArgs = (argv: string[]): CliOptions => {
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
    // Fall through to environment-based fallback.
  }

  if (availableProviders.includes('mongodb')) return 'mongodb';
  if (availableProviders.includes('prisma')) return 'prisma';
  throw new Error('No database provider configured. Set DATABASE_URL or MONGODB_URI.');
};

const readFromPrisma = async (): Promise<string | null> => {
  if (!process.env['DATABASE_URL']) return null;
  if (!('setting' in prisma)) return null;
  const row = await prisma.setting.findUnique({
    where: { key: AI_BRAIN_PROVIDER_CATALOG_KEY },
    select: { value: true },
  });
  return row?.value ?? null;
};

const readFromMongo = async (): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const db = await getMongoDb();
  const doc = await db.collection<SettingDoc>('settings').findOne({
    $or: [{ _id: AI_BRAIN_PROVIDER_CATALOG_KEY }, { key: AI_BRAIN_PROVIDER_CATALOG_KEY }],
  });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const writeToPrisma = async (value: string): Promise<void> => {
  if (!process.env['DATABASE_URL']) return;
  if (!('setting' in prisma)) return;
  await prisma.setting.upsert({
    where: { key: AI_BRAIN_PROVIDER_CATALOG_KEY },
    update: { value },
    create: { key: AI_BRAIN_PROVIDER_CATALOG_KEY, value },
  });
};

const writeToMongo = async (value: string): Promise<void> => {
  if (!process.env['MONGODB_URI']) return;
  const db = await getMongoDb();
  await db.collection<SettingDoc>('settings').updateOne(
    {
      $or: [{ _id: AI_BRAIN_PROVIDER_CATALOG_KEY }, { key: AI_BRAIN_PROVIDER_CATALOG_KEY }],
    },
    {
      $set: {
        key: AI_BRAIN_PROVIDER_CATALOG_KEY,
        value,
      },
      $setOnInsert: {
        _id: AI_BRAIN_PROVIDER_CATALOG_KEY,
      },
    },
    { upsert: true }
  );
};

const extractEntriesFromLegacyShape = (
  parsedRecord: Record<string, unknown>
): AiBrainCatalogEntry[] => {
  const candidates: Array<Pick<AiBrainCatalogEntry, 'pool' | 'value'> | null> = [];

  const entries = parsedRecord['entries'];
  if (Array.isArray(entries)) {
    entries.forEach((entry: unknown): void => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
      const mapped = entry as { pool?: unknown; value?: unknown };
      candidates.push({
        pool: String(mapped.pool ?? '').trim() as AiBrainCatalogEntry['pool'],
        value: String(mapped.value ?? '').trim(),
      });
    });
  }

  BRAIN_CATALOG_POOL_VALUES.forEach((pool) => {
    const values = parsedRecord[pool];
    if (!Array.isArray(values)) return;
    values.forEach((value: unknown): void => {
      if (typeof value !== 'string') return;
      candidates.push({ pool, value });
    });
  });

  return sanitizeCatalogEntries(candidates);
};

const migrateProviderCatalogValue = (
  rawValue: string | null
): { catalog: AiBrainProviderCatalog; status: MigrationStatus } => {
  if (!rawValue?.trim()) {
    return {
      catalog: sanitizeBrainProviderCatalog(defaultBrainProviderCatalog),
      status: 'missing',
    };
  }

  try {
    return {
      catalog: parseBrainProviderCatalog(rawValue),
      status: 'canonical',
    };
  } catch {
    try {
      const parsed = JSON.parse(rawValue) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {
          catalog: sanitizeBrainProviderCatalog(defaultBrainProviderCatalog),
          status: 'reset',
        };
      }
      const entries = extractEntriesFromLegacyShape(parsed as Record<string, unknown>);
      if (entries.length === 0) {
        return {
          catalog: sanitizeBrainProviderCatalog(defaultBrainProviderCatalog),
          status: 'reset',
        };
      }
      return {
        catalog: sanitizeBrainProviderCatalog({ entries }),
        status: 'migrated',
      };
    } catch {
      return {
        catalog: sanitizeBrainProviderCatalog(defaultBrainProviderCatalog),
        status: 'reset',
      };
    }
  }
};

const closeResources = async (): Promise<void> => {
  await prisma.$disconnect().catch(() => {});
  if (process.env['MONGODB_URI']) {
    const client = await getMongoClient().catch(() => null);
    await client?.close().catch(() => {});
  }
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const availableProviders = resolveAvailableProviders();
  const preferredProvider = await resolvePreferredProvider(
    options.preferredProvider,
    availableProviders
  );

  const valuesByProvider = new Map<AppDbProvider, string | null>();
  if (availableProviders.includes('prisma')) {
    valuesByProvider.set('prisma', await readFromPrisma());
  }
  if (availableProviders.includes('mongodb')) {
    valuesByProvider.set('mongodb', await readFromMongo());
  }

  const sourceOrder: AppDbProvider[] = [
    preferredProvider,
    ...availableProviders.filter((provider) => provider !== preferredProvider),
  ];
  const sourceProvider =
    sourceOrder.find((provider) => {
      const value = valuesByProvider.get(provider);
      return typeof value === 'string';
    }) ?? null;
  const sourceRaw = sourceProvider ? valuesByProvider.get(sourceProvider) ?? null : null;

  const migrated = migrateProviderCatalogValue(sourceRaw);
  const canonicalValue = JSON.stringify(toPersistedBrainProviderCatalog(migrated.catalog));
  const changed = sourceRaw !== canonicalValue;

  let writesAttempted = 0;
  let writesApplied = 0;
  let writesFailed = 0;

  if (!options.dryRun && changed) {
    for (const provider of availableProviders) {
      writesAttempted += 1;
      try {
        if (provider === 'mongodb') {
          await writeToMongo(canonicalValue);
        } else {
          await writeToPrisma(canonicalValue);
        }
        writesApplied += 1;
      } catch {
        writesFailed += 1;
      }
    }
  }

  const summary: Summary = {
    mode: options.dryRun ? 'dry-run' : 'write',
    preferredProvider,
    availableProviders,
    sourceProvider,
    status: migrated.status,
    changed,
    writesAttempted,
    writesApplied,
    writesFailed,
    canonicalEntryCount: migrated.catalog.entries.length,
  };

  console.log(JSON.stringify(summary, null, 2));
}

void main()
  .catch((error) => {
    console.error('Failed to migrate AI Brain provider catalog contract v2:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeResources();
  });
