export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/shared/lib/db/prisma";

import { getProductDataProvider } from "@/features/products/server";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { badRequestError, internalError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import type { ProductCategoryWithChildren } from "@/shared/types/domain/products";

type CategoryFromDb = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  parentId: string | null;
  catalogId: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * GET /api/products/categories/tree
 * Fetches product categories as a hierarchical tree structure.
 * Query params:
 * - catalogId: Filter by catalog (required)
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const catalogId = searchParams.get("catalogId");

  if (!catalogId) {
    throw badRequestError("catalogId query parameter is required");
  }

  const provider = await getProductDataProvider();
  let categories: CategoryFromDb[] = [];

  if (provider === "mongodb") {
    if (!process.env.MONGODB_URI) {
      throw internalError("MongoDB is not configured.");
    }
    const db = await getMongoDb();
    const docs = await db
      .collection<CategoryFromDb>("product_categories")
      .find({ catalogId })
      .sort({ name: 1 })
      .toArray();
    categories = docs.map((doc: CategoryFromDb) => {
      const { _id, ...rest } = doc as unknown as {
        _id?: { toString?: () => string };
      } & CategoryFromDb;
      const fallbackId = _id?.toString ? _id.toString() : "";
      return {
        ...rest,
        id: rest.id ?? fallbackId,
      };
    });
  } else {
    if (!process.env.DATABASE_URL) {
      throw badRequestError("Product categories require the Postgres product store.");
    }
    categories = await prisma.productCategory.findMany({
      where: { catalogId },
      orderBy: { name: "asc" },
    });
  }

  // Build tree recursively
  const buildTree = (parentId: string | null): ProductCategoryWithChildren[] => {
    return categories
      .filter((cat: CategoryFromDb) => cat.parentId === parentId)
      .map((cat: CategoryFromDb) => ({
        ...cat,
        createdAt: cat.createdAt?.toISOString() ?? new Date().toISOString(),
        updatedAt: cat.updatedAt?.toISOString() ?? new Date().toISOString(),
        children: buildTree(cat.id),
      }));
  };

  const tree = buildTree(null);
  return NextResponse.json(tree);
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "products.categories.tree.GET" });
