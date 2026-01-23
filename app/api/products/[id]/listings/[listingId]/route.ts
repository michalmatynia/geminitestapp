import { NextResponse } from "next/server";
import { z } from "zod";
import { getProductListingRepository } from "@/lib/services/product-listing-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { parseJsonBody } from "@/lib/api/parse-json";
import { badRequestError, notFoundError } from "@/lib/errors/app-error";

const updateListingSchema = z.object({
  inventoryId: z.string().trim().min(1).nullable(),
});

/**
 * DELETE /api/products/[id]/listings/[listingId]
 * Marks a listing as removed from a marketplace.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; listingId: string }> }
) {
  try {
    const { id: productId, listingId } = await params;
    if (!productId || !listingId) {
      throw badRequestError("Product id and listing id are required");
    }

    const repo = await getProductListingRepository();

    // Verify the listing exists
    const listing = await repo.getListingById(listingId);

    if (!listing) {
      throw notFoundError("Listing not found", { listingId });
    }

    // Verify it belongs to this product
    if (listing.productId !== productId) {
      throw notFoundError("Listing not found", { listingId, productId });
    }

    await repo.updateListingStatus(listingId, "removed");

    return NextResponse.json({ status: "removed" });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "product-listings.DELETE",
      fallbackMessage: "Failed to delete listing",
    });
  }
}

/**
 * PATCH /api/products/[id]/listings/[listingId]
 * Updates listing metadata (e.g., inventoryId).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; listingId: string }> }
) {
  try {
    const { id: productId, listingId } = await params;
    if (!productId || !listingId) {
      throw badRequestError("Product id and listing id are required");
    }
    const repo = await getProductListingRepository();
    const listing = await repo.getListingById(listingId);

    if (!listing || listing.productId !== productId) {
      throw notFoundError("Listing not found", { listingId, productId });
    }

    const parsed = await parseJsonBody(req, updateListingSchema, {
      logPrefix: "product-listings.PATCH",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;
    await repo.updateListingInventoryId(listingId, data.inventoryId ?? null);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "product-listings.PATCH",
      fallbackMessage: "Failed to update listing",
    });
  }
}
