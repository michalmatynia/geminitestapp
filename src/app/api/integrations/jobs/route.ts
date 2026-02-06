export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getProductListingRepository } from "@/features/integrations/server";
import { getProductRepository } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

/**
 * GET /api/integrations/jobs
 * Fetches all product listing jobs with product details
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const listingRepo = await getProductListingRepository();
    const productRepo = await getProductRepository();

    // Get all listings
    const allListings = await listingRepo.listAllListings();

    // Group by product and get product details
    const productIds = Array.from(new Set(allListings.map((l) => l.productId)));

    const jobs = await Promise.all(
      productIds.map(async (productId) => {
        const product = await productRepo.getProductById(productId);
        const listings = await listingRepo.getListingsByProductId(productId);

        return {
          productId,
          productName: product?.name_en || product?.name_pl || product?.name_de || "Unknown",
          productSku: product?.sku || null,
          listings: listings.map((listing) => ({
            id: listing.id,
            productId: listing.productId,
            integrationId: listing.integrationId,
            integrationName: listing.integration.name,
            integrationSlug: listing.integration.slug,
            connectionId: listing.connectionId,
            connectionName: listing.connection.name,
            status: listing.status,
            externalListingId: listing.externalListingId,
            inventoryId: listing.inventoryId ?? null,
            listedAt: listing.listedAt,
            exportHistory: listing.exportHistory ?? null,
            createdAt: listing.createdAt,
            updatedAt: listing.updatedAt
          }))
        };
      })
    );

    // Filter out products with no listings
    const jobsWithListings = jobs.filter((job) => job.listings.length > 0);

    return NextResponse.json(jobsWithListings);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "integrations.jobs.GET",
      fallbackMessage: "Failed to fetch listing jobs"
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "integrations.jobs.GET", requireCsrf: false });
