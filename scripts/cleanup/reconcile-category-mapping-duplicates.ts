import 'dotenv/config';

import { MongoClient, type Db, type ObjectId } from 'mongodb';

const LOG_PREFIX = '[reconcile-category-mappings]';
const CATEGORY_MAPPING_COLLECTION = 'category_mappings';
const EXTERNAL_CATEGORY_COLLECTION = 'external_categories';
const PRODUCT_CATEGORY_COLLECTION = 'product_categories';

type ReconcileSummary = {
  provider: 'prisma' | 'mongodb';
  scanned: number;
  groups: number;
  changedGroups: number;
  activated: number;
  deactivated: number;
  dryRun: boolean;
  skipped: boolean;
  reason?: string;
};

type MappingCandidate<TId = string> = {
  id: TId;
  idString: string;
  connectionId: string;
  catalogId: string;
  internalCategoryId: string;
  internalCategoryName: string;
  externalCategoryId: string;
  externalCategoryName: string;
  externalCategoryPath: string;
  externalCategoryExists: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type MongoCategoryMappingDoc = {
  _id: string | ObjectId;
  connectionId: string;
  catalogId: string;
  internalCategoryId: string | null;
  externalCategoryId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type MongoExternalCategoryDoc = {
  _id: string | ObjectId;
  connectionId: string;
  externalId: string;
  name: string;
  path: string | null;
};

type MongoProductCategoryDoc = {
  _id: string | ObjectId;
  name: string;
};

type PrismaCategoryMappingRow = {
  id: string;
  connectionId: string;
  catalogId: string;
  internalCategoryId: string | null;
  externalCategoryId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  internalCategory: { name: string } | null;
  externalCategory: { name: string; path: string | null } | null;
};

const toMillis = (value: unknown): number => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeInternalCategoryId = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const buildScopeKey = (
  connectionId: string,
  catalogId: string,
  internalCategoryId: string
): string => `${connectionId}::${catalogId}::${internalCategoryId}`;

const parseDryRunArg = (): boolean => {
  const argDryRun = process.argv.some((arg) => arg === '--dry-run');
  const envValue = process.env['DRY_RUN']?.trim().toLowerCase();
  const envDryRun = envValue === '1' || envValue === 'true' || envValue === 'yes';
  return argDryRun || envDryRun;
};

const withMongoDb = async <T>(operation: (db: Db) => Promise<T>): Promise<T> => {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    throw new Error('MONGODB_URI not set');
  }
  const dbName = process.env['MONGODB_DB'] || 'app';
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 30_000,
    connectTimeoutMS: 30_000,
    socketTimeoutMS: 180_000,
  });
  await client.connect();
  try {
    const db = client.db(dbName);
    return await operation(db);
  } finally {
    await client.close();
  }
};

const normalizeTokenText = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const scoreNameAlignment = (
  internalCategoryName: string,
  externalName: string,
  externalPath: string
): number => {
  const internal = normalizeTokenText(internalCategoryName);
  if (!internal) return 0;
  const external = normalizeTokenText(`${externalName} ${externalPath}`);
  if (!external) return 0;

  let score = 0;
  if (external.includes(internal)) score += 6;

  const tokens = internal.split(' ').filter((token) => token.length >= 3);
  for (const token of tokens) {
    if (external.includes(token)) score += 2;
    if (token.endsWith('s')) {
      const singular = token.slice(0, -1);
      if (singular.length >= 3 && external.includes(singular)) score += 1;
    }
  }
  return score;
};

const chooseKeeper = <TId>(candidates: MappingCandidate<TId>[]): MappingCandidate<TId> | null => {
  const validCandidates = candidates.filter((candidate) => candidate.externalCategoryExists);
  if (validCandidates.length === 0) return null;

  const ordered = [...validCandidates].sort((left, right) => {
    const rightScore = scoreNameAlignment(
      right.internalCategoryName,
      right.externalCategoryName,
      right.externalCategoryPath
    );
    const leftScore = scoreNameAlignment(
      left.internalCategoryName,
      left.externalCategoryName,
      left.externalCategoryPath
    );
    const scoreDiff = rightScore - leftScore;
    if (scoreDiff !== 0) return scoreDiff;

    if (right.isActive !== left.isActive) {
      return Number(right.isActive) - Number(left.isActive);
    }

    const updatedDiff = toMillis(right.updatedAt) - toMillis(left.updatedAt);
    if (updatedDiff !== 0) return updatedDiff;

    const createdDiff = toMillis(right.createdAt) - toMillis(left.createdAt);
    if (createdDiff !== 0) return createdDiff;

    return right.idString.localeCompare(left.idString);
  });

  return ordered[0] ?? null;
};

const groupByInternalCategoryScope = <TId>(
  candidates: MappingCandidate<TId>[]
): Map<string, MappingCandidate<TId>[]> => {
  const groups = new Map<string, MappingCandidate<TId>[]>();
  for (const candidate of candidates) {
    const key = buildScopeKey(
      candidate.connectionId,
      candidate.catalogId,
      candidate.internalCategoryId
    );
    const existing = groups.get(key);
    if (existing) {
      existing.push(candidate);
    } else {
      groups.set(key, [candidate]);
    }
  }
  return groups;
};

const reconcilePrismaMappings = async (dryRun: boolean): Promise<ReconcileSummary> => {
  if (!process.env['DATABASE_URL']) {
    console.log(`${LOG_PREFIX} Prisma skipped (DATABASE_URL not set)`);
    return {
      provider: 'prisma',
      scanned: 0,
      groups: 0,
      changedGroups: 0,
      activated: 0,
      deactivated: 0,
      dryRun,
      skipped: true,
      reason: 'DATABASE_URL not set',
    };
  }

  let prisma: any = null;
  try {
    const prismaModule = await import('@/shared/lib/db/prisma');
    prisma = prismaModule.default;

    const rows: PrismaCategoryMappingRow[] = await prisma.categoryMapping.findMany({
      select: {
        id: true,
        connectionId: true,
        catalogId: true,
        internalCategoryId: true,
        externalCategoryId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        internalCategory: { select: { name: true } },
        externalCategory: { select: { name: true, path: true } },
      },
    });

    const candidates: MappingCandidate<string>[] = rows
      .map((row) => {
        const internalCategoryId = normalizeInternalCategoryId(row.internalCategoryId);
        if (!internalCategoryId) return null;
        return {
          id: row.id,
          idString: row.id,
          connectionId: row.connectionId,
          catalogId: row.catalogId,
          internalCategoryId,
          internalCategoryName: toTrimmedString(row.internalCategory?.name) || internalCategoryId,
          externalCategoryId: row.externalCategoryId,
          externalCategoryName: toTrimmedString(row.externalCategory?.name),
          externalCategoryPath: toTrimmedString(row.externalCategory?.path),
          externalCategoryExists: Boolean(row.externalCategory),
          isActive: Boolean(row.isActive),
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        } satisfies MappingCandidate<string>;
      })
      .filter((entry): entry is MappingCandidate<string> => Boolean(entry));

    const groups = groupByInternalCategoryScope(candidates);
    const idsToActivate: string[] = [];
    const idsToDeactivate: string[] = [];
    let changedGroups = 0;

    for (const [scopeKey, scopedCandidates] of groups.entries()) {
      const keeper = chooseKeeper(scopedCandidates);
      let groupChanged = false;
      for (const candidate of scopedCandidates) {
        const shouldBeActive = keeper ? candidate.idString === keeper.idString : false;
        if (candidate.isActive && !shouldBeActive) {
          idsToDeactivate.push(candidate.id);
          groupChanged = true;
        }
        if (!candidate.isActive && shouldBeActive) {
          idsToActivate.push(candidate.id);
          groupChanged = true;
        }
      }
      if (groupChanged) {
        changedGroups += 1;
        console.log(
          `${LOG_PREFIX} Prisma ${scopeKey} -> keep=${keeper?.externalCategoryId ?? 'NONE'} activate=${scopedCandidates.filter((c) => !c.isActive && keeper && c.idString === keeper.idString).length} deactivate=${scopedCandidates.filter((c) => c.isActive && (!keeper || c.idString !== keeper.idString)).length}`
        );
      }
    }

    let activated = idsToActivate.length;
    let deactivated = idsToDeactivate.length;
    if (!dryRun) {
      if (idsToDeactivate.length > 0) {
        const result = await prisma.categoryMapping.updateMany({
          where: { id: { in: idsToDeactivate }, isActive: true },
          data: { isActive: false },
        });
        deactivated = result.count;
      } else {
        deactivated = 0;
      }
      if (idsToActivate.length > 0) {
        const result = await prisma.categoryMapping.updateMany({
          where: { id: { in: idsToActivate }, isActive: false },
          data: { isActive: true },
        });
        activated = result.count;
      } else {
        activated = 0;
      }
    }

    console.log(
      `${LOG_PREFIX} Prisma ${dryRun ? 'dry-run' : 'applied'}: scanned=${candidates.length} groups=${groups.size} changedGroups=${changedGroups} ${dryRun ? 'wouldActivate' : 'activated'}=${activated} ${dryRun ? 'wouldDeactivate' : 'deactivated'}=${deactivated}`
    );

    return {
      provider: 'prisma',
      scanned: candidates.length,
      groups: groups.size,
      changedGroups,
      activated,
      deactivated,
      dryRun,
      skipped: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Prisma reconciliation error';
    console.warn(`${LOG_PREFIX} Prisma skipped: ${message}`);
    return {
      provider: 'prisma',
      scanned: 0,
      groups: 0,
      changedGroups: 0,
      activated: 0,
      deactivated: 0,
      dryRun,
      skipped: true,
      reason: 'failed',
    };
  } finally {
    if (prisma?.$disconnect) {
      try {
        await prisma.$disconnect();
      } catch {
        // ignore disconnect failures in one-off script
      }
    }
  }
};

const reconcileMongoMappings = async (dryRun: boolean): Promise<ReconcileSummary> => {
  if (!process.env['MONGODB_URI']) {
    console.log(`${LOG_PREFIX} Mongo skipped (MONGODB_URI not set)`);
    return {
      provider: 'mongodb',
      scanned: 0,
      groups: 0,
      changedGroups: 0,
      activated: 0,
      deactivated: 0,
      dryRun,
      skipped: true,
      reason: 'MONGODB_URI not set',
    };
  }

  try {
    return await withMongoDb(async (db) => {
      const mappingCollection = db.collection<MongoCategoryMappingDoc>(CATEGORY_MAPPING_COLLECTION);

      const mappingDocs = await mappingCollection.find({}).toArray();
      const normalizedMappings = mappingDocs
        .map((doc) => {
          const internalCategoryId = normalizeInternalCategoryId(doc.internalCategoryId);
          if (!internalCategoryId) return null;
          return {
            ...doc,
            internalCategoryId,
          };
        })
        .filter((doc): doc is MongoCategoryMappingDoc & { internalCategoryId: string } =>
          Boolean(doc)
        );

      const internalCategoryIds = Array.from(
        new Set(normalizedMappings.map((doc) => doc.internalCategoryId))
      );
      const externalCategoryIds = Array.from(
        new Set(normalizedMappings.map((doc) => toTrimmedString(doc.externalCategoryId)))
      ).filter(Boolean);

      const internalDocs = await db
        .collection<MongoProductCategoryDoc>(PRODUCT_CATEGORY_COLLECTION)
        .find({ _id: { $in: internalCategoryIds } })
        .toArray();
      const internalById = new Map<string, MongoProductCategoryDoc>(
        internalDocs.map((doc) => [doc._id.toString(), doc])
      );

      const externalById = new Map<string, MongoExternalCategoryDoc>();
      if (externalCategoryIds.length > 0) {
        const docsById = await db
          .collection<MongoExternalCategoryDoc>(EXTERNAL_CATEGORY_COLLECTION)
          .find({ _id: { $in: externalCategoryIds } })
          .toArray();
        docsById.forEach((doc) => {
          externalById.set(doc._id.toString(), doc);
        });

        const unresolvedIds = externalCategoryIds.filter((id) => !externalById.has(id));
        if (unresolvedIds.length > 0) {
          const docsByExternalId = await db
            .collection<MongoExternalCategoryDoc>(EXTERNAL_CATEGORY_COLLECTION)
            .find({ externalId: { $in: unresolvedIds } })
            .toArray();
          docsByExternalId.forEach((doc) => {
            externalById.set(doc.externalId, doc);
            externalById.set(doc._id.toString(), doc);
          });
        }
      }

      const candidates: MappingCandidate<string | ObjectId>[] = normalizedMappings.map((doc) => {
        const externalKey = toTrimmedString(doc.externalCategoryId);
        const externalDoc = externalById.get(externalKey) ?? null;
        const internalDoc = internalById.get(doc.internalCategoryId) ?? null;
        return {
          id: doc._id,
          idString: doc._id.toString(),
          connectionId: doc.connectionId,
          catalogId: doc.catalogId,
          internalCategoryId: doc.internalCategoryId,
          internalCategoryName: toTrimmedString(internalDoc?.name) || doc.internalCategoryId,
          externalCategoryId: doc.externalCategoryId,
          externalCategoryName: toTrimmedString(externalDoc?.name),
          externalCategoryPath: toTrimmedString(externalDoc?.path),
          externalCategoryExists: Boolean(externalDoc),
          isActive: Boolean(doc.isActive),
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        } satisfies MappingCandidate<string | ObjectId>;
      });

      const groups = groupByInternalCategoryScope(candidates);
      const idsToActivate: Array<string | ObjectId> = [];
      const idsToDeactivate: Array<string | ObjectId> = [];
      let changedGroups = 0;

      for (const [scopeKey, scopedCandidates] of groups.entries()) {
        const keeper = chooseKeeper(scopedCandidates);
        let groupChanged = false;

        for (const candidate of scopedCandidates) {
          const shouldBeActive = keeper ? candidate.idString === keeper.idString : false;
          if (candidate.isActive && !shouldBeActive) {
            idsToDeactivate.push(candidate.id);
            groupChanged = true;
          }
          if (!candidate.isActive && shouldBeActive) {
            idsToActivate.push(candidate.id);
            groupChanged = true;
          }
        }

        if (groupChanged) {
          changedGroups += 1;
          console.log(
            `${LOG_PREFIX} Mongo ${scopeKey} -> keep=${keeper?.externalCategoryId ?? 'NONE'} keepName=${keeper?.externalCategoryName || 'N/A'} activate=${scopedCandidates.filter((c) => !c.isActive && keeper && c.idString === keeper.idString).length} deactivate=${scopedCandidates.filter((c) => c.isActive && (!keeper || c.idString !== keeper.idString)).length}`
          );
        }
      }

      let activated = idsToActivate.length;
      let deactivated = idsToDeactivate.length;
      if (!dryRun) {
        if (idsToDeactivate.length > 0) {
          const result = await mappingCollection.updateMany(
            {
              _id: { $in: idsToDeactivate },
              isActive: true,
            },
            {
              $set: {
                isActive: false,
                updatedAt: new Date(),
              },
            }
          );
          deactivated = result.modifiedCount ?? 0;
        } else {
          deactivated = 0;
        }

        if (idsToActivate.length > 0) {
          const result = await mappingCollection.updateMany(
            {
              _id: { $in: idsToActivate },
              isActive: false,
            },
            {
              $set: {
                isActive: true,
                updatedAt: new Date(),
              },
            }
          );
          activated = result.modifiedCount ?? 0;
        } else {
          activated = 0;
        }
      }

      console.log(
        `${LOG_PREFIX} Mongo ${dryRun ? 'dry-run' : 'applied'}: scanned=${candidates.length} groups=${groups.size} changedGroups=${changedGroups} ${dryRun ? 'wouldActivate' : 'activated'}=${activated} ${dryRun ? 'wouldDeactivate' : 'deactivated'}=${deactivated}`
      );

      return {
        provider: 'mongodb',
        scanned: candidates.length,
        groups: groups.size,
        changedGroups,
        activated,
        deactivated,
        dryRun,
        skipped: false,
      };
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} Mongo reconciliation failed:`, error);
    return {
      provider: 'mongodb',
      scanned: 0,
      groups: 0,
      changedGroups: 0,
      activated: 0,
      deactivated: 0,
      dryRun,
      skipped: true,
      reason: 'failed',
    };
  }
};

async function main() {
  const dryRun = parseDryRunArg();
  console.log(
    `${LOG_PREFIX} Starting ${dryRun ? 'dry-run' : 'live'} reconciliation for category mappings`
  );

  const prismaSummary = await reconcilePrismaMappings(dryRun);
  const mongoSummary = await reconcileMongoMappings(dryRun);

  const totalActivated = prismaSummary.activated + mongoSummary.activated;
  const totalDeactivated = prismaSummary.deactivated + mongoSummary.deactivated;
  const totalChangedGroups = prismaSummary.changedGroups + mongoSummary.changedGroups;

  console.log(
    `${LOG_PREFIX} Finished: changedGroups=${totalChangedGroups} ${dryRun ? 'wouldActivate' : 'activated'}=${totalActivated} ${dryRun ? 'wouldDeactivate' : 'deactivated'}=${totalDeactivated}`
  );
}

main().catch((error) => {
  console.error(`${LOG_PREFIX} Script failed:`, error);
  process.exit(1);
});
