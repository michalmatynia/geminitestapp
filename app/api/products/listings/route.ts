import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getProductListingRepository } from "@/lib/services/product-listing-repository";

/**
 * GET /api/products/listings
 * Returns the list of product IDs that have at least one listing.
 */
export async function GET() {
  try {
    const repo = await getProductListingRepository();

    const listAll = repo as unknown as {
      listAllListings?: () => Promise<{ productId: string }[]>;
    };

    if (!listAll.listAllListings) {
      return NextResponse.json([]);
    }

    const listings = await listAll.listAllListings();
    const productIds = Array.from(
      new Set(listings.map((listing) => listing.productId))
    );
    return NextResponse.json(productIds);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[product-listings][GET] Failed to fetch listing summary", {
      errorId,
      error,
    });
    return NextResponse.json([]);
  }
}
