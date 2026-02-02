import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId, Sort } from "mongodb";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { internalError } from "@/shared/errors/app-error";
import { enforceAiPathsActionRateLimit, requireAiPathsAccess } from "@/features/ai/ai-paths/server";

const querySchema = z.object({
  provider: z.enum(["auto", "mongodb"]).optional(),
  collection: z.string().trim().min(1),
  query: z.record(z.string(), z["unknown"]()).optional(),
  projection: z.record(z.string(), z["unknown"]()).optional(),
  sort: z.record(z.string(), z.union([z.number(), z.literal("asc"), z.literal("desc")])).optional(),
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

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const access = await requireAiPathsAccess();
    enforceAiPathsActionRateLimit(access, "db-query");
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
    const data = parsed.data;
    const {
      collection,
      query,
      projection,
      sort,
      limit = 20,
      single = false,
      idType,
    } = data;

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
      cursor.sort(sort as Sort);
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

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "ai-paths.db-query" });
