export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId } from "mongodb";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import prisma from "@/shared/lib/db/prisma";
import { badRequestError, internalError } from "@/shared/errors/app-error";
import { enforceAiPathsActionRateLimit, isCollectionAllowed, requireAiPathsAccessOrInternal } from "@/features/ai/ai-paths/server";

const updateSchema = z.object({
  provider: z.enum(["auto", "mongodb", "prisma"]).optional(),
  collection: z.string().trim().min(1),
  query: z.record(z.string(), z["unknown"]()).optional(),
  updates: z.record(z.string(), z["unknown"]()).optional(),
  single: z.boolean().optional(),
  idType: z.enum(["string", "objectId"]).optional(),
});

const PRISMA_COLLECTION_DELEGATES: Record<string, string> = {
  products: "product",
  product_drafts: "productDraft",
  product_categories: "productCategory",
  product_tags: "productTag",
  catalogs: "catalog",
  image_files: "imageFile",
  product_listings: "productListing",
  product_ai_jobs: "productAiJob",
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

type PrismaDelegate = {
  updateMany: (args: Record<string, unknown>) => Promise<{ count: number }>;
};

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

const getPrismaDelegate = (collection: string): PrismaDelegate | null => {
  const delegateName = PRISMA_COLLECTION_DELEGATES[collection];
  if (!delegateName) return null;
  const delegate = (prisma as unknown as Record<string, PrismaDelegate>)[delegateName];
  return delegate ?? null;
};

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const { access, isInternal } = await requireAiPathsAccessOrInternal(req);
    if (!isInternal) {
      enforceAiPathsActionRateLimit(access, "db-update");
    }
    const parsed = await parseJsonBody(req, updateSchema, {
      logPrefix: "ai-paths.db-update",
    });
    if (!parsed.ok) return parsed.response;
    const data = parsed.data;
    const { provider: requestedProvider, collection, query, updates, single = true, idType } = data;

    if (!isCollectionAllowed(collection)) {
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
    const provider = requestedProvider === "prisma" ? "prisma" : "mongodb";

    if (provider === "prisma") {
      if (!process.env.DATABASE_URL) {
        return createErrorResponse(internalError("Prisma is not configured"), {
          request: req,
          source: "ai-paths.db-update",
        });
      }
      const delegate = getPrismaDelegate(collection);
      if (!delegate) {
        return createErrorResponse(badRequestError("Collection not available for Prisma"), {
          request: req,
          source: "ai-paths.db-update",
        });
      }
      const where = coerceQuery(query);
      if (!where || Object.keys(where).length === 0) {
        throw badRequestError("Update requires a query filter");
      }
      const result = await delegate.updateMany({
        where,
        data: normalizedUpdates,
      });
      return NextResponse.json({
        ok: true,
        collection,
        single,
        matchedCount: result.count,
        modifiedCount: result.count,
      });
    }

    if (!process.env.MONGODB_URI) {
      return createErrorResponse(internalError("MongoDB is not configured"), {
        request: req,
        source: "ai-paths.db-update",
      });
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
