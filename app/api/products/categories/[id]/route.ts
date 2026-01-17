import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api/parse-json";
import { getProductDataProvider } from "@/lib/services/product-provider";
import { getMongoDb } from "@/lib/db/mongo-client";

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
export async function GET(
  req: Request,
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
      const category = await db
        .collection("product_categories")
        .findOne({ id: params.id });
      if (!category) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 }
        );
      }
      const children = await db
        .collection("product_categories")
        .find({ parentId: params.id })
        .toArray();
      const parent = category.parentId
        ? await db
            .collection("product_categories")
            .findOne({ id: category.parentId })
        : null;
      return NextResponse.json({
        ...category,
        id: category.id ?? category._id,
        children: children.map((child) => {
          const { _id, ...rest } = child as unknown as {
            _id?: { toString?: () => string };
          } & Record<string, unknown>;
          const fallbackId = _id?.toString ? _id.toString() : undefined;
          return {
            ...rest,
            id: (rest as { id?: string }).id ?? fallbackId,
          };
        }),
        parent: parent
          ? (() => {
              const { _id, ...rest } = parent as unknown as {
                _id?: { toString?: () => string };
              } & Record<string, unknown>;
              const fallbackId = _id?.toString ? _id.toString() : undefined;
              return {
                ...rest,
                id: (rest as { id?: string }).id ?? fallbackId,
              };
            })()
          : null,
      });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Product categories require the Postgres product store." },
        { status: 400 }
      );
    }

    const category = await prisma.productCategory.findUnique({
      where: { id: params.id },
      include: {
        children: true,
        parent: true,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[product-categories][GET] Failed to fetch category", {
      errorId,
      categoryId: params.id,
      error,
    });
    return NextResponse.json(
      { error: "Failed to fetch category", errorId },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/products/categories/[id]
 * Updates a product category.
 */
export async function PUT(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const provider = await getProductDataProvider();
    const parsed = await parseJsonBody(req, productCategoryUpdateSchema, {
      logPrefix: "product-categories:PUT",
      allowEmpty: true,
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
      const current = await db
        .collection("product_categories")
        .findOne({ id: params.id });
      if (!current) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 }
        );
      }

      const nextCatalogId =
        catalogId ?? (current as { catalogId?: string }).catalogId;
      const nextParentId =
        parentId !== undefined
          ? parentId
          : catalogId && catalogId !== (current as { catalogId?: string }).catalogId
            ? null
            : (current as { parentId?: string | null }).parentId ?? null;

      if (!nextCatalogId) {
        return NextResponse.json(
          { error: "Catalog ID is required." },
          { status: 400 }
        );
      }

      if (nextParentId) {
        const parent = await db
          .collection("product_categories")
          .findOne({ id: nextParentId });
        if (!parent || parent.catalogId !== nextCatalogId) {
          return NextResponse.json(
            { error: "Parent category must be in the same catalog." },
            { status: 400 }
          );
        }
      }

      // Prevent moving category to itself or its descendants
      if (
        nextParentId !== null &&
        (catalogId === undefined ||
          catalogId === (current as { catalogId?: string }).catalogId)
      ) {
        const isDescendant = await checkIsDescendantMongo(
          db,
          params.id,
          nextParentId
        );
        if (isDescendant) {
          return NextResponse.json(
            { error: "Cannot move category into itself or its descendants" },
            { status: 400 }
          );
        }
      }

      if (name !== undefined) {
        const existing = await db.collection("product_categories").findOne({
          name,
          parentId: nextParentId,
          catalogId: nextCatalogId,
          id: { $ne: params.id },
        });

        if (existing) {
          return NextResponse.json(
            { error: "A category with this name already exists at this level" },
            { status: 400 }
          );
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
        .collection("product_categories")
        .updateOne({ id: params.id }, { $set: updateDoc });
      const updated = await db
        .collection("product_categories")
        .findOne({ id: params.id });
      return NextResponse.json(updated);
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Product categories require the Postgres product store." },
        { status: 400 }
      );
    }

    const current = await prisma.productCategory.findUnique({
      where: { id: params.id },
      select: { catalogId: true, parentId: true },
    });

    if (!current) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
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
        return NextResponse.json(
          { error: "Parent category must be in the same catalog." },
          { status: 400 }
        );
      }
    }

    // Prevent moving category to itself or its descendants
    if (
      nextParentId !== null &&
      (catalogId === undefined || catalogId === current.catalogId)
    ) {
      const isDescendant = await checkIsDescendant(params.id, nextParentId);
      if (isDescendant) {
        return NextResponse.json(
          { error: "Cannot move category into itself or its descendants" },
          { status: 400 }
        );
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
        return NextResponse.json(
          { error: "A category with this name already exists at this level" },
          { status: 400 }
        );
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

    return NextResponse.json(category);
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      console.error("[product-categories][PUT] Failed to update category", {
        errorId,
        categoryId: params.id,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 500 }
      );
    }
    console.error("[product-categories][PUT] Unknown error", {
      errorId,
      categoryId: params.id,
      error,
    });
    return NextResponse.json(
      { error: "Failed to update category", errorId },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/categories/[id]
 * Deletes a product category and all its children (cascade).
 */
export async function DELETE(
  req: Request,
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
      const idsToDelete = await collectCategoryIds(db, params.id);
      await db
        .collection("product_categories")
        .deleteMany({ id: { $in: idsToDelete } });
      return NextResponse.json({ success: true });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Product categories require the Postgres product store." },
        { status: 400 }
      );
    }

    // The schema has onDelete: Cascade, so children will be deleted automatically
    await prisma.productCategory.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[product-categories][DELETE] Failed to delete category", {
      errorId,
      categoryId: params.id,
      error,
    });
    return NextResponse.json(
      { error: "Failed to delete category", errorId },
      { status: 500 }
    );
  }
}

/**
 * Helper: Check if targetId is the same as or a descendant of categoryId
 */
async function checkIsDescendant(categoryId: string, targetId: string): Promise<boolean> {
  if (categoryId === targetId) return true;

  const children = await prisma.productCategory.findMany({
    where: { parentId: categoryId },
    select: { id: true },
  });

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
  const children = await db
    .collection<{ id: string }>("product_categories")
    .find({ parentId: categoryId })
    .project({ id: 1 })
    .toArray();
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
    const children = await db
      .collection<{ id: string }>("product_categories")
      .find({ parentId: current })
      .project({ id: 1 })
      .toArray();
    for (const child of children) {
      if (!ids.includes(child.id)) {
        ids.push(child.id);
        queue.push(child.id);
      }
    }
  }
  return ids;
}
