import { NextRequest, NextResponse } from "next/server";
import { getCategoryMappingRepository } from "@/lib/services/category-mapping-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError, validationError } from "@/lib/errors/app-error";
import { apiHandler } from "@/lib/api/api-handler";

type BulkMappingRequest = {
  connectionId: string;
  catalogId: string;
  mappings: {
    externalCategoryId: string;
    internalCategoryId: string;
  }[];
};

/**
 * POST /api/marketplace/mappings/bulk
 * Creates or updates multiple category mappings at once.
 */
async function POST_handler(request: NextRequest) {
  try {
    const body = (await request.json()) as BulkMappingRequest;
    const { connectionId, catalogId, mappings } = body;

    if (!connectionId || !catalogId) {
      throw badRequestError("connectionId and catalogId are required");
    }

    if (!Array.isArray(mappings) || mappings.length === 0) {
      throw validationError("mappings array is required and must not be empty");
    }

    // Validate each mapping
    for (const mapping of mappings) {
      if (!mapping.externalCategoryId || !mapping.internalCategoryId) {
        throw validationError(
          "Each mapping must have externalCategoryId and internalCategoryId"
        );
      }
    }

    const repo = getCategoryMappingRepository();
    const upsertedCount = await repo.bulkUpsert(connectionId, catalogId, mappings);

    return NextResponse.json({
      success: true,
      upserted: upsertedCount,
      message: `Successfully saved ${upsertedCount} category mappings`,
    });
  } catch (error) {
    return createErrorResponse(error, {
      request,
      source: "marketplace.mappings.bulk.POST",
      fallbackMessage: "Failed to bulk save category mappings",
    });
  }
}

export const POST = apiHandler(POST_handler, { source: "marketplace.mappings.bulk.POST" });
