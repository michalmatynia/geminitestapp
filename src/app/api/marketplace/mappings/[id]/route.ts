import { NextRequest, NextResponse } from "next/server";
import { getCategoryMappingRepository } from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";

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
async function GET_handler(request: NextRequest, { params }: RouteParams): Promise<Response> {
  try {
    const { id } = await params;

    const repo = getCategoryMappingRepository();
    const mapping = await repo.getById(id);

    if (!mapping) {
      throw notFoundError("Mapping not found");
    }

    return NextResponse.json(mapping);
  } catch (error) {
    return createErrorResponse(error, {
      request,
      source: "marketplace.mappings.[id].GET",
      fallbackMessage: "Failed to fetch category mapping",
    });
  }
}

/**
 * PUT /api/marketplace/mappings/[id]
 * Updates a category mapping.
 */
async function PUT_handler(request: NextRequest, { params }: RouteParams): Promise<Response> {
  try {
    const { id } = await params;
    const body = (await request.json()) as UpdateMappingRequest;

    const repo = getCategoryMappingRepository();

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
      source: "marketplace.mappings.[id].PUT",
      fallbackMessage: "Failed to update category mapping",
    });
  }
}

/**
 * DELETE /api/marketplace/mappings/[id]
 * Deletes a category mapping.
 */
async function DELETE_handler(request: NextRequest, { params }: RouteParams): Promise<Response> {
  try {
    const { id } = await params;

    const repo = getCategoryMappingRepository();

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
      source: "marketplace.mappings.[id].DELETE",
      fallbackMessage: "Failed to delete category mapping",
    });
  }
}

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, { source: "marketplace.mappings.[id].GET" });
export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, { source: "marketplace.mappings.[id].PUT" });
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, { source: "marketplace.mappings.[id].DELETE" });
