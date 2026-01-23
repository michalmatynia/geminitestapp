import { NextRequest, NextResponse } from "next/server";
import { getCategoryMappingRepository } from "@/lib/services/category-mapping-repository";

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
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BulkMappingRequest;
    const { connectionId, catalogId, mappings } = body;

    if (!connectionId || !catalogId) {
      return NextResponse.json(
        { error: "connectionId and catalogId are required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(mappings) || mappings.length === 0) {
      return NextResponse.json(
        { error: "mappings array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Validate each mapping
    for (const mapping of mappings) {
      if (!mapping.externalCategoryId || !mapping.internalCategoryId) {
        return NextResponse.json(
          { error: "Each mapping must have externalCategoryId and internalCategoryId" },
          { status: 400 }
        );
      }
    }

    const repo = await getCategoryMappingRepository();
    const upsertedCount = await repo.bulkUpsert(connectionId, catalogId, mappings);

    return NextResponse.json({
      success: true,
      upserted: upsertedCount,
      message: `Successfully saved ${upsertedCount} category mappings`,
    });
  } catch (error) {
    console.error("[marketplace/mappings/bulk] POST error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to bulk save category mappings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
