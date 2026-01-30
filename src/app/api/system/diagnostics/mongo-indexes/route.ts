import { NextRequest, NextResponse } from "next/server";
import type { IndexSpecification } from "mongodb";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { AI_PATHS_MONGO_INDEXES } from "@/features/ai-paths/services/path-run-repository/mongo-path-run-repository";

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

const buildExpectedByCollection = () =>
  AI_PATHS_MONGO_INDEXES.reduce<Record<string, IndexInfo[]>>((acc, index) => {
    if (!index.collection) return acc;
    const collection = index.collection;
    const existing = acc[collection] ?? [];
    existing.push({ key: index.key });
    acc[collection] = existing;
    return acc;
  }, {});

const buildDiagnostics = async (db: Awaited<ReturnType<typeof getMongoDb>>) => {
  const expectedByCollection = buildExpectedByCollection();
  const collections: CollectionIndexStatus[] = [];

  for (const [collectionName, expected] of Object.entries(expectedByCollection)) {
    let existing: IndexInfo[] = [];
    let errorMessage: string | undefined;
    try {
      const existingIndexes = await db
        .collection(collectionName)
        .listIndexes()
        .toArray();
      existing = existingIndexes.map((index) => ({
        name: index.name,
        key: index.key as IndexSpecification,
      }));
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Failed to load indexes";
    }
    const expectedSet = new Set(expected.map((item) => serializeKey(item.key)));
    const existingSet = new Set(existing.map((item) => serializeKey(item.key)));

    const missing = expected.filter((item) => !existingSet.has(serializeKey(item.key)));
    const extra = existing.filter(
      (item) =>
        item.name !== "_id_" && !expectedSet.has(serializeKey(item.key))
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

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const db = await getMongoDb();
  const collections = await buildDiagnostics(db);
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    collections,
  });
}

async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const db = await getMongoDb();
  const expectedByCollection = buildExpectedByCollection();
  const created: Array<{ collection: string; key: IndexSpecification }> = [];

  for (const [collectionName, expected] of Object.entries(expectedByCollection)) {
    for (const index of expected) {
      try {
        await db.collection(collectionName).createIndex(index.key);
        created.push({ collection: collectionName, key: index.key });
      } catch (_error) {
        // Ignore errors to allow remaining indexes to be created.
      }
    }
  }

  const collections = await buildDiagnostics(db);
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    created,
    collections,
  });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  {
    source: "system.diagnostics.mongo-indexes",
    logSuccess: false,
  }
);

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  {
    source: "system.diagnostics.mongo-indexes.rebuild",
    logSuccess: true,
  }
);
