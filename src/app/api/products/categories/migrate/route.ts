export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/shared/lib/db/prisma";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { badRequestError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

/**
 * POST /api/products/categories/migrate
 * Copies product categories from Postgres (Prisma) to MongoDB.
 */
async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "products.categories.migrate.POST" });
