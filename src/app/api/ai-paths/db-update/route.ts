export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId } from "mongodb";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { parseJsonBody } from "@/features/products/server";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { getAppDbProvider } from "@/shared/lib/db/app-db-provider";
import prisma from "@/shared/lib/db/prisma";
import { badRequestError, internalError } from "@/shared/errors/app-error";
import { enforceAiPathsActionRateLimit, isCollectionAllowed, requireAiPathsAccessOrInternal } from "@/features/ai/ai-paths/server";
import { resolveDbActionProvider } from "@/features/ai/ai-paths/lib/core/utils/provider-actions";

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

const looksLikeObjectId = (value: string): boolean => /^[0-9a-fA-F]{24}$/.test(value);

const normalizeObjectId = (query: Record<string, unknown>, idType?: string): Record<string, unknown> => {
  if (idType !== "objectId") return query;
  const next = { ...query };
  if (typeof next['_id'] === "string" && looksLikeObjectId(next['_id'] as string)) {
    next['_id'] = new ObjectId(next['_id'] as string);
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
    throw internalError("Collection not allowlisted");
  }

  const normalizedUpdates =
    updates && typeof updates === "object" ? updates : {};
  if (Object.keys(normalizedUpdates).length === 0) {
    throw badRequestError("No updates provided");
  }
  const provider = resolveDbActionProvider(requestedProvider, await getAppDbProvider());

  if (provider === "prisma") {
    if (!process.env['DATABASE_URL']) {
      throw internalError("Prisma is not configured");
    }
    const resolvedCollection = resolvePrismaCollectionKey(collection);
    const delegate = resolvedCollection ? getPrismaDelegate(resolvedCollection) : null;
    if (!delegate) {
      throw badRequestError("Collection not available for Prisma");
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

  if (!process.env['MONGODB_URI']) {
    throw internalError("MongoDB is not configured");
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
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "ai-paths.db-update" });
