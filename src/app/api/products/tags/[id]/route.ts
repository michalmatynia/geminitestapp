export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/shared/lib/db/prisma";
import { parseJsonBody } from "@/features/products/server";
import { getProductDataProvider } from "@/features/products/server";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError, conflictError, internalError, notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext, DeleteResponse } from "@/shared/types/api";
import type { ProductTag } from "@/features/products/types";

const productTagUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().nullable().optional(),
  catalogId: z.string().min(1).optional(),
});

interface MongoTag {
  id: string;
  name: string;
  color?: string | null;
  catalogId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * PUT /api/products/tags/[id]
 * Updates a product tag.
 */
async function PUT_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  if (!params.id) {
    throw badRequestError("Tag id is required");
  }
  const provider = await getProductDataProvider();
  const parsed = await parseJsonBody(req, productTagUpdateSchema, {
    logPrefix: "product-tags.PUT",
    allowEmpty: true,
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
    const current = await db.collection("product_tags").findOne({ id: params.id });
    if (!current) {
      throw notFoundError("Tag not found", { tagId: params.id });
    }
    const nextCatalogId =
      catalogId ?? (current as { catalogId?: string }).catalogId;
    if (!nextCatalogId) {
      throw badRequestError("Catalog ID is required.");
    }
    if (name !== undefined) {
      const existing = await db.collection("product_tags").findOne({
        name,
        catalogId: nextCatalogId,
        id: { $ne: params.id },
      });
      if (existing) {
        throw conflictError(
          "A tag with this name already exists in this catalog",
          { name, catalogId: nextCatalogId }
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
      .findOne({ id: params.id }) as unknown as MongoTag | null;
    
    if (!updated) {
      throw notFoundError("Tag not found", { tagId: params.id });
    }

    const dto: ProductTag = {
      id: String(updated.id),
      name: String(updated.name),
      color: updated.color ?? null,
      catalogId: String(updated.catalogId),
      createdAt:
        updated.createdAt instanceof Date
          ? updated.createdAt.toISOString()
          : String(updated.createdAt),
      updatedAt:
        updated.updatedAt instanceof Date
          ? updated.updatedAt.toISOString()
          : String(updated.updatedAt),
    };

    return NextResponse.json(dto);
  }

  if (!process.env.DATABASE_URL) {
    throw badRequestError("Product tags require the Postgres product store.");
  }

  const current = await prisma.productTag.findUnique({
    where: { id: params.id },
    select: { catalogId: true },
  });
  if (!current) {
    throw notFoundError("Tag not found", { tagId: params.id });
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
      throw conflictError(
        "A tag with this name already exists in this catalog",
        { name, catalogId: nextCatalogId }
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

  const dto: ProductTag = {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    catalogId: tag.catalogId,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
  };

  return NextResponse.json(dto);
}

/**
 * DELETE /api/products/tags/[id]
 * Deletes a product tag.
 */
async function DELETE_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  if (!params.id) {
    throw badRequestError("Tag id is required");
  }
  const provider = await getProductDataProvider();
  if (provider === "mongodb") {
    if (!process.env.MONGODB_URI) {
      throw internalError("MongoDB is not configured.");
    }
    const db = await getMongoDb();
    await db.collection("product_tags").deleteOne({ id: params.id });
    return NextResponse.json({ success: true } as DeleteResponse);
  }

  if (!process.env.DATABASE_URL) {
    throw badRequestError("Product tags require the Postgres product store.");
  }

  await prisma.productTag.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, { source: "products.tags.[id].PUT" });
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, { source: "products.tags.[id].DELETE" });
