import { NextResponse } from "next/server";
import { getProductListingRepository } from "@/features/integrations";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";

/**
 * GET /api/integrations/product-listings
 * Returns a map of product IDs to their most relevant listing status.
 */
async function GET_handler(req: Request) {
  try {
    const repo = await getProductListingRepository();
    const listings = await repo.listAllListings();

    const statusRank: Record<string, number> = {
      active: 3,
      pending: 2,
      failed: 1,
      removed: 0,
    };

    const byProduct = new Map<string, string>();
    for (const listing of listings) {
      const current = byProduct.get(listing.productId);
      if (!current) {
        byProduct.set(listing.productId, listing.status);
        continue;
      }
      const currentRank = statusRank[current] ?? -1;
      const nextRank = statusRank[listing.status] ?? -1;
      if (nextRank > currentRank) {
        byProduct.set(listing.productId, listing.status);
      }
    }

    return NextResponse.json(Object.fromEntries(byProduct.entries()));
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.listings.GET",
      fallbackMessage: "Failed to fetch listing summary",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "products.listings.GET" });
