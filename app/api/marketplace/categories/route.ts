import { NextRequest, NextResponse } from "next/server";
import { getExternalCategoryRepository } from "@/lib/services/external-category-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError } from "@/lib/errors/app-error";
import { apiHandler } from "@/lib/api/api-handler";

/**
 * GET /api/marketplace/categories
 * Lists external categories for a given connection.
 * Query params:
 *   - connectionId (required): The integration connection ID
 *   - tree (optional): If "true", returns categories as a hierarchical tree
 */
async function GET_handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get("connectionId");
    const tree = searchParams.get("tree") === "true";

    if (!connectionId) {
      throw badRequestError("connectionId is required");
    }

    const repo = getExternalCategoryRepository();

    if (tree) {
      const categories = await repo.getTreeByConnection(connectionId);
      return NextResponse.json(categories);
    }

    const categories = await repo.listByConnection(connectionId);
    return NextResponse.json(categories);
  } catch (error) {
    return createErrorResponse(error, {
      request,
      source: "marketplace.categories.GET",
      fallbackMessage: "Failed to fetch external categories",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "marketplace.categories.GET" });
