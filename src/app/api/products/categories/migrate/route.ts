import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError } from "@/lib/errors/app-error";
import { apiHandler } from "@/lib/api/api-handler";

/**
 * POST /api/products/categories/migrate
 * Copies product categories from Postgres (Prisma) to MongoDB.
 */
async function POST_handler(req: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      throw badRequestError("Postgres is not configured.");
    }
    if (!process.env.MONGODB_URI) {
      throw badRequestError("MongoDB is not configured.");
    }

    const categories = await prisma.productCategory.findMany({
      orderBy: { name: "asc" },
    });

    const db = await getMongoDb();
    const collection = db.collection("product_categories");

    if (categories.length === 0) {
      return NextResponse.json({ migrated: 0 });
    }

    const ops = categories.map((category) => ({
      updateOne: {
        filter: { id: category.id },
        update: {
          $set: {
            id: category.id,
            name: category.name,
            description: category.description ?? null,
            color: category.color ?? null,
            parentId: category.parentId ?? null,
            catalogId: category.catalogId,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
          },
        },
        upsert: true,
      },
    }));

    await collection.bulkWrite(ops);

    return NextResponse.json({ migrated: categories.length });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.categories.migrate.POST",
      fallbackMessage: "Failed to migrate product categories",
    });
  }
}

export const POST = apiHandler(POST_handler, { source: "products.categories.migrate.POST" });
