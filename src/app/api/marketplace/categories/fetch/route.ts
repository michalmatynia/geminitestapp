import { NextRequest, NextResponse } from "next/server";
import prisma from "@/shared/lib/db/prisma";
import { fetchBaseCategories } from "@/features/integrations/server";
import { getExternalCategoryRepository } from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

type FetchCategoriesRequest = {
  connectionId: string;
};

/**
 * POST /api/marketplace/categories/fetch
 * Fetches categories from the marketplace API and stores them locally.
 * Currently supports Base.com (BaseLinker).
 */
async function POST_handler(request: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const body = (await request.json()) as FetchCategoriesRequest;
    const { connectionId } = body;

    if (!connectionId) {
      throw badRequestError("connectionId is required");
    }

    // Get the connection to retrieve the API token
    const connection = await prisma.integrationConnection.findUnique({
      where: { id: connectionId },
      include: { integration: true },
    });

    if (!connection) {
      throw notFoundError("Connection not found");
    }

    // Check if this is a Base.com connection
    const integrationSlug = connection.integration?.slug?.toLowerCase();
    if (integrationSlug !== "baselinker" && integrationSlug !== "base") {
      throw badRequestError("Only Base.com connections are supported for category fetch");
    }

    // Get the API token
    const token = connection.baseApiToken;
    if (!token) {
      throw badRequestError("Base.com API token not configured for this connection");
    }

    // Fetch categories from Base.com API
    const categories = await fetchBaseCategories(token);

    if (categories.length === 0) {
      return NextResponse.json({
        fetched: 0,
        total: 0,
        message: "No categories found in Base.com",
      });
    }

    // Sync categories to local database
    const repo = getExternalCategoryRepository();
    const syncedCount = await repo.syncFromBase(connectionId, categories);

    return NextResponse.json({
      fetched: syncedCount,
      total: categories.length,
      message: `Successfully synced ${syncedCount} categories from Base.com`,
    });
  } catch (error) {
    return createErrorResponse(error, {
      request,
      source: "marketplace.categories.fetch.POST",
      fallbackMessage: "Failed to fetch categories from marketplace",
    });
  }
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "marketplace.categories.fetch.POST" });
