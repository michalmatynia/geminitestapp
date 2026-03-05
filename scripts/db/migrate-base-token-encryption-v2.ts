import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { MongoClient, ObjectId } from 'mongodb';
import { Pool } from 'pg';

import { migrateBaseTokenEncryption } from './lib/integrations/base-token-encryption-migration';

type CliOptions = {
  dryRun: boolean;
};

type ProviderSummary = {
  provider: 'prisma' | 'mongodb';
  configured: boolean;
  changed: boolean;
  writesApplied: number;
  baseIntegrationCount: number;
  baseConnectionCount: number;
  connectionsScanned: number;
  connectionsAlreadyEncrypted: number;
  connectionsEncryptedByMigration: number;
  connectionsStillMissingToken: number;
  warnings: string[];
  error: string | null;
};

type MigrationSummary = {
  mode: 'dry-run' | 'write';
  providers: ProviderSummary[];
};

type IntegrationDoc = {
  _id?: string | ObjectId;
  id?: unknown;
};

type ConnectionDoc = {
  _id?: string | ObjectId;
  id?: unknown;
  integrationId?: unknown;
  baseApiToken?: unknown;
};

const INTEGRATION_COLLECTION = 'integrations';
const INTEGRATION_CONNECTION_COLLECTION = 'integration_connections';
const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);

const parseCliOptions = (argv: string[]): CliOptions => {
  const write = argv.some((arg: string) => arg === '--write' || arg === '--apply');
  return { dryRun: !write };
};

const normalizeOptionalId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeDocId = (value: unknown): string | null => {
  if (value instanceof ObjectId) return value.toHexString();
  return normalizeOptionalId(value);
};

const toDocumentIdCandidates = (id: string): Array<string | ObjectId> => {
  if (ObjectId.isValid(id) && id.length === 24) {
    return [id, new ObjectId(id)];
  }
  return [id];
};

const pushWarning = (warnings: string[], warning: string): void => {
  if (!warning.trim()) return;
  if (warnings.includes(warning)) return;
  if (warnings.length >= 25) return;
  warnings.push(warning);
};

type ConnectionUpdate = {
  id: string;
  baseApiToken: string;
};

type ConnectionScanStats = {
  connectionsScanned: number;
  connectionsAlreadyEncrypted: number;
  connectionsEncryptedByMigration: number;
  connectionsStillMissingToken: number;
  updates: ConnectionUpdate[];
};

const scanConnections = (input: {
  connections: Array<{ id: string; baseApiToken: unknown }>;
  warnings: string[];
}): ConnectionScanStats => {
  const stats: ConnectionScanStats = {
    connectionsScanned: 0,
    connectionsAlreadyEncrypted: 0,
    connectionsEncryptedByMigration: 0,
    connectionsStillMissingToken: 0,
    updates: [],
  };

  input.connections.forEach((connection) => {
    stats.connectionsScanned += 1;
    const migrated = migrateBaseTokenEncryption({
      baseApiToken: connection.baseApiToken,
    });

    if (!migrated.hadTokenBefore) {
      stats.connectionsStillMissingToken += 1;
    } else if (migrated.alreadyEncrypted) {
      stats.connectionsAlreadyEncrypted += 1;
    } else if (migrated.changed) {
      stats.connectionsEncryptedByMigration += 1;
    }

    migrated.warnings.forEach((warning) => {
      pushWarning(input.warnings, `Connection ${connection.id}: ${warning}`);
    });

    if (migrated.changed && migrated.baseApiToken) {
      stats.updates.push({
        id: connection.id,
        baseApiToken: migrated.baseApiToken,
      });
    }
  });

  return stats;
};

const migratePrisma = async (options: CliOptions): Promise<ProviderSummary> => {
  if (!process.env['DATABASE_URL']) {
    return {
      provider: 'prisma',
      configured: false,
      changed: false,
      writesApplied: 0,
      baseIntegrationCount: 0,
      baseConnectionCount: 0,
      connectionsScanned: 0,
      connectionsAlreadyEncrypted: 0,
      connectionsEncryptedByMigration: 0,
      connectionsStillMissingToken: 0,
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

    const warnings: string[] = [];

    const baseIntegrations = await prisma.integration.findMany({
      where: {
        slug: {
          in: Array.from(BASE_INTEGRATION_SLUGS),
        },
      },
      select: {
        id: true,
      },
    });
    const integrationIds = baseIntegrations.map((integration) => integration.id);

    const connections =
      integrationIds.length > 0
        ? await prisma.integrationConnection.findMany({
            where: {
              integrationId: {
                in: integrationIds,
              },
            },
            select: {
              id: true,
              baseApiToken: true,
            },
          })
        : [];

    if (integrationIds.length === 0) {
      pushWarning(warnings, 'No Base integrations found.');
    }

    const stats = scanConnections({
      connections,
      warnings,
    });

    let writesApplied = 0;
    if (!options.dryRun) {
      for (const update of stats.updates) {
        await prisma.integrationConnection.update({
          where: { id: update.id },
          data: {
            baseApiToken: update.baseApiToken,
            baseTokenUpdatedAt: new Date(),
          },
        });
        writesApplied += 1;
      }
    }

    if (stats.connectionsStillMissingToken > 0) {
      pushWarning(
        warnings,
        `${stats.connectionsStillMissingToken} Base connection(s) still missing baseApiToken.`
      );
    }

    return {
      provider: 'prisma',
      configured: true,
      changed: stats.updates.length > 0,
      writesApplied,
      baseIntegrationCount: integrationIds.length,
      baseConnectionCount: connections.length,
      connectionsScanned: stats.connectionsScanned,
      connectionsAlreadyEncrypted: stats.connectionsAlreadyEncrypted,
      connectionsEncryptedByMigration: stats.connectionsEncryptedByMigration,
      connectionsStillMissingToken: stats.connectionsStillMissingToken,
      warnings,
      error: null,
    };
  } catch (error) {
    return {
      provider: 'prisma',
      configured: true,
      changed: false,
      writesApplied: 0,
      baseIntegrationCount: 0,
      baseConnectionCount: 0,
      connectionsScanned: 0,
      connectionsAlreadyEncrypted: 0,
      connectionsEncryptedByMigration: 0,
      connectionsStillMissingToken: 0,
      warnings: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await prisma?.$disconnect().catch(() => undefined);
    await pool?.end().catch(() => undefined);
  }
};

const migrateMongo = async (options: CliOptions): Promise<ProviderSummary> => {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    return {
      provider: 'mongodb',
      configured: false,
      changed: false,
      writesApplied: 0,
      baseIntegrationCount: 0,
      baseConnectionCount: 0,
      connectionsScanned: 0,
      connectionsAlreadyEncrypted: 0,
      connectionsEncryptedByMigration: 0,
      connectionsStillMissingToken: 0,
      warnings: ['MONGODB_URI is not configured.'],
      error: null,
    };
  }

  const mongo = new MongoClient(uri);
  try {
    await mongo.connect();
    const db = mongo.db();
    const warnings: string[] = [];

    const integrationDocs = await db
      .collection<IntegrationDoc>(INTEGRATION_COLLECTION)
      .find(
        {
          slug: {
            $in: Array.from(BASE_INTEGRATION_SLUGS),
          },
        },
        {
          projection: {
            _id: 1,
            id: 1,
          },
        }
      )
      .toArray();

    const baseIntegrationIds = Array.from(
      new Set(
        integrationDocs
          .flatMap((doc) => [normalizeDocId(doc.id), normalizeDocId(doc._id)])
          .filter((id): id is string => Boolean(id))
      )
    );

    const integrationIdCandidates = Array.from(
      new Map<string, string | ObjectId>(
        baseIntegrationIds.flatMap((integrationId) =>
          toDocumentIdCandidates(integrationId).map((candidate) => {
            const key = candidate instanceof ObjectId ? `oid:${candidate.toHexString()}` : `str:${candidate}`;
            return [key, candidate] as const;
          })
        )
      ).values()
    );

    const connectionDocs =
      integrationIdCandidates.length > 0
        ? await db
            .collection<ConnectionDoc>(INTEGRATION_CONNECTION_COLLECTION)
            .find(
              {
                integrationId: {
                  $in: integrationIdCandidates,
                },
              },
              {
                projection: {
                  _id: 1,
                  id: 1,
                  baseApiToken: 1,
                },
              }
            )
            .toArray()
        : [];

    if (baseIntegrationIds.length === 0) {
      pushWarning(warnings, 'No Base integrations found.');
    }

    const connections: Array<{
      id: string;
      baseApiToken: unknown;
      rawId?: string | ObjectId;
    }> = [];
    for (const doc of connectionDocs) {
      const connectionId = normalizeDocId(doc.id) ?? normalizeDocId(doc._id);
      if (!connectionId) {
        pushWarning(warnings, 'Skipped Base connection document without id.');
        continue;
      }
      connections.push({
        id: connectionId,
        baseApiToken: doc.baseApiToken,
        rawId: doc._id,
      });
    }

    const stats = scanConnections({
      connections,
      warnings,
    });

    let writesApplied = 0;
    if (!options.dryRun) {
      for (const update of stats.updates) {
        const target = connections.find((connection) => connection.id === update.id);
        const filterCandidates: Array<Record<string, unknown>> = [{ id: update.id }, { _id: update.id }];
        if (target?.rawId !== undefined) {
          filterCandidates.push({ _id: target.rawId });
        }

        const now = new Date();
        await db.collection<ConnectionDoc>(INTEGRATION_CONNECTION_COLLECTION).updateMany(
          {
            $or: filterCandidates,
          },
          {
            $set: {
              id: update.id,
              baseApiToken: update.baseApiToken,
              baseTokenUpdatedAt: now,
              updatedAt: now,
            },
          }
        );
        writesApplied += 1;
      }
    }

    if (stats.connectionsStillMissingToken > 0) {
      pushWarning(
        warnings,
        `${stats.connectionsStillMissingToken} Base connection(s) still missing baseApiToken.`
      );
    }

    return {
      provider: 'mongodb',
      configured: true,
      changed: stats.updates.length > 0,
      writesApplied,
      baseIntegrationCount: baseIntegrationIds.length,
      baseConnectionCount: connections.length,
      connectionsScanned: stats.connectionsScanned,
      connectionsAlreadyEncrypted: stats.connectionsAlreadyEncrypted,
      connectionsEncryptedByMigration: stats.connectionsEncryptedByMigration,
      connectionsStillMissingToken: stats.connectionsStillMissingToken,
      warnings,
      error: null,
    };
  } catch (error) {
    return {
      provider: 'mongodb',
      configured: true,
      changed: false,
      writesApplied: 0,
      baseIntegrationCount: 0,
      baseConnectionCount: 0,
      connectionsScanned: 0,
      connectionsAlreadyEncrypted: 0,
      connectionsEncryptedByMigration: 0,
      connectionsStillMissingToken: 0,
      warnings: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await mongo.close().catch(() => undefined);
  }
};

const hasFatalProviderError = (summary: ProviderSummary): boolean =>
  summary.configured && Boolean(summary.error);

const run = async (): Promise<void> => {
  const options = parseCliOptions(process.argv.slice(2));

  const [prismaSummary, mongoSummary] = await Promise.all([
    migratePrisma(options),
    migrateMongo(options),
  ]);

  const summary: MigrationSummary = {
    mode: options.dryRun ? 'dry-run' : 'write',
    providers: [prismaSummary, mongoSummary],
  };

  console.log(JSON.stringify(summary, null, 2));

  if (summary.providers.some(hasFatalProviderError)) {
    process.exitCode = 1;
  }
};

void run();
