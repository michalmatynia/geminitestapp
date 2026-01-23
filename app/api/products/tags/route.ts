import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api/parse-json";
import { getProductDataProvider } from "@/lib/services/product-provider";
import { getMongoDb } from "@/lib/db/mongo-client";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError, conflictError, internalError } from "@/lib/errors/app-error";

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
      throw badRequestError("catalogId query parameter is required");
    }

    const provider = await getProductDataProvider();

    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        throw internalError("MongoDB is not configured.");
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
      throw badRequestError("Product tags require the Postgres product store.");
    }

    const tags = await prisma.productTag.findMany({
      where: { catalogId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(tags);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "product-tags.GET",
      fallbackMessage: "Failed to fetch tags",
    });
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
      logPrefix: "product-tags.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const { name, color, catalogId } = parsed.data;

    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        throw internalError("MongoDB is not configured.");
      }
      const db = await getMongoDb();
      const existing = await db.collection("product_tags").findOne({
        name,
        catalogId,
      });
      if (existing) {
        throw conflictError(
          "A tag with this name already exists in this catalog",
          { name, catalogId }
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
      throw badRequestError("Product tags require the Postgres product store.");
    }

    const existing = await prisma.productTag.findFirst({
      where: { name, catalogId },
    });
    if (existing) {
      throw conflictError(
        "A tag with this name already exists in this catalog",
        { name, catalogId }
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
    return createErrorResponse(error, {
      request: req,
      source: "product-tags.POST",
      fallbackMessage: "Failed to create product tag",
    });
  }
}
