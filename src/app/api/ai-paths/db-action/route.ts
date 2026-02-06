export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId, Sort } from "mongodb";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { badRequestError, internalError } from "@/shared/errors/app-error";
import { enforceAiPathsActionRateLimit, isCollectionAllowed, requireAiPathsAccessOrInternal } from "@/features/ai/ai-paths/server";

const actionSchema = z.object({
  provider: z.enum(["auto", "mongodb"]).optional(),
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
  try {
    const { access, isInternal } = await requireAiPathsAccessOrInternal(req);
    if (!isInternal) {
      enforceAiPathsActionRateLimit(access, "db-action");
    }
    const parsed = await parseJsonBody(req, actionSchema, {
      logPrefix: "ai-paths.db-action",
    });
    if (!parsed.ok) return parsed.response;
    if (!process.env.MONGODB_URI) {
      return createErrorResponse(internalError("MongoDB is not configured"), {
        request: req,
        source: "ai-paths.db-action",
      });
    }

    const data = parsed.data as z.infer<typeof actionSchema>;
    const {
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
      return createErrorResponse(internalError("Collection not allowlisted"), {
        request: req,
        source: "ai-paths.db-action",
      });
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
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "ai-paths.db-action",
      fallbackMessage: "Failed to execute database action",
    });
  }
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "ai-paths.db-action" });
