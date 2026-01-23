import { NextRequest, NextResponse } from "next/server";
import { getCategoryMappingRepository } from "@/lib/services/category-mapping-repository";

type UpdateMappingRequest = {
  internalCategoryId?: string;
  isActive?: boolean;
};

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/marketplace/mappings/[id]
 * Gets a specific category mapping by ID.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const repo = await getCategoryMappingRepository();
    const mapping = await repo.getById(id);

    if (!mapping) {
      return NextResponse.json(
        { error: "Mapping not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(mapping);
  } catch (error) {
    console.error("[marketplace/mappings/[id]] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch category mapping" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/marketplace/mappings/[id]
 * Updates a category mapping.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = (await request.json()) as UpdateMappingRequest;

    const repo = await getCategoryMappingRepository();

    // Check if mapping exists
    const existing = await repo.getById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Mapping not found" },
        { status: 404 }
      );
    }

    const updated = await repo.update(id, {
      ...(body.internalCategoryId !== undefined && {
        internalCategoryId: body.internalCategoryId,
      }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[marketplace/mappings/[id]] PUT error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update category mapping";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/marketplace/mappings/[id]
 * Deletes a category mapping.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const repo = await getCategoryMappingRepository();

    // Check if mapping exists
    const existing = await repo.getById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Mapping not found" },
        { status: 404 }
      );
    }

    await repo.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[marketplace/mappings/[id]] DELETE error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete category mapping";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
