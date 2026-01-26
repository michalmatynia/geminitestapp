import { NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId } from "mongodb";

import { apiHandler } from "@/lib/api/api-handler";
import { parseJsonBody } from "@/features/products/api/parse-json";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { getMongoDb } from "@/lib/db/mongo-client";
import { internalError } from "@/lib/errors/app-error";

const querySchema = z.object({
  provider: z.enum(["auto", "mongodb"]).optional(),
  collection: z.string().trim().min(1),
  query: z.unknown().optional(),
  projection: z.record(z.string(), z.any()).optional(),
  sort: z.record(z.string(), z.any()).optional(),
  limit: z.number().int().min(1).max(200).optional(),
  single: z.boolean().optional(),
  idType: z.enum(["string", "objectId"]).optional(),
});

const ALLOWED_COLLECTIONS = new Set([
  "products",
  "product_drafts",
  "product_categories",
  "product_tags",
  "catalogs",
  "image_files",
  "product_listings",
  "product_ai_jobs",
  "integrations",
  "integration_connections",
  "settings",
  "users",
  "user_preferences",
  "languages",
  "system_logs",
  "notes",
  "tags",
  "categories",
  "notebooks",
  "noteFiles",
  "themes",
  "chatbot_sessions",
  "auth_security_attempts",
  "auth_security_profiles",
  "auth_login_challenges",
]);

const coerceQuery = (value: unknown) => {
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

const looksLikeObjectId = (value: string) => /^[0-9a-fA-F]{24}$/.test(value);

const normalizeObjectId = (query: Record<string, unknown>, idType?: string) => {
  if (idType !== "objectId") return query;
  const next = { ...query };
  if (typeof next._id === "string" && looksLikeObjectId(next._id)) {
    next._id = new ObjectId(next._id);
  }
  return next;
};

async function POST_handler(req: Request) {
  try {
    const parsed = await parseJsonBody(req, querySchema, {
      logPrefix: "ai-paths.db-query",
    });
    if (!parsed.ok) return parsed.response;
    if (!process.env.MONGODB_URI) {
      return createErrorResponse(internalError("MongoDB is not configured"), {
        request: req,
        source: "ai-paths.db-query",
      });
    }
    const {
      collection,
      query,
      projection,
      sort,
      limit = 20,
      single = false,
      idType,
    } = parsed.data;

    if (!ALLOWED_COLLECTIONS.has(collection)) {
      return createErrorResponse(internalError("Collection not allowlisted"), {
        request: req,
        source: "ai-paths.db-query",
      });
    }

    const mongo = await getMongoDb();
    const filter = normalizeObjectId(coerceQuery(query), idType);

    if (single) {
      const item = await mongo
        .collection(collection)
        .findOne(filter, projection ? { projection } : undefined);
      return NextResponse.json({ item, count: item ? 1 : 0 });
    }

    const cursor = mongo.collection(collection).find(filter, projection ? { projection } : undefined);
    if (sort) {
      cursor.sort(sort as any);
    }
    const items = await cursor.limit(limit).toArray();
    return NextResponse.json({ items, count: items.length });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "ai-paths.db-query",
      fallbackMessage: "Failed to execute database query",
    });
  }
}

export const POST = apiHandler(POST_handler, { source: "ai-paths.db-query" });
