import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { MongoClient, ObjectId } from 'mongodb';
import { Pool } from 'pg';

import { migrateTraderaApiUserIdStorage } from '@/features/integrations/services/tradera-api-user-id-storage-migration';

type CliOptions = {
  dryRun: boolean;
};

type ProviderSummary = {
  provider: 'prisma' | 'mongodb';
  configured: boolean;
  changed: boolean;
  writesApplied: number;
  traderaApiIntegrationCount: number;
  traderaApiConnectionCount: number;
  connectionsScanned: number;
  connectionsWithCanonicalUserId: number;
  connectionsWithLegacyUsernameOnly: number;
  connectionsBackfilledUserId: number;
  connectionsStillMissingUserId: number;
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
  traderaApiUserId?: unknown;
  username?: unknown;
};

const INTEGRATION_COLLECTION = 'integrations';
const INTEGRATION_CONNECTION_COLLECTION = 'integration_connections';
const TRADERA_API_INTEGRATION_SLUGS = new Set(['tradera-api']);

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
  traderaApiUserId: number;
};

type ConnectionScanStats = {
  connectionsScanned: number;
  connectionsWithCanonicalUserId: number;
  connectionsWithLegacyUsernameOnly: number;
  connectionsBackfilledUserId: number;
  connectionsStillMissingUserId: number;
  updates: ConnectionUpdate[];
};

const scanConnections = (input: {
  connections: Array<{
    id: string;
    traderaApiUserId: unknown;
    username: unknown;
  }>;
  warnings: string[];
}): ConnectionScanStats => {
  const stats: ConnectionScanStats = {
    connectionsScanned: 0,
    connectionsWithCanonicalUserId: 0,
    connectionsWithLegacyUsernameOnly: 0,
    connectionsBackfilledUserId: 0,
    connectionsStillMissingUserId: 0,
    updates: [],
  };

  input.connections.forEach((connection) => {
    stats.connectionsScanned += 1;
    const migrated = migrateTraderaApiUserIdStorage({
      traderaApiUserId: connection.traderaApiUserId,
      username: connection.username,
    });

    if (migrated.hadTraderaApiUserIdBefore) {
      stats.connectionsWithCanonicalUserId += 1;
    }
    if (!migrated.hadTraderaApiUserIdBefore && migrated.hadLegacyUsernameCandidate) {
      stats.connectionsWithLegacyUsernameOnly += 1;
    }
    if (migrated.backfilled) {
      stats.connectionsBackfilledUserId += 1;
    }
    if (!migrated.hasTraderaApiUserIdAfter) {
      stats.connectionsStillMissingUserId += 1;
    }

    migrated.warnings.forEach((warning) => {
      pushWarning(input.warnings, `Connection ${connection.id}: ${warning}`);
    });

    if (migrated.changed && migrated.traderaApiUserId != null) {
      stats.updates.push({
        id: connection.id,
        traderaApiUserId: migrated.traderaApiUserId,
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
      traderaApiIntegrationCount: 0,
      traderaApiConnectionCount: 0,
      connectionsScanned: 0,
      connectionsWithCanonicalUserId: 0,
      connectionsWithLegacyUsernameOnly: 0,
      connectionsBackfilledUserId: 0,
      connectionsStillMissingUserId: 0,
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

    const traderaIntegrations = await prisma.integration.findMany({
      where: {
        slug: {
          in: Array.from(TRADERA_API_INTEGRATION_SLUGS),
        },
      },
      select: {
        id: true,
      },
    });
    const integrationIds = traderaIntegrations.map((integration) => integration.id);

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
              traderaApiUserId: true,
              username: true,
            },
          })
        : [];

    if (integrationIds.length === 0) {
      pushWarning(warnings, 'No Tradera API integrations found.');
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
            traderaApiUserId: update.traderaApiUserId,
            updatedAt: new Date(),
          },
        });
        writesApplied += 1;
      }
    }

    if (stats.connectionsStillMissingUserId > 0) {
      pushWarning(
        warnings,
        `${stats.connectionsStillMissingUserId} Tradera API connection(s) still missing traderaApiUserId.`
      );
    }

    return {
      provider: 'prisma',
      configured: true,
      changed: stats.updates.length > 0,
      writesApplied,
      traderaApiIntegrationCount: integrationIds.length,
      traderaApiConnectionCount: connections.length,
      connectionsScanned: stats.connectionsScanned,
      connectionsWithCanonicalUserId: stats.connectionsWithCanonicalUserId,
      connectionsWithLegacyUsernameOnly: stats.connectionsWithLegacyUsernameOnly,
      connectionsBackfilledUserId: stats.connectionsBackfilledUserId,
      connectionsStillMissingUserId: stats.connectionsStillMissingUserId,
      warnings,
      error: null,
    };
  } catch (error) {
    return {
      provider: 'prisma',
      configured: true,
      changed: false,
      writesApplied: 0,
      traderaApiIntegrationCount: 0,
      traderaApiConnectionCount: 0,
      connectionsScanned: 0,
      connectionsWithCanonicalUserId: 0,
      connectionsWithLegacyUsernameOnly: 0,
      connectionsBackfilledUserId: 0,
      connectionsStillMissingUserId: 0,
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
      traderaApiIntegrationCount: 0,
      traderaApiConnectionCount: 0,
      connectionsScanned: 0,
      connectionsWithCanonicalUserId: 0,
      connectionsWithLegacyUsernameOnly: 0,
      connectionsBackfilledUserId: 0,
      connectionsStillMissingUserId: 0,
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
            $in: Array.from(TRADERA_API_INTEGRATION_SLUGS),
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

    const traderaIntegrationIds = Array.from(
      new Set(
        integrationDocs
          .flatMap((doc) => [normalizeDocId(doc.id), normalizeDocId(doc._id)])
          .filter((id): id is string => Boolean(id))
      )
    );

    const integrationIdCandidates = Array.from(
      new Map<string, string | ObjectId>(
        traderaIntegrationIds.flatMap((integrationId) =>
          toDocumentIdCandidates(integrationId).map((candidate) => {
            const key =
              candidate instanceof ObjectId ? `oid:${candidate.toHexString()}` : `str:${candidate}`;
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
                  traderaApiUserId: 1,
                  username: 1,
                },
              }
            )
            .toArray()
        : [];

    if (traderaIntegrationIds.length === 0) {
      pushWarning(warnings, 'No Tradera API integrations found.');
    }

    const connections: Array<{
      id: string;
      traderaApiUserId: unknown;
      username: unknown;
      rawId?: string | ObjectId;
    }> = [];
    for (const doc of connectionDocs) {
      const connectionId = normalizeDocId(doc.id) ?? normalizeDocId(doc._id);
      if (!connectionId) {
        pushWarning(warnings, 'Skipped Tradera API connection document without id.');
        continue;
      }
      connections.push({
        id: connectionId,
        traderaApiUserId: doc.traderaApiUserId,
        username: doc.username,
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
              traderaApiUserId: update.traderaApiUserId,
              updatedAt: now,
            },
          }
        );
        writesApplied += 1;
      }
    }

    if (stats.connectionsStillMissingUserId > 0) {
      pushWarning(
        warnings,
        `${stats.connectionsStillMissingUserId} Tradera API connection(s) still missing traderaApiUserId.`
      );
    }

    return {
      provider: 'mongodb',
      configured: true,
      changed: stats.updates.length > 0,
      writesApplied,
      traderaApiIntegrationCount: traderaIntegrationIds.length,
      traderaApiConnectionCount: connections.length,
      connectionsScanned: stats.connectionsScanned,
      connectionsWithCanonicalUserId: stats.connectionsWithCanonicalUserId,
      connectionsWithLegacyUsernameOnly: stats.connectionsWithLegacyUsernameOnly,
      connectionsBackfilledUserId: stats.connectionsBackfilledUserId,
      connectionsStillMissingUserId: stats.connectionsStillMissingUserId,
      warnings,
      error: null,
    };
  } catch (error) {
    return {
      provider: 'mongodb',
      configured: true,
      changed: false,
      writesApplied: 0,
      traderaApiIntegrationCount: 0,
      traderaApiConnectionCount: 0,
      connectionsScanned: 0,
      connectionsWithCanonicalUserId: 0,
      connectionsWithLegacyUsernameOnly: 0,
      connectionsBackfilledUserId: 0,
      connectionsStillMissingUserId: 0,
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
