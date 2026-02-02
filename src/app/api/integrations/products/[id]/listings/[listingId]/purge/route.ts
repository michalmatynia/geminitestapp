export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getProductListingRepository } from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string; listingId: string }): Promise<Response> {
  try {
    const { id: productId, listingId } = params;
    if (!productId || !listingId) {
      throw badRequestError("Product id and listing id are required");
    }
    const repo = await getProductListingRepository();
    const listing = await repo.getListingById(listingId);

    if (!listing || listing.productId !== productId) {
      throw notFoundError("Listing not found", { listingId, productId });
    }

    await repo.deleteListing(listingId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "integrations.products.listings.PURGE",
      fallbackMessage: "Failed to purge listing",
    });
  }
}

export const DELETE = apiHandlerWithParams<{ id: string; listingId: string }>(DELETE_handler, { source: "integrations.products.[id].listings.[listingId].purge.DELETE" });
