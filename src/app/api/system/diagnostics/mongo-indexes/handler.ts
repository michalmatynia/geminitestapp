import { NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { assertSettingsManageAccess } from '@/shared/lib/auth/settings-manage-access';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { buildObservabilityExpectedByCollection } from '@/shared/lib/observability/observability-index-manifest';

import type { IndexSpecification } from 'mongodb';

type IndexInfo = {
  name?: string;
  key: IndexSpecification;
};

type CollectionIndexStatus = {
  name: string;
  expected: IndexInfo[];
  existing: IndexInfo[];
  missing: IndexInfo[];
  extra: IndexInfo[];
  error?: string;
};

const serializeKey = (key: IndexSpecification) => JSON.stringify(key);

const buildExpectedByCollection = (): Record<string, IndexInfo[]> =>
  buildObservabilityExpectedByCollection();

const buildDiagnostics = async (db: Awaited<ReturnType<typeof getMongoDb>>) => {
  const expectedByCollection = buildExpectedByCollection();
  const collections: CollectionIndexStatus[] = [];

  for (const [collectionName, expected] of Object.entries(expectedByCollection)) {
    let existing: IndexInfo[] = [];
    let errorMessage: string | undefined;
    try {
      const existingIndexes = await db.collection(collectionName).listIndexes().toArray();
      existing = existingIndexes.map((index) => {
        const doc = index as { name: string; key: IndexSpecification };
        return {
          name: doc.name,
          key: doc.key,
        };
      });
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Failed to load indexes';
    }
    const expectedSet = new Set(expected.map((item) => serializeKey(item.key)));
    const existingSet = new Set(existing.map((item) => serializeKey(item.key)));

    const missing = expected.filter((item) => !existingSet.has(serializeKey(item.key)));
    const extra = existing.filter(
      (item) => item.name !== '_id_' && !expectedSet.has(serializeKey(item.key))
    );

    collections.push({
      name: collectionName,
      expected,
      existing,
      missing,
      extra,
      ...(errorMessage ? { error: errorMessage } : {}),
    });
  }

  return collections;
};

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();
  const db = await getMongoDb();
  const collections = await buildDiagnostics(db);
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    collections,
  });
}

export async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();
  const db = await getMongoDb();
  const expectedByCollection = buildExpectedByCollection();
  const created: Array<{ collection: string; key: IndexSpecification }> = [];

  for (const [collectionName, expected] of Object.entries(expectedByCollection)) {
    for (const index of expected) {
      try {
        await db.collection(collectionName).createIndex(index.key);
        created.push({ collection: collectionName, key: index.key });
      } catch (error) {
        logSystemEvent({
          source: 'system.diagnostics.mongo-indexes',
          message: 'Failed to create database index during diagnostic run',
          level: 'warn',
          error,
          context: { collectionName, indexKey: index.key },
        });
      }    }
  }

  const collections = await buildDiagnostics(db);
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    created,
    collections,
  });
}
