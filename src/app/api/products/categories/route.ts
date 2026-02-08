export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/shared/lib/db/prisma";
import { parseJsonBody } from "@/features/products/server";
import { getProductDataProvider } from "@/features/products/server";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { badRequestError, conflictError, internalError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const shouldLogTiming = () => process.env["DEBUG_API_TIMING"] === "true";

const buildServerTiming = (entries: Record<string, number | null | undefined>): string => {
  const parts = Object.entries(entries)
    .filter(([, value]) => typeof value === "number" && Number.isFinite(value) && value >= 0)
    .map(([name, value]) => `${name};dur=${Math.round(value as number)}`);
  return parts.join(", ");
};

const attachTimingHeaders = (response: Response, entries: Record<string, number | null | undefined>): void => {
  const value = buildServerTiming(entries);
  if (value) {
    response.headers.set("Server-Timing", value);
  }
};

const productCategoryCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  catalogId: z.string().min(1, "Catalog ID is required"),
});

/**
 * GET /api/products/categories
 * Fetches all product categories (flat list).
 * Query params:
 * - catalogId: Filter by catalog (required)
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const timings: Record<string, number | null | undefined> = {};
  const requestStart = performance.now();
  const { searchParams } = new URL(req.url);
  const catalogId = searchParams.get("catalogId");

  if (!catalogId) {
    throw badRequestError("catalogId query parameter is required");
  }

  const providerStart = performance.now();
  const provider = await getProductDataProvider();
  timings.provider = performance.now() - providerStart;

  if (provider === "mongodb") {
    if (!process.env["MONGODB_URI"]) {
      throw internalError("MongoDB is not configured.");
    }
    const mongoStart = performance.now();
    const db = await getMongoDb();
    const categories = await db
      .collection("product_categories")
      .find({ catalogId })
      .sort({ name: 1 })
      .toArray();
    timings.mongo = performance.now() - mongoStart;
    const normalized = categories.map((cat: Record<string, unknown>) => {
      const { _id, ...rest } = cat as unknown as {
        _id?: { toString?: () => string };
      } & Record<string, unknown>;
      const fallbackId = _id?.toString ? _id.toString() : undefined;
      return {
        ...rest,
        id: (rest as { id?: string }).id ?? fallbackId,
      };
    });
    timings.total = performance.now() - requestStart;
    if (shouldLogTiming()) {
      console.log("[timing] products.categories.GET", timings);
    }
    const response = NextResponse.json(normalized);
    attachTimingHeaders(response, timings);
    return response;
  }

  if (!process.env["DATABASE_URL"]) {
    throw badRequestError("Product categories require the Postgres product store.");
  }

  const prismaStart = performance.now();
  const categories = await prisma.productCategory.findMany({
    where: { catalogId },
    orderBy: { name: "asc" },
  });
  timings.prisma = performance.now() - prismaStart;
  timings.total = performance.now() - requestStart;
  if (shouldLogTiming()) {
    console.log("[timing] products.categories.GET", timings);
  }
  const response = NextResponse.json(categories);
  attachTimingHeaders(response, timings);
  return response;
}

/**
 * POST /api/products/categories
 * Creates a new product category.
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const provider = await getProductDataProvider();
  const parsed = await parseJsonBody(req, productCategoryCreateSchema, {
    logPrefix: "product-categories.POST",
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const { name, description, color, parentId, catalogId } = parsed.data;

  if (provider === "mongodb") {
    if (!process.env["MONGODB_URI"]) {
      throw internalError("MongoDB is not configured.");
    }
    const db = await getMongoDb();
    const existing = await db.collection("product_categories").findOne({
      name,
      parentId: parentId ?? null,
      catalogId,
    });
    if (existing) {
      throw conflictError("A category with this name already exists at this level", {
        name,
        parentId: parentId ?? null,
        catalogId,
      });
    }
    const now = new Date();
    const category = {
      id: randomUUID(),
      name,
      description: description ?? null,
      color: color ?? "#10b981",
      parentId: parentId ?? null,
      catalogId,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection("product_categories").insertOne(category);
    return NextResponse.json(category, { status: 201 });
  }

  if (!process.env["DATABASE_URL"]) {
    throw badRequestError("Product categories require the Postgres product store.");
  }

  // Check for duplicate name under the same parent within the same catalog
  const existing = await prisma.productCategory.findFirst({
    where: {
      name,
      parentId: parentId ?? null,
      catalogId,
    },
  });

  if (existing) {
    throw conflictError("A category with this name already exists at this level", {
      name,
      parentId: parentId ?? null,
      catalogId,
    });
  }

  const category = await prisma.productCategory.create({
    data: {
      name,
      description: description ?? null,
      color: color ?? "#10b981",
      parentId: parentId ?? null,
      catalogId,
    },
  });

  return NextResponse.json(category, { status: 201 });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "products.categories.GET" });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "products.categories.POST" });
