import { NextRequest, NextResponse } from "next/server";
import { getCategoryMappingRepository } from "@/lib/services/category-mapping-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError } from "@/lib/errors/app-error";

type CreateMappingRequest = {
  connectionId: string;
  externalCategoryId: string;
  internalCategoryId: string;
  catalogId: string;
};

/**
 * GET /api/marketplace/mappings
 * Lists category mappings for a connection.
 * Query params:
 *   - connectionId (required): The integration connection ID
 *   - catalogId (optional): Filter by catalog ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get("connectionId");
    const catalogId = searchParams.get("catalogId") ?? undefined;

    if (!connectionId) {
      throw badRequestError("connectionId is required");
    }

    const repo = await getCategoryMappingRepository();
    const mappings = await repo.listByConnection(connectionId, catalogId);

    return NextResponse.json(mappings);
  } catch (error) {
    return createErrorResponse(error, {
      request,
      source: "marketplace/mappings.GET",
      fallbackMessage: "Failed to fetch category mappings",
    });
  }
}

/**
 * POST /api/marketplace/mappings
 * Creates a new category mapping.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateMappingRequest;
    const { connectionId, externalCategoryId, internalCategoryId, catalogId } = body;

    if (!connectionId || !externalCategoryId || !internalCategoryId || !catalogId) {
      throw badRequestError(
        "connectionId, externalCategoryId, internalCategoryId, and catalogId are required"
      );
    }

    const repo = await getCategoryMappingRepository();

    // Check if mapping already exists
    const existing = await repo.getByExternalCategory(
      connectionId,
      externalCategoryId,
      catalogId
    );

    if (existing) {
      // Update existing mapping
      const updated = await repo.update(existing.id, { internalCategoryId });
      return NextResponse.json(updated);
    }

    // Create new mapping
    const mapping = await repo.create({
      connectionId,
      externalCategoryId,
      internalCategoryId,
      catalogId,
    });

    return NextResponse.json(mapping, { status: 201 });
  } catch (error) {
    return createErrorResponse(error, {
      request,
      source: "marketplace/mappings.POST",
      fallbackMessage: "Failed to create category mapping",
    });
  }
}
