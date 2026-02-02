import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId } from "mongodb";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { badRequestError, internalError } from "@/shared/errors/app-error";
import { enforceAiPathsActionRateLimit, requireAiPathsAccess } from "@/features/ai/ai-paths/server";

const updateSchema = z.object({
  provider: z.enum(["auto", "mongodb"]).optional(),
  collection: z.string().trim().min(1),
  query: z.record(z.string(), z["unknown"]()).optional(),
  updates: z.record(z.string(), z["unknown"]()).optional(),
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
    enforceAiPathsActionRateLimit(access, "db-update");
    const parsed = await parseJsonBody(req, updateSchema, {
      logPrefix: "ai-paths.db-update",
    });
    if (!parsed.ok) return parsed.response;
    if (!process.env.MONGODB_URI) {
      return createErrorResponse(internalError("MongoDB is not configured"), {
        request: req,
        source: "ai-paths.db-update",
      });
    }

    const data = parsed.data;
    const { collection, query, updates, single = true, idType } = data;

    if (!ALLOWED_COLLECTIONS.has(collection)) {
      return createErrorResponse(internalError("Collection not allowlisted"), {
        request: req,
        source: "ai-paths.db-update",
      });
    }

    const normalizedUpdates =
      updates && typeof updates === "object" ? updates : {};
    if (Object.keys(normalizedUpdates).length === 0) {
      throw badRequestError("No updates provided");
    }

    const filter = normalizeObjectId(coerceQuery(query), idType);
    if (!filter || Object.keys(filter).length === 0) {
      throw badRequestError("Update requires a query filter");
    }

    const mongo = await getMongoDb();
    const collectionRef = mongo.collection(collection);
    const result = single
      ? await collectionRef.updateOne(filter, { $set: normalizedUpdates })
      : await collectionRef.updateMany(filter, { $set: normalizedUpdates });

    return NextResponse.json({
      ok: true,
      collection,
      single,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "ai-paths.db-update",
      fallbackMessage: "Failed to update documents",
    });
  }
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "ai-paths.db-update" });
