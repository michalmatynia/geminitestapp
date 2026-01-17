import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import type { ProductCategoryWithChildren } from "@/types/products";
import { getProductDataProvider } from "@/lib/services/product-provider";
import { getMongoDb } from "@/lib/db/mongo-client";

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
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const catalogId = searchParams.get("catalogId");

    if (!catalogId) {
      return NextResponse.json(
        { error: "catalogId query parameter is required" },
        { status: 400 }
      );
    }

    const provider = await getProductDataProvider();
    let categories: CategoryFromDb[] = [];

    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        return NextResponse.json(
          { error: "MongoDB is not configured." },
          { status: 500 }
        );
      }
      const db = await getMongoDb();
      const docs = await db
        .collection<CategoryFromDb>("product_categories")
        .find({ catalogId })
        .sort({ name: 1 })
        .toArray();
      categories = docs.map((doc) => {
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
        return NextResponse.json([]);
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
          children: buildTree(cat.id),
        }));
    };

    const tree = buildTree(null);
    return NextResponse.json(tree);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[product-categories][tree][GET] Failed to fetch category tree", {
      errorId,
      error,
    });
    return NextResponse.json([]);
  }
}
