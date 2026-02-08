export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { fetchBaseCategories } from "@/features/integrations/server";
import { getExternalCategoryRepository } from "@/features/integrations/server";
import { getIntegrationRepository } from "@/features/integrations/server";
import { resolveBaseConnectionToken } from "@/features/integrations/services/base-token-resolver";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import type { FetchMarketplaceCategoriesRequestDto as FetchCategoriesRequest } from "@/shared/dtos/integrations";

/**
 * POST /api/marketplace/categories/fetch
 * Fetches categories from the marketplace API and stores them locally.
 * Currently supports Base.com (BaseLinker).
 */
async function POST_handler(request: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const body = (await request.json()) as FetchCategoriesRequest;
  const { connectionId } = body;

  if (!connectionId) {
    throw badRequestError("connectionId is required");
  }

  const repo = await getIntegrationRepository();
  const connection = await repo.getConnectionById(connectionId);

  if (!connection) {
    throw notFoundError("Connection not found");
  }

  const integration = await repo.getIntegrationById(connection.integrationId);
  if (!integration) {
    throw notFoundError("Integration not found");
  }

  // Check if this is a Base.com connection
  const integrationSlug = integration.slug?.toLowerCase();
  if (integrationSlug !== "baselinker" && integrationSlug !== "base") {
    throw badRequestError("Only Base.com connections are supported for category fetch");
  }

  const tokenResolution = resolveBaseConnectionToken(connection);
  if (!tokenResolution.token) {
    throw badRequestError(
      tokenResolution.error ?? "Base.com API token not configured for this connection"
    );
  }

  // Fetch categories from Base.com API
  const categories = await fetchBaseCategories(tokenResolution.token, {
    inventoryId: connection.baseLastInventoryId ?? null,
  });

  if (categories.length === 0) {
    return NextResponse.json({
      fetched: 0,
      total: 0,
      message:
        "No categories found in Base.com. Verify categories exist in the selected inventory and test the connection again.",
    });
  }

  // Sync categories to local database
  const externalCategoryRepo = getExternalCategoryRepository();
  const syncedCount = await externalCategoryRepo.syncFromBase(connectionId, categories);

  return NextResponse.json({
    fetched: syncedCount,
    total: categories.length,
    message: `Successfully synced ${syncedCount} categories from Base.com`,
  });
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "marketplace.categories.fetch.POST" });
