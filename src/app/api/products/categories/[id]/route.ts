export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/shared/lib/db/prisma";
import { parseJsonBody } from "@/features/products/server";
import { getProductDataProvider } from "@/features/products/server";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import {
  badRequestError,
  conflictError,
  internalError,
  notFoundError,
} from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import type { ProductCategoryDto } from "@/features/products/types";

interface MongoCategory {
  id: string;
  _id?: unknown;
  parentId?: string | null;
  catalogId?: string;
  name?: string;
  [key: string]: unknown;
}

const productCategoryUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  catalogId: z.string().min(1).optional(),
});

/**
 * GET /api/products/categories/[id]
 * Fetches a single product category by ID.
 */
async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  if (!params.id) {
    throw badRequestError("Category id is required");
  }
  const provider = await getProductDataProvider();
  if (provider === "mongodb") {
    if (!process.env.MONGODB_URI) {
      throw internalError("MongoDB is not configured.");
    }
    const db = await getMongoDb();
    const category = await db
      .collection<MongoCategory>("product_categories")
      .findOne({ id: params.id });
    if (!category) {
      throw notFoundError("Category not found", { categoryId: params.id });
    }
    const children = await db
      .collection<MongoCategory>("product_categories")
      .find({ parentId: params.id })
      .toArray();
    const parent = category.parentId
      ? await db
          .collection<MongoCategory>("product_categories")
          .findOne({ id: category.parentId })
      : null;
    return NextResponse.json({
      ...category,
      id: category.id ?? String(category._id),
      children: children.map((child) => {
        const { _id, ...rest } = child;
        const fallbackId = _id ? String(_id) : undefined;
        return {
          ...rest,
          id: (rest as { id?: string }).id ?? fallbackId,
        };
      }),
      parent: parent
        ? (() => {
            const { _id, ...rest } = parent;
            const fallbackId = _id ? String(_id) : undefined;
            return {
              ...rest,
              id: (rest as { id?: string }).id ?? fallbackId,
            };
          })()
        : null,
    });
  }

  if (!process.env.DATABASE_URL) {
    throw badRequestError("Product categories require the Postgres product store.");
  }

  const category = await prisma.productCategory.findUnique({
    where: { id: params.id },
    include: {
      children: true,
      parent: true,
    },
  });

  if (!category) {
    throw notFoundError("Category not found", { categoryId: params.id });
  }

  return NextResponse.json(category);
}

/**
 * PUT /api/products/categories/[id]
 * Updates a product category.
 */
async function PUT_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  if (!params.id) {
    throw badRequestError("Category id is required");
  }
  const provider = await getProductDataProvider();
  const parsed = await parseJsonBody(req, productCategoryUpdateSchema, {
    logPrefix: "product-categories.PUT",
    allowEmpty: true,
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const { name, description, color, parentId, catalogId } = parsed.data;

  if (provider === "mongodb") {
    if (!process.env.MONGODB_URI) {
      throw internalError("MongoDB is not configured.");
    }
    const db = await getMongoDb();
    const current = await db
      .collection<MongoCategory>("product_categories")
      .findOne({ id: params.id });
    if (!current) {
      throw notFoundError("Category not found", { categoryId: params.id });
    }

    const nextCatalogId =
      catalogId ?? current.catalogId;
    const nextParentId =
      parentId !== undefined
        ? parentId
        : catalogId && catalogId !== current.catalogId
          ? null
          : current.parentId ?? null;

    if (!nextCatalogId) {
      throw badRequestError("Catalog ID is required.");
    }

    if (nextParentId) {
      const parent = await db
        .collection<MongoCategory>("product_categories")
        .findOne({ id: nextParentId });
      if (!parent || parent.catalogId !== nextCatalogId) {
        throw badRequestError("Parent category must be in the same catalog.", {
          parentId: nextParentId,
          catalogId: nextCatalogId,
        });
      }
    }

    // Prevent moving category to itself or its descendants
    if (
      nextParentId !== null &&
      (catalogId === undefined ||
        catalogId === current.catalogId)
    ) {
      const isDescendant = await checkIsDescendantMongo(
        db,
        params.id,
        nextParentId
      );
      if (isDescendant) {
        throw badRequestError("Cannot move category into itself or its descendants");
      }
    }

    if (name !== undefined) {
      const existing = await db.collection<MongoCategory>("product_categories").findOne({
        name,
        parentId: nextParentId,
        catalogId: nextCatalogId,
        id: { $ne: params.id },
      });

      if (existing) {
        throw conflictError("A category with this name already exists at this level", {
          name,
          parentId: nextParentId,
          catalogId: nextCatalogId,
        });
      }
    }

    const updateDoc = {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(color !== undefined ? { color } : {}),
      ...(catalogId !== undefined ? { catalogId } : {}),
      ...(parentId !== undefined || catalogId ? { parentId: nextParentId } : {}),
      updatedAt: new Date(),
    };

    await db
      .collection<MongoCategory>("product_categories")
      .updateOne({ id: params.id }, { $set: updateDoc });
    const updated = await db
      .collection<MongoCategory>("product_categories")
      .findOne({ id: params.id });
    return NextResponse.json(updated as unknown as ProductCategoryDto);
  }

  if (!process.env.DATABASE_URL) {
    throw badRequestError("Product categories require the Postgres product store.");
  }

  const current = await prisma.productCategory.findUnique({
    where: { id: params.id },
    select: { catalogId: true, parentId: true },
  });

  if (!current) {
    throw notFoundError("Category not found", { categoryId: params.id });
  }

  const nextCatalogId = catalogId ?? current.catalogId;
  const nextParentId =
    parentId !== undefined
      ? parentId
      : catalogId && catalogId !== current.catalogId
        ? null
        : current.parentId ?? null;

  if (nextParentId) {
    const parent = await prisma.productCategory.findUnique({
      where: { id: nextParentId },
      select: { catalogId: true },
    });
    if (!parent || parent.catalogId !== nextCatalogId) {
      throw badRequestError("Parent category must be in the same catalog.", {
        parentId: nextParentId,
        catalogId: nextCatalogId,
      });
    }
  }

  // Prevent moving category to itself or its descendants
  if (
    nextParentId !== null &&
    (catalogId === undefined ||
      catalogId === current.catalogId)
  ) {
    const isDescendant = await checkIsDescendant(params.id, nextParentId);
    if (isDescendant) {
      throw badRequestError("Cannot move category into itself or its descendants");
    }
  }

  // Check for duplicate name under the new parent
  if (name !== undefined) {
    const existing = await prisma.productCategory.findFirst({
      where: {
        name,
        parentId: nextParentId,
        catalogId: nextCatalogId,
        NOT: { id: params.id },
      },
    });

    if (existing) {
      throw conflictError("A category with this name already exists at this level", {
        name,
        parentId: nextParentId,
        catalogId: nextCatalogId,
      });
    }
  }

  const category = await prisma.productCategory.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(color !== undefined && { color }),
      ...(catalogId !== undefined && { catalogId }),
      ...(parentId !== undefined || catalogId ? { parentId: nextParentId } : {}),
    },
  });

  return NextResponse.json(category as unknown as ProductCategoryDto);
}

/**
 * DELETE /api/products/categories/[id]
 * Deletes a product category and all its children (cascade).
 */
async function DELETE_handler(
  _request: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  if (!params.id) {
    throw badRequestError("Category id is required");
  }
  const provider = await getProductDataProvider();
  if (provider === "mongodb") {
    if (!process.env.MONGODB_URI) {
      throw internalError("MongoDB is not configured.");
    }
    const db = await getMongoDb();
    const idsToDelete = await collectCategoryIds(db, params.id);
    await db
      .collection("product_categories")
      .deleteMany({ id: { $in: idsToDelete } });
    return NextResponse.json({ success: true });
  }

  if (!process.env.DATABASE_URL) {
    throw badRequestError("Product categories require the Postgres product store.");
  }

  // The schema has onDelete: Cascade, so children will be deleted automatically
  await prisma.productCategory.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}

/**
 * Helper: Check if targetId is the same as or a descendant of categoryId
 */
async function checkIsDescendant(categoryId: string, targetId: string): Promise<boolean> {
  if (categoryId === targetId) return true;

  const children = (await prisma.productCategory.findMany({
    where: { parentId: categoryId },
    select: { id: true },
  })) as Array<{ id: string }>;

  for (const child of children) {
    if (await checkIsDescendant(child.id, targetId)) {
      return true;
    }
  }

  return false;
}

async function checkIsDescendantMongo(
  db: Awaited<ReturnType<typeof getMongoDb>>,
  categoryId: string,
  targetId: string
): Promise<boolean> {
  if (categoryId === targetId) return true;
  const children = (await db
    .collection<MongoCategory>("product_categories")
    .find({ parentId: categoryId })
    .project({ id: 1 })
    .toArray()) as unknown as Array<{ id: string }>;
  for (const child of children) {
    if (await checkIsDescendantMongo(db, child.id, targetId)) {
      return true;
    }
  }
  return false;
}

async function collectCategoryIds(
  db: Awaited<ReturnType<typeof getMongoDb>>,
  rootId: string
): Promise<string[]> {
  const ids: string[] = [rootId];
  const queue: string[] = [rootId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const children = (await db
      .collection<MongoCategory>("product_categories")
      .find({ parentId: current })
      .project({ id: 1 })
      .toArray()) as unknown as Array<{ id: string }>;
    for (const child of children) {
      if (!ids.includes(child.id)) {
        ids.push(child.id);
        queue.push(child.id);
      }
    }
  }
  return ids;
}

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: "products.categories.[id].GET",
});
export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: "products.categories.[id].PUT",
});
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: "products.categories.[id].DELETE",
});
