import { NextRequest, NextResponse } from "next/server";
import { getCategoryMappingRepository } from "@/lib/services/category-mapping-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { notFoundError } from "@/lib/errors/app-error";

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
      throw notFoundError("Mapping not found");
    }

    return NextResponse.json(mapping);
  } catch (error) {
    return createErrorResponse(error, {
      request,
      source: "marketplace/mappings/[id].GET",
      fallbackMessage: "Failed to fetch category mapping",
    });
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
      throw notFoundError("Mapping not found");
    }

    const updated = await repo.update(id, {
      ...(body.internalCategoryId !== undefined && {
        internalCategoryId: body.internalCategoryId,
      }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    });

    return NextResponse.json(updated);
  } catch (error) {
    return createErrorResponse(error, {
      request,
      source: "marketplace/mappings/[id].PUT",
      fallbackMessage: "Failed to update category mapping",
    });
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
      throw notFoundError("Mapping not found");
    }

    await repo.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error, {
      request,
      source: "marketplace/mappings/[id].DELETE",
      fallbackMessage: "Failed to delete category mapping",
    });
  }
}
