import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";

/**
 * POST /api/products/categories/migrate
 * Copies product categories from Postgres (Prisma) to MongoDB.
 */
export async function POST() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Postgres is not configured." },
        { status: 400 }
      );
    }
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: "MongoDB is not configured." },
        { status: 400 }
      );
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
    const errorId = randomUUID();
    console.error("[product-categories][MIGRATE] Failed", { errorId, error });
    return NextResponse.json(
      { error: "Failed to migrate product categories", errorId },
      { status: 500 }
    );
  }
}
