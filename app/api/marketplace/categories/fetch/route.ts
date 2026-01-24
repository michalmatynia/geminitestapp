import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fetchBaseCategories } from "@/lib/services/imports/base-client";
import { getExternalCategoryRepository } from "@/lib/services/external-category-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError, notFoundError } from "@/lib/errors/app-error";
import { apiHandler } from "@/lib/api/api-handler";

type FetchCategoriesRequest = {
  connectionId: string;
};

/**
 * POST /api/marketplace/categories/fetch
 * Fetches categories from the marketplace API and stores them locally.
 * Currently supports Base.com (BaseLinker).
 */
async function POST_handler(request: NextRequest) {
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
    const repo = await getExternalCategoryRepository();
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

export const POST = apiHandler(POST_handler, { source: "marketplace.categories.fetch.POST" });
