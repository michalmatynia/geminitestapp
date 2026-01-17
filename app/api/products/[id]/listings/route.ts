import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  getProductListingRepository,
} from "@/lib/services/product-listing-repository";
import { getProductRepository } from "@/lib/services/product-repository";
import { getIntegrationRepository } from "@/lib/services/integration-repository";

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
    const repo = await getProductListingRepository();
    const listings = await repo.getListingsByProductId(productId);
    return NextResponse.json(listings);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[product-listings][GET] Failed to fetch listings", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to fetch listings", errorId },
      { status: 500 }
    );
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

    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      const errorId = randomUUID();
      console.error("[product-listings][POST] Failed to parse JSON body", {
        errorId,
        error,
      });
      return NextResponse.json(
        { error: "Invalid JSON payload", errorId },
        { status: 400 }
      );
    }

    const data = createListingSchema.parse(body);

    // Verify product exists
    const productRepo = await getProductRepository();
    const product = await productRepo.getProductById(productId);
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Verify integration exists
    const integrationRepo = await getIntegrationRepository();
    const integration = await integrationRepo.getIntegrationById(data.integrationId);
    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    // Verify connection exists and belongs to the integration
    const connection = await integrationRepo.getConnectionByIdAndIntegration(
      data.connectionId,
      data.integrationId
    );
    if (!connection) {
      return NextResponse.json(
        { error: "Connection not found or does not belong to the integration" },
        { status: 404 }
      );
    }

    // Check if listing already exists
    const listingRepo = await getProductListingRepository();
    const exists = await listingRepo.listingExists(productId, data.connectionId);
    if (exists) {
      return NextResponse.json(
        { error: "Product is already listed on this account" },
        { status: 409 }
      );
    }

    const listing = await listingRepo.createListing({
      productId,
      integrationId: data.integrationId,
      connectionId: data.connectionId,
    });

    return NextResponse.json(listing, { status: 201 });
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof z.ZodError) {
      console.warn("[product-listings][POST] Invalid payload", {
        errorId,
        issues: error.flatten(),
      });
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten(), errorId },
        { status: 400 }
      );
    }
    console.error("[product-listings][POST] Failed to create listing", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to create listing", errorId },
      { status: 500 }
    );
  }
}
