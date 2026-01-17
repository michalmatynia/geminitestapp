import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api/parse-json";
import { getProductDataProvider } from "@/lib/services/product-provider";

const productCategoryUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
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
    if (!process.env.DATABASE_URL || provider !== "prisma") {
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
    if (!process.env.DATABASE_URL || provider !== "prisma") {
      return NextResponse.json(
        { error: "Product categories require the Postgres product store." },
        { status: 400 }
      );
    }

    const parsed = await parseJsonBody(req, productCategoryUpdateSchema, {
      logPrefix: "product-categories:PUT",
      allowEmpty: true,
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const { name, description, color, parentId } = parsed.data;

    // Prevent moving category to itself or its descendants
    if (parentId !== undefined && parentId !== null) {
      const isDescendant = await checkIsDescendant(params.id, parentId);
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
          parentId: parentId !== undefined ? parentId : undefined,
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
        ...(parentId !== undefined && { parentId }),
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
    if (!process.env.DATABASE_URL || provider !== "prisma") {
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
