import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api/parse-json";
import { getProductDataProvider } from "@/lib/services/product-provider";
import { getMongoDb } from "@/lib/db/mongo-client";

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

    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        return NextResponse.json(
          { error: "MongoDB is not configured." },
          { status: 500 }
        );
      }
      const db = await getMongoDb();
      const categories = await db
        .collection("product_categories")
        .find({ catalogId })
        .sort({ name: 1 })
        .toArray();
      const normalized = categories.map((cat) => {
        const { _id, ...rest } = cat as unknown as {
          _id?: { toString?: () => string };
        } & Record<string, unknown>;
        const fallbackId = _id?.toString ? _id.toString() : undefined;
        return {
          ...rest,
          id: (rest as { id?: string }).id ?? fallbackId,
        };
      });
      return NextResponse.json(normalized);
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json([]);
    }

    const categories = await prisma.productCategory.findMany({
      where: { catalogId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(categories);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[product-categories][GET] Failed to fetch categories", {
      errorId,
      error,
    });
    return NextResponse.json([]);
  }
}

/**
 * POST /api/products/categories
 * Creates a new product category.
 */
export async function POST(req: Request) {
  try {
    const provider = await getProductDataProvider();
    const parsed = await parseJsonBody(req, productCategoryCreateSchema, {
      logPrefix: "product-categories:POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const { name, description, color, parentId, catalogId } = parsed.data;

    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        return NextResponse.json(
          { error: "MongoDB is not configured." },
          { status: 500 }
        );
      }
      const db = await getMongoDb();
      const existing = await db.collection("product_categories").findOne({
        name,
        parentId: parentId ?? null,
        catalogId,
      });
      if (existing) {
        return NextResponse.json(
          { error: "A category with this name already exists at this level" },
          { status: 400 }
        );
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

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Product categories require the Postgres product store." },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "A category with this name already exists at this level" },
        { status: 400 }
      );
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
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      console.error("[product-categories][POST] Failed to create category", {
        errorId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 500 }
      );
    }
    console.error("[product-categories][POST] Unknown error", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to create product category", errorId },
      { status: 500 }
    );
  }
}
