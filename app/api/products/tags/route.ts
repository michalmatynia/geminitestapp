import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api/parse-json";
import { getProductDataProvider } from "@/lib/services/product-provider";
import { getMongoDb } from "@/lib/db/mongo-client";

const productTagCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().nullable().optional(),
  catalogId: z.string().min(1, "Catalog ID is required"),
});

/**
 * GET /api/products/tags
 * Fetches all product tags (flat list).
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
      const tags = await db
        .collection("product_tags")
        .find({ catalogId })
        .sort({ name: 1 })
        .toArray();
      const normalized = tags.map((tag) => {
        const { _id, ...rest } = tag as unknown as {
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

    const tags = await prisma.productTag.findMany({
      where: { catalogId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(tags);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[product-tags][GET] Failed to fetch tags", {
      errorId,
      error,
    });
    return NextResponse.json([]);
  }
}

/**
 * POST /api/products/tags
 * Creates a new product tag.
 */
export async function POST(req: Request) {
  try {
    const provider = await getProductDataProvider();
    const parsed = await parseJsonBody(req, productTagCreateSchema, {
      logPrefix: "product-tags:POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const { name, color, catalogId } = parsed.data;

    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        return NextResponse.json(
          { error: "MongoDB is not configured." },
          { status: 500 }
        );
      }
      const db = await getMongoDb();
      const existing = await db.collection("product_tags").findOne({
        name,
        catalogId,
      });
      if (existing) {
        return NextResponse.json(
          { error: "A tag with this name already exists in this catalog" },
          { status: 400 }
        );
      }
      const now = new Date();
      const tag = {
        id: randomUUID(),
        name,
        color: color ?? "#38bdf8",
        catalogId,
        createdAt: now,
        updatedAt: now,
      };
      await db.collection("product_tags").insertOne(tag);
      return NextResponse.json(tag, { status: 201 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Product tags require the Postgres product store." },
        { status: 400 }
      );
    }

    const existing = await prisma.productTag.findFirst({
      where: { name, catalogId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A tag with this name already exists in this catalog" },
        { status: 400 }
      );
    }

    const tag = await prisma.productTag.create({
      data: {
        name,
        color: color ?? "#38bdf8",
        catalogId,
      },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      console.error("[product-tags][POST] Failed to create tag", {
        errorId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 500 }
      );
    }
    console.error("[product-tags][POST] Unknown error", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to create product tag", errorId },
      { status: 500 }
    );
  }
}
