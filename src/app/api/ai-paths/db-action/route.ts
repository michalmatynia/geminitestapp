export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId, Sort } from "mongodb";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { parseJsonBody } from "@/features/products/server";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { getAppDbProvider } from "@/shared/lib/db/app-db-provider";
import prisma from "@/shared/lib/db/prisma";
import { badRequestError, internalError } from "@/shared/errors/app-error";
import { enforceAiPathsActionRateLimit, isCollectionAllowed, requireAiPathsAccessOrInternal } from "@/features/ai/ai-paths/server";
import { getUnsupportedProviderActionMessage, resolveDbActionProvider } from "@/features/ai/ai-paths/lib/core/utils/provider-actions";

const actionSchema = z.object({
  provider: z.enum(["auto", "mongodb", "prisma"]).optional(),
  collection: z.string().trim().min(1),
  action: z.enum([
    "insertOne",
    "insertMany",
    "find",
    "findOne",
    "countDocuments",
    "distinct",
    "aggregate",
    "updateOne",
    "updateMany",
    "replaceOne",
    "findOneAndUpdate",
    "deleteOne",
    "deleteMany",
    "findOneAndDelete",
  ]),
  filter: z.record(z.string(), z["unknown"]()).optional(),
  update: z.union([z.record(z.string(), z["unknown"]()), z.array(z.record(z.string(), z["unknown"]()))]).optional(),
  pipeline: z.array(z.record(z.string(), z["unknown"]())).optional(),
  document: z.record(z.string(), z["unknown"]()).optional(),
  documents: z.array(z.record(z.string(), z["unknown"]())).optional(),
  projection: z.record(z.string(), z["unknown"]()).optional(),
  sort: z.record(z.string(), z.union([z.number(), z.literal("asc"), z.literal("desc")])).optional(),
  limit: z.number().int().min(1).max(200).optional(),
  idType: z.enum(["string", "objectId"]).optional(),
  distinctField: z.string().optional(),
  upsert: z.boolean().optional(),
  returnDocument: z.enum(["before", "after"]).optional(),
});

const coerceQuery = (value: unknown): Record<string, unknown> => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return {};
};

const looksLikeObjectId = (value: string): boolean => /^[0-9a-fA-F]{24}$/.test(value);

const normalizeObjectId = (query: Record<string, unknown>, idType?: string): Record<string, unknown> => {
  if (idType !== "objectId") return query;
  const next = { ...query };
  if (typeof next._id === "string" && looksLikeObjectId(next._id)) {
    next._id = new ObjectId(next._id);
  }
  return next;
};

const normalizeUpdateDoc = (update: unknown): Record<string, unknown> | unknown[] | null => {
  if (Array.isArray(update)) return update as unknown[];
  if (update && typeof update === "object") {
    const keys = Object.keys(update as Record<string, unknown>);
    if (keys.some((key: string) => key.startsWith("$"))) {
      return update as Record<string, unknown>;
    }
    return { $set: update } as Record<string, unknown>;
  }
  return null;
};

const PRISMA_COLLECTION_DELEGATES: Record<string, string> = {
  products: "product",
  product_drafts: "productDraft",
  product_categories: "productCategory",
  product_category_assignments: "productCategoryAssignment",
  product_category_assignment: "productCategoryAssignment",
  product_tags: "productTag",
  product_tag_assignments: "productTagAssignment",
  product_tag_assignment: "productTagAssignment",
  catalogs: "catalog",
  image_files: "imageFile",
  product_listings: "productListing",
  product_ai_jobs: "productAiJob",
  product_producer_assignments: "productProducerAssignment",
  product_producer_assignment: "productProducerAssignment",
  integrations: "integration",
  integration_connections: "integrationConnection",
  settings: "setting",
  users: "user",
  user_preferences: "userPreferences",
  languages: "language",
  system_logs: "systemLog",
  notes: "note",
  tags: "tag",
  categories: "category",
  notebooks: "notebook",
  noteFiles: "noteFile",
  note_files: "noteFile",
  themes: "theme",
  chatbot_sessions: "chatbotSession",
  auth_security_attempts: "authSecurityAttempt",
  auth_security_profiles: "authSecurityProfile",
  auth_login_challenges: "authLoginChallenge",
};

const normalizeCollectionKey = (value: string): string => value.trim().toLowerCase();

const toSnakeCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .replace(/__+/g, "_")
    .toLowerCase();

const pluralize = (value: string): string => {
  if (!value) return value;
  if (value.endsWith("s")) return value;
  if (value.endsWith("y") && !/[aeiou]y$/.test(value)) {
    return `${value.slice(0, -1)}ies`;
  }
  if (value.endsWith("x") || value.endsWith("ch") || value.endsWith("sh") || value.endsWith("z")) {
    return `${value}es`;
  }
  return `${value}s`;
};

const singularize = (value: string): string => {
  if (!value) return value;
  if (value.endsWith("ies") && value.length > 3) {
    return `${value.slice(0, -3)}y`;
  }
  if (
    value.endsWith("ses") ||
    value.endsWith("xes") ||
    value.endsWith("ches") ||
    value.endsWith("shes") ||
    value.endsWith("zes")
  ) {
    return value.slice(0, -2);
  }
  if (value.endsWith("s") && value.length > 1) {
    return value.slice(0, -1);
  }
  return value;
};

const buildCollectionCandidates = (collection: string): string[] => {
  const trimmed = collection.trim();
  if (!trimmed) return [];
  const lower = normalizeCollectionKey(trimmed);
  const snake = toSnakeCase(trimmed);
  return Array.from(
    new Set<string>([
      trimmed,
      lower,
      snake,
      pluralize(snake),
      singularize(snake),
      pluralize(lower),
      singularize(lower),
    ])
  );
};

const resolvePrismaCollectionKey = (collection: string): string | null => {
  if (!collection) return null;
  if (PRISMA_COLLECTION_DELEGATES[collection]) return collection;
  const normalized = normalizeCollectionKey(collection);
  if (PRISMA_COLLECTION_DELEGATES[normalized]) return normalized;
  const candidates = buildCollectionCandidates(collection);
  for (const candidate of candidates) {
    if (PRISMA_COLLECTION_DELEGATES[candidate]) return candidate;
  }
  const delegateEntry = Object.entries(PRISMA_COLLECTION_DELEGATES).find(
    ([, delegate]) => delegate.toLowerCase() === normalized
  );
  return delegateEntry ? delegateEntry[0] : null;
};

type PrismaDelegate = {
  findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  findFirst: (args: Record<string, unknown>) => Promise<unknown>;
  count: (args: Record<string, unknown>) => Promise<number>;
  create: (args: Record<string, unknown>) => Promise<unknown>;
  createMany: (args: Record<string, unknown>) => Promise<{ count: number }>;
  update: (args: Record<string, unknown>) => Promise<unknown>;
  updateMany: (args: Record<string, unknown>) => Promise<{ count: number }>;
  delete: (args: Record<string, unknown>) => Promise<unknown>;
  deleteMany: (args: Record<string, unknown>) => Promise<{ count: number }>;
};

const getPrismaDelegate = (collection: string): PrismaDelegate | null => {
  const delegateName = PRISMA_COLLECTION_DELEGATES[collection];
  if (!delegateName) return null;
  const delegate = (prisma as unknown as Record<string, PrismaDelegate>)[delegateName];
  return delegate ?? null;
};

const normalizePrismaSelect = (
  projection?: Record<string, unknown>
): Record<string, unknown> | undefined => {
  if (!projection || typeof projection !== "object" || Array.isArray(projection)) return undefined;
  const hasNested = Object.values(projection).some(
    (value: unknown) => value !== null && typeof value === "object"
  );
  if (hasNested) return projection;
  const select: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(projection)) {
    if (value === 0 || value === false || value === null) continue;
    select[key] = true;
  }
  return Object.keys(select).length > 0 ? select : undefined;
};

const normalizePrismaOrderBy = (
  sort?: Record<string, unknown>
): Record<string, "asc" | "desc"> | undefined => {
  if (!sort || typeof sort !== "object" || Array.isArray(sort)) return undefined;
  const orderBy: Record<string, "asc" | "desc"> = {};
  for (const [key, value] of Object.entries(sort)) {
    if (value === "desc" || value === -1) {
      orderBy[key] = "desc";
    } else if (value === "asc" || value === 1) {
      orderBy[key] = "asc";
    }
  }
  return Object.keys(orderBy).length > 0 ? orderBy : undefined;
};

/** Extract flat key-value updates from a MongoDB-style update doc ({$set: {...}} or plain). */
const extractFlatUpdates = (update: unknown): Record<string, unknown> | null => {
  if (!update || typeof update !== "object" || Array.isArray(update)) return null;
  const doc = update as Record<string, unknown>;
  if (doc.$set && typeof doc.$set === "object" && !Array.isArray(doc.$set)) {
    return doc.$set as Record<string, unknown>;
  }
  const hasOperators = Object.keys(doc).some((key) => key.startsWith("$"));
  if (hasOperators) return null;
  return doc;
};

const normalizeReplaceDoc = (update: unknown): Record<string, unknown> | null => {
  if (update && typeof update === "object" && !Array.isArray(update)) {
    const keys = Object.keys(update as Record<string, unknown>);
    if (keys.some((key: string) => key.startsWith("$"))) {
      return null;
    }
    return update as Record<string, unknown>;
  }
  return null;
};

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { access, isInternal } = await requireAiPathsAccessOrInternal(req);
  if (!isInternal) {
    enforceAiPathsActionRateLimit(access, "db-action");
  }
  const parsed = await parseJsonBody(req, actionSchema, {
    logPrefix: "ai-paths.db-action",
  });
  if (!parsed.ok) return parsed.response;

  const data = parsed.data as z.infer<typeof actionSchema>;
  const {
    provider: requestedProvider,
    collection,
    action,
    filter,
    update,
    pipeline,
    document,
    documents,
    projection,
    sort,
    limit = 20,
    idType,
    distinctField,
    upsert,
    returnDocument = "after",
  } = data;

  if (!isCollectionAllowed(collection)) {
    throw internalError("Collection not allowlisted");
  }

  const provider = resolveDbActionProvider(requestedProvider, await getAppDbProvider());
  const providerActionError = getUnsupportedProviderActionMessage(provider, action);
  if (providerActionError) {
    throw badRequestError(providerActionError);
  }
  if (provider === "prisma") {
    if (!process.env.DATABASE_URL) {
      throw internalError("Prisma is not configured");
    }
    const resolvedCollection = resolvePrismaCollectionKey(collection);
    const delegate = resolvedCollection ? getPrismaDelegate(resolvedCollection) : null;
    if (!delegate) {
      throw badRequestError(`Collection "${collection}" is not available for Prisma.`);
    }
    const where = coerceQuery(filter);
    const select = normalizePrismaSelect(projection);
    const orderBy = normalizePrismaOrderBy(sort);

    if (action === "find") {
      const [items, count] = await Promise.all([
        delegate.findMany({
          where,
          ...(select ? { select } : {}),
          ...(orderBy ? { orderBy } : {}),
          take: limit,
        }),
        delegate.count({ where }),
      ]);
      return NextResponse.json({ items, count });
    }

    if (action === "findOne") {
      const item = await delegate.findFirst({
        where,
        ...(select ? { select } : {}),
        ...(orderBy ? { orderBy } : {}),
      });
      return NextResponse.json({ item, count: item ? 1 : 0 });
    }

    if (action === "countDocuments") {
      const count = await delegate.count({ where });
      return NextResponse.json({ count });
    }

    if (action === "distinct") {
      const field = distinctField?.trim();
      if (!field) {
        throw badRequestError("distinctField is required");
      }
      const rows = await delegate.findMany({
        where,
        distinct: [field],
        select: { [field]: true },
      });
      const values = rows
        .map((row: unknown) =>
          row && typeof row === "object" ? (row as Record<string, unknown>)[field] : undefined
        )
        .filter((value: unknown) => value !== undefined);
      return NextResponse.json({ values, count: values.length });
    }

    if (action === "aggregate") {
      throw badRequestError("Action \"aggregate\" is not supported for Prisma in DB Action.");
    }

    if (action === "updateOne") {
      const flatUpdates = extractFlatUpdates(update);
      if (!flatUpdates || Object.keys(flatUpdates).length === 0) {
        throw badRequestError("Update data is required (plain object or $set)");
      }
      if (!where || Object.keys(where).length === 0) {
        throw badRequestError("Filter is required for updateOne");
      }
      const result = await delegate.update({ where, data: flatUpdates });
      return NextResponse.json({ matchedCount: 1, modifiedCount: 1, value: result });
    }

    if (action === "updateMany") {
      const flatUpdates = extractFlatUpdates(update);
      if (!flatUpdates || Object.keys(flatUpdates).length === 0) {
        throw badRequestError("Update data is required (plain object or $set)");
      }
      const result = await delegate.updateMany({ where, data: flatUpdates });
      return NextResponse.json({
        matchedCount: result.count,
        modifiedCount: result.count,
      });
    }

    if (action === "findOneAndUpdate") {
      const flatUpdates = extractFlatUpdates(update);
      if (!flatUpdates || Object.keys(flatUpdates).length === 0) {
        throw badRequestError("Update data is required (plain object or $set)");
      }
      if (!where || Object.keys(where).length === 0) {
        throw badRequestError("Filter is required for findOneAndUpdate");
      }
      const result = await delegate.update({ where, data: flatUpdates });
      return NextResponse.json({ value: result, ok: 1 });
    }

    if (action === "replaceOne") {
      const replacement = normalizeReplaceDoc(update);
      if (!replacement) {
        throw badRequestError("Replacement document is required");
      }
      if (!where || Object.keys(where).length === 0) {
        throw badRequestError("Filter is required for replaceOne");
      }
      const result = await delegate.update({ where, data: replacement });
      return NextResponse.json({ matchedCount: 1, modifiedCount: 1, value: result });
    }

    if (action === "insertOne") {
      const doc =
        document && typeof document === "object" && !Array.isArray(document)
          ? (document as Record<string, unknown>)
          : null;
      if (!doc) {
        throw badRequestError("Document is required");
      }
      const result = await delegate.create({ data: doc });
      const insertedId = (result as Record<string, unknown>)?.id ?? null;
      return NextResponse.json({ insertedId, insertedCount: 1 });
    }

    if (action === "insertMany") {
      const docs =
        documents && Array.isArray(documents)
          ? documents
          : Array.isArray(document)
            ? (document as unknown[])
            : null;
      if (!docs || docs.length === 0) {
        throw badRequestError("Documents array is required");
      }
      const result = await delegate.createMany({
        data: docs as Record<string, unknown>[],
      });
      return NextResponse.json({ insertedCount: result.count });
    }

    if (action === "deleteOne") {
      if (!where || Object.keys(where).length === 0) {
        throw badRequestError("Filter is required for deleteOne");
      }
      await delegate.delete({ where });
      return NextResponse.json({ deletedCount: 1 });
    }

    if (action === "deleteMany") {
      const result = await delegate.deleteMany({ where });
      return NextResponse.json({ deletedCount: result.count });
    }

    if (action === "findOneAndDelete") {
      if (!where || Object.keys(where).length === 0) {
        throw badRequestError("Filter is required for findOneAndDelete");
      }
      const result = await delegate.delete({ where });
      return NextResponse.json({ value: result, ok: 1 });
    }

    throw badRequestError(`Action "${action}" is not supported for Prisma.`);
  }

  if (!process.env.MONGODB_URI) {
    throw internalError("MongoDB is not configured");
  }

  const mongo = await getMongoDb();
  const collectionRef = mongo.collection(collection);
  const normalizedFilter = normalizeObjectId(coerceQuery(filter), idType);
  const hasFilter = Object.keys(normalizedFilter).length > 0;

  const requireFilter = [
    "updateOne",
    "updateMany",
    "replaceOne",
    "findOneAndUpdate",
    "deleteOne",
    "deleteMany",
    "findOneAndDelete",
  ].includes(action);

  if (requireFilter && !hasFilter) {
    throw badRequestError("Filter is required for this action");
  }

  if (action === "find") {
    const cursor = collectionRef.find(
      normalizedFilter,
      projection ? { projection } : undefined
    );
    if (sort) {
      cursor.sort(sort as Sort);
    }
    const items = await cursor.limit(limit).toArray();
    return NextResponse.json({ items, count: items.length });
  }

  if (action === "findOne") {
    const item = await collectionRef.findOne(
      normalizedFilter,
      projection ? { projection } : undefined
    );
    return NextResponse.json({ item, count: item ? 1 : 0 });
  }

  if (action === "countDocuments") {
    const count = await collectionRef.countDocuments(normalizedFilter);
    return NextResponse.json({ count });
  }

  if (action === "distinct") {
    const field = distinctField?.trim();
    if (!field) {
      throw badRequestError("distinctField is required");
    }
    const values = await collectionRef.distinct(field, normalizedFilter);
    return NextResponse.json({ values, count: values.length });
  }

  if (action === "aggregate") {
    if (!pipeline || pipeline.length === 0) {
      throw badRequestError("Aggregation pipeline is required");
    }
    const items = await collectionRef.aggregate(pipeline).toArray();
    return NextResponse.json({ items, count: items.length });
  }

  if (action === "insertOne") {
    const doc =
      document && typeof document === "object" && !Array.isArray(document)
        ? (document as Record<string, unknown>)
        : null;
    if (!doc) {
      throw badRequestError("Document is required");
    }
    const result = await collectionRef.insertOne(doc);
    return NextResponse.json({ insertedId: result.insertedId, insertedCount: 1 });
  }

  if (action === "insertMany") {
    const docs =
      documents && Array.isArray(documents)
        ? documents
        : Array.isArray(document)
          ? (document as unknown[])
          : null;
    if (!docs || docs.length === 0) {
      throw badRequestError("Documents array is required");
    }
    const result = await collectionRef.insertMany(docs as Record<string, unknown>[]);
    return NextResponse.json({
      insertedIds: result.insertedIds,
      insertedCount: result.insertedCount,
    });
  }

  if (action === "replaceOne") {
    const replacement = normalizeReplaceDoc(update);
    if (!replacement) {
      throw badRequestError("Replacement document is required");
    }
    const result = await collectionRef.replaceOne(normalizedFilter, replacement, { upsert: !!upsert });
    return NextResponse.json({
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedId: result.upsertedId ?? null,
    });
  }

  if (action === "findOneAndUpdate") {
    const updateDoc = normalizeUpdateDoc(update);
    if (!updateDoc) {
      throw badRequestError("Update document is required");
    }
    const result = await collectionRef.findOneAndUpdate(
      normalizedFilter,
      updateDoc,
      { returnDocument, upsert: !!upsert, includeResultMetadata: true }
    );
    return NextResponse.json({
      value: result.value ?? null,
      ok: result.ok ?? 1,
    });
  }

  if (action === "updateOne" || action === "updateMany") {
    const updateDoc = normalizeUpdateDoc(update);
    if (!updateDoc) {
      throw badRequestError("Update document is required");
    }
    const result =
      action === "updateOne"
        ? await collectionRef.updateOne(normalizedFilter, updateDoc, {
            upsert: !!upsert,
          })
        : await collectionRef.updateMany(normalizedFilter, updateDoc, {
            upsert: !!upsert,
          });
    return NextResponse.json({
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedId: result.upsertedId ?? null,
    });
  }

  if (action === "deleteOne" || action === "deleteMany") {
    const result =
      action === "deleteOne"
        ? await collectionRef.deleteOne(normalizedFilter)
        : await collectionRef.deleteMany(normalizedFilter);
    return NextResponse.json({ deletedCount: result.deletedCount ?? 0 });
  }

  if (action === "findOneAndDelete") {
    const result = await collectionRef.findOneAndDelete(normalizedFilter, { includeResultMetadata: true });
    return NextResponse.json({
      value: result.value ?? null,
      ok: result.ok ?? 1,
    });
  }

  throw badRequestError("Unsupported action");
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "ai-paths.db-action" });
