import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/shared/lib/db/prisma";
import { parseJsonBody } from "@/features/products/server";
import { getProductDataProvider } from "@/features/products/server";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError, conflictError, internalError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import type { ProductCategory } from "@/features/products/types";

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
  try {
    const { searchParams } = new URL(req.url);
    const catalogId = searchParams.get("catalogId");

    if (!catalogId) {
      throw badRequestError("catalogId query parameter is required");
    }

    const provider = await getProductDataProvider();

    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        throw internalError("MongoDB is not configured.");
      }
      const db = await getMongoDb();
      const categories = await db
        .collection("product_categories")
        .find({ catalogId })
        .sort({ name: 1 })
        .toArray();
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
      return NextResponse.json(normalized as ProductCategory[]);
    }

    if (!process.env.DATABASE_URL) {
      throw badRequestError("Product categories require the Postgres product store.");
    }

    const categories = await prisma.productCategory.findMany({
      where: { catalogId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(categories as ProductCategory[]);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.categories.GET",
      fallbackMessage: "Failed to fetch categories",
    });
  }
}

/**
 * POST /api/products/categories
 * Creates a new product category.
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const provider = await getProductDataProvider();
    const parsed = await parseJsonBody(req, productCategoryCreateSchema, {
      logPrefix: "product-categories.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const { name, description, color, parentId, catalogId } = parsed.data;

    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
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
      return NextResponse.json(category as ProductCategory, { status: 201 });
    }

    if (!process.env.DATABASE_URL) {
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

    return NextResponse.json(category as ProductCategory, { status: 201 });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "products.categories.POST",
      fallbackMessage: "Failed to create product category",
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "products.categories.GET" });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "products.categories.POST" });
