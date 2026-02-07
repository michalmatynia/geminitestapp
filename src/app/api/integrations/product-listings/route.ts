export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getProductListingRepository } from "@/features/integrations/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

/**
 * GET /api/integrations/product-listings
 * Returns a map of product IDs to their most relevant listing status.
 */
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const repo = await getProductListingRepository();
  const listings = await repo.listAllListings();

  const statusRank: Record<string, number> = {
    active: 3,
    pending: 2,
    failed: 1,
    removed: 0
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
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "products.listings.GET", requireCsrf: false });
