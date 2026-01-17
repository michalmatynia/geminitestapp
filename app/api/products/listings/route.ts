import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getProductListingRepository } from "@/lib/services/product-listing-repository";

/**
 * GET /api/products/listings
 * Returns a map of product IDs to their most relevant listing status.
 */
export async function GET() {
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
    const errorId = randomUUID();
    console.error("[product-listings][GET] Failed to fetch listing summary", {
      errorId,
      error,
    });
    return NextResponse.json({});
  }
}
