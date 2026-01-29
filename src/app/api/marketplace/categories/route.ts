import { NextRequest, NextResponse } from "next/server";
import { getExternalCategoryRepository } from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

/**
 * GET /api/marketplace/categories
 * Lists external categories for a given connection.
 * Query params:
 *   - connectionId (required): The integration connection ID
 *   - tree (optional): If "true", returns categories as a hierarchical tree
 */
async function GET_handler(request: NextRequest): Promise<Response> {
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

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "marketplace.categories.GET" });
