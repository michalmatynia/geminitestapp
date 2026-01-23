import { NextResponse } from "next/server";
import { getProductListingRepository } from "@/lib/services/product-listing-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";

/**
 * GET /api/products/listings
 * Returns a map of product IDs to their most relevant listing status.
 */
export async function GET(req: Request) {
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
      source: "product-listings.GET",
      fallbackMessage: "Failed to fetch listing summary",
    });
  }
}
