export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId, Sort } from "mongodb";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import prisma from "@/shared/lib/db/prisma";
import { badRequestError, internalError } from "@/shared/errors/app-error";
import { enforceAiPathsActionRateLimit, requireAiPathsAccessOrInternal } from "@/features/ai/ai-paths/server";

const querySchema = z.object({
  provider: z.enum(["auto", "mongodb", "prisma"]).optional(),
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
  findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  findFirst?: (args: Record<string, unknown>) => Promise<unknown | null>;
  count: (args: Record<string, unknown>) => Promise<number>;
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

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const { access, isInternal } = await requireAiPathsAccessOrInternal(req);
    if (!isInternal) {
      enforceAiPathsActionRateLimit(access, "db-query");
    }
    const parsed = await parseJsonBody(req, querySchema, {
      logPrefix: "ai-paths.db-query",
    });
    if (!parsed.ok) return parsed.response;
    const data = parsed.data;
    const {
      provider: requestedProvider,
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

    const provider = requestedProvider === "prisma" ? "prisma" : "mongodb";

    if (provider === "prisma") {
      if (!process.env.DATABASE_URL) {
        return createErrorResponse(internalError("Prisma is not configured"), {
          request: req,
          source: "ai-paths.db-query",
        });
      }
      const delegate = getPrismaDelegate(collection);
      if (!delegate) {
        return createErrorResponse(badRequestError("Collection not available for Prisma"), {
          request: req,
          source: "ai-paths.db-query",
        });
      }
      const where = coerceQuery(query);
      const select = normalizePrismaSelect(projection);
      const orderBy = normalizePrismaOrderBy(sort);
      if (single) {
        const item = delegate.findFirst
          ? await delegate.findFirst({
              where,
              ...(select ? { select } : {}),
              ...(orderBy ? { orderBy } : {}),
            })
          : (await delegate.findMany({
              where,
              ...(select ? { select } : {}),
              ...(orderBy ? { orderBy } : {}),
              take: 1,
            }))[0] ?? null;
        return NextResponse.json({ item, count: item ? 1 : 0 });
      }
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

    if (!process.env.MONGODB_URI) {
      return createErrorResponse(internalError("MongoDB is not configured"), {
        request: req,
        source: "ai-paths.db-query",
      });
    }

    const mongo = await getMongoDb();
    const filter = normalizeObjectId(coerceQuery(query), idType);

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
