import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api/parse-json";
import { getProductDataProvider } from "@/lib/services/product-provider";
import { getMongoDb } from "@/lib/db/mongo-client";

const productTagUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().nullable().optional(),
  catalogId: z.string().min(1).optional(),
});

/**
 * PUT /api/products/tags/[id]
 * Updates a product tag.
 */
export async function PUT(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const provider = await getProductDataProvider();
    const parsed = await parseJsonBody(req, productTagUpdateSchema, {
      logPrefix: "product-tags:PUT",
      allowEmpty: true,
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
      const current = await db.collection("product_tags").findOne({ id: params.id });
      if (!current) {
        return NextResponse.json({ error: "Tag not found" }, { status: 404 });
      }
      const nextCatalogId =
        catalogId ?? (current as { catalogId?: string }).catalogId;
      if (!nextCatalogId) {
        return NextResponse.json(
          { error: "Catalog ID is required." },
          { status: 400 }
        );
      }
      if (name !== undefined) {
        const existing = await db.collection("product_tags").findOne({
          name,
          catalogId: nextCatalogId,
          id: { $ne: params.id },
        });
        if (existing) {
          return NextResponse.json(
            { error: "A tag with this name already exists in this catalog" },
            { status: 400 }
          );
        }
      }

      const updateDoc = {
        ...(name !== undefined ? { name } : {}),
        ...(color !== undefined ? { color } : {}),
        ...(catalogId !== undefined ? { catalogId: nextCatalogId } : {}),
        updatedAt: new Date(),
      };

      await db
        .collection("product_tags")
        .updateOne({ id: params.id }, { $set: updateDoc });
      const updated = await db
        .collection("product_tags")
        .findOne({ id: params.id });
      return NextResponse.json(updated);
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Product tags require the Postgres product store." },
        { status: 400 }
      );
    }

    const current = await prisma.productTag.findUnique({
      where: { id: params.id },
      select: { catalogId: true },
    });
    if (!current) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }
    const nextCatalogId = catalogId ?? current.catalogId;

    if (name !== undefined) {
      const existing = await prisma.productTag.findFirst({
        where: {
          name,
          catalogId: nextCatalogId,
          NOT: { id: params.id },
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: "A tag with this name already exists in this catalog" },
          { status: 400 }
        );
      }
    }

    const tag = await prisma.productTag.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
        ...(catalogId !== undefined && { catalogId: nextCatalogId }),
      },
    });

    return NextResponse.json(tag);
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      console.error("[product-tags][PUT] Failed to update tag", {
        errorId,
        tagId: params.id,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 500 }
      );
    }
    console.error("[product-tags][PUT] Unknown error", {
      errorId,
      tagId: params.id,
      error,
    });
    return NextResponse.json(
      { error: "Failed to update product tag", errorId },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/tags/[id]
 * Deletes a product tag.
 */
export async function DELETE(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const provider = await getProductDataProvider();
    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        return NextResponse.json(
          { error: "MongoDB is not configured." },
          { status: 500 }
        );
      }
      const db = await getMongoDb();
      await db.collection("product_tags").deleteOne({ id: params.id });
      return NextResponse.json({ success: true });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Product tags require the Postgres product store." },
        { status: 400 }
      );
    }

    await prisma.productTag.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[product-tags][DELETE] Failed to delete tag", {
      errorId,
      tagId: params.id,
      error,
    });
    return NextResponse.json(
      { error: "Failed to delete product tag", errorId },
      { status: 500 }
    );
  }
}
