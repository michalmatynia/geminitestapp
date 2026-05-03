import { type NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { assertSettingsManageAccess } from '@/features/auth/server';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { buildObservabilityExpectedByCollection } from '@/shared/lib/observability/observability-index-manifest';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

import type { IndexSpecification } from 'mongodb';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


type ComparableIndexOptions = {
  expireAfterSeconds?: number;
  name?: string;
};

type IndexInfo = {
  name?: string;
  key: IndexSpecification;
  options?: ComparableIndexOptions;
};

type CollectionIndexStatus = {
  name: string;
  expected: IndexInfo[];
  existing: IndexInfo[];
  missing: IndexInfo[];
  extra: IndexInfo[];
  error?: string;
};

const normalizeIndexOptions = (
  input: Partial<Record<'expireAfterSeconds' | 'name', unknown>> | undefined
): ComparableIndexOptions | undefined => {
  if (!input) return undefined;
  const options: ComparableIndexOptions = {};
  if (typeof input['expireAfterSeconds'] === 'number' && Number.isFinite(input['expireAfterSeconds'])) {
    options.expireAfterSeconds = input['expireAfterSeconds'];
  }
  if (typeof input['name'] === 'string' && input['name'].trim().length > 0) {
    options.name = input['name'];
  }
  return Object.keys(options).length > 0 ? options : undefined;
};

const serializeIndexInfo = (index: IndexInfo): string =>
  JSON.stringify({
    key: index.key,
    expireAfterSeconds: index.options?.expireAfterSeconds ?? null,
  });

const buildExpectedByCollection = (): Record<string, IndexInfo[]> =>
  buildObservabilityExpectedByCollection();

const toExistingIndexInfo = (index: { name: string; key: IndexSpecification; expireAfterSeconds?: unknown }): IndexInfo => {
  const options = normalizeIndexOptions({
    expireAfterSeconds: index.expireAfterSeconds,
    name: index.name,
  });

  return {
    name: index.name,
    key: index.key,
    ...(options !== undefined ? { options } : {}),
  };
};

const loadExistingIndexes = async (
  db: Awaited<ReturnType<typeof getMongoDb>>,
  collectionName: string
): Promise<{ existing: IndexInfo[]; errorMessage?: string }> => {
  try {
    const existingIndexes = await db.collection(collectionName).listIndexes().toArray();
    return {
      existing: existingIndexes.map((index) =>
        toExistingIndexInfo(index as { name: string; key: IndexSpecification; expireAfterSeconds?: unknown })
      ),
    };
  } catch (error) {
    await ErrorSystem.captureException(error);
    return {
      existing: [],
      errorMessage: error instanceof Error ? error.message : 'Failed to load indexes',
    };
  }
};

const buildDiagnostics = async (
  db: Awaited<ReturnType<typeof getMongoDb>>
): Promise<CollectionIndexStatus[]> => {
  const expectedByCollection = buildExpectedByCollection();
  return await Promise.all(
    Object.entries(expectedByCollection).map(
      async ([collectionName, expected]): Promise<CollectionIndexStatus> => {
        const { existing, errorMessage } = await loadExistingIndexes(db, collectionName);
        const expectedSet = new Set(expected.map((item) => serializeIndexInfo(item)));
        const existingSet = new Set(existing.map((item) => serializeIndexInfo(item)));

        const missing = expected.filter((item) => !existingSet.has(serializeIndexInfo(item)));
        const extra = existing.filter(
          (item) => item.name !== '_id_' && !expectedSet.has(serializeIndexInfo(item))
        );

        return {
          name: collectionName,
          expected,
          existing,
          missing,
          extra,
          ...(errorMessage !== undefined ? { error: errorMessage } : {}),
        };
      }
    )
  );
};

 
export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();
  const db = await getMongoDb();
  const collections = await buildDiagnostics(db);
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    collections,
  });
}

 
export async function postHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();
  const db = await getMongoDb();
  const expectedByCollection = buildExpectedByCollection();
  const created = (
    await Promise.all(
      Object.entries(expectedByCollection).map(async ([collectionName, expected]) =>
        await Promise.all(
          expected.map(async (index): Promise<{ collection: string; key: IndexSpecification } | null> => {
            try {
              await db.collection(collectionName).createIndex(index.key, index.options);
              return { collection: collectionName, key: index.key };
            } catch (error) {
              await ErrorSystem.captureException(error);
              await logSystemEvent({
                source: 'system.diagnostics.mongo-indexes',
                message: 'Failed to create database index during diagnostic run',
                level: 'warn',
                error,
                context: { collectionName, indexKey: index.key },
              });
              return null;
            }
          })
        )
      )
    )
  )
    .flat()
    .filter(
      (entry): entry is { collection: string; key: IndexSpecification } => entry !== null
    );

  const collections = await buildDiagnostics(db);
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    created,
    collections,
  });
}
