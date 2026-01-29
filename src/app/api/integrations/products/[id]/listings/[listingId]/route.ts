import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProductListingRepository } from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const updateListingSchema = z.object({
  inventoryId: z.string().trim().min(1).nullable(),
});

/**
 * DELETE /api/products/[id]/listings/[listingId]
 * Marks a listing as removed from a marketplace.
 */
async function DELETE_handler(req: NextRequest,
  { params }: { params: Promise<{ id: string; listingId: string }> }
): Promise<Response> {
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
      source: "integrations.products.[id].listings.[listingId].DELETE",
      fallbackMessage: "Failed to delete listing",
    });
  }
}

/**
 * PATCH /api/products/[id]/listings/[listingId]
 * Updates listing metadata (e.g., inventoryId).
 */
async function PATCH_handler(req: NextRequest,
  { params }: { params: Promise<{ id: string; listingId: string }> }
): Promise<Response> {
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
      logPrefix: "integrations.products.listings.PATCH",
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
      source: "integrations.products.[id].listings.[listingId].PATCH",
      fallbackMessage: "Failed to update listing",
    });
  }
}

export const DELETE = apiHandlerWithParams<{ id: string; listingId: string }>(
  async (req, _ctx, params) => DELETE_handler(req, { params: Promise.resolve(params) }), { source: "integrations.products.[id].listings.[listingId].DELETE" });
export const PATCH = apiHandlerWithParams<{ id: string; listingId: string }>(
  async (req, _ctx, params) => PATCH_handler(req, { params: Promise.resolve(params) }), { source: "integrations.products.[id].listings.[listingId].PATCH" });
