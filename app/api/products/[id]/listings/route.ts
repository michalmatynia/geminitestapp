import { NextResponse } from "next/server";
import { z } from "zod";
import { getProductListingRepository } from "@/lib/services/product-listing-repository";
import { getProductRepository } from "@/lib/services/product-repository";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { parseJsonBody } from "@/lib/api/parse-json";
import { badRequestError, conflictError, notFoundError } from "@/lib/errors/app-error";

const createListingSchema = z.object({
  integrationId: z.string().min(1),
  connectionId: z.string().min(1),
});

/**
 * GET /api/products/[id]/listings
 * Fetches all listings for a specific product.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    if (!productId) {
      throw badRequestError("Product id is required");
    }
    const repo = await getProductListingRepository();
    const listings = await repo.getListingsByProductId(productId);
    return NextResponse.json(listings);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "product-listings.GET",
      fallbackMessage: "Failed to fetch listings",
    });
  }
}

/**
 * POST /api/products/[id]/listings
 * Creates a new listing for a product on a marketplace.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    if (!productId) {
      throw badRequestError("Product id is required");
    }

    const parsed = await parseJsonBody(req, createListingSchema, {
      logPrefix: "product-listings.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;

    // Verify product exists
    const productRepo = await getProductRepository();
    const product = await productRepo.getProductById(productId);
    if (!product) {
      throw notFoundError("Product not found", { productId });
    }

    // Verify integration exists
    const integrationRepo = await getIntegrationRepository();
    const integration = await integrationRepo.getIntegrationById(data.integrationId);
    if (!integration) {
      throw notFoundError("Integration not found", {
        integrationId: data.integrationId,
      });
    }

    // Verify connection exists and belongs to the integration
    const connection = await integrationRepo.getConnectionByIdAndIntegration(
      data.connectionId,
      data.integrationId
    );
    if (!connection) {
      throw notFoundError(
        "Connection not found or does not belong to the integration",
        { connectionId: data.connectionId, integrationId: data.integrationId }
      );
    }

    // Check if listing already exists
    const listingRepo = await getProductListingRepository();
    const exists = await listingRepo.listingExists(productId, data.connectionId);
    if (exists) {
      throw conflictError("Product is already listed on this account", {
        productId,
        connectionId: data.connectionId,
      });
    }

    const listing = await listingRepo.createListing({
      productId,
      integrationId: data.integrationId,
      connectionId: data.connectionId,
    });

    return NextResponse.json(listing, { status: 201 });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "product-listings.POST",
      fallbackMessage: "Failed to create listing",
    });
  }
}
