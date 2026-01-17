import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getProductListingRepository } from "@/lib/services/product-listing-repository";

/**
 * DELETE /api/products/[id]/listings/[listingId]
 * Removes a listing from a marketplace.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; listingId: string }> }
) {
  try {
    const { id: productId, listingId } = await params;

    const repo = await getProductListingRepository();

    // Verify the listing exists
    const listing = await repo.getListingById(listingId);

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    // Verify it belongs to this product
    if (listing.productId !== productId) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    await repo.deleteListing(listingId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[product-listings][DELETE] Failed to delete listing", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to delete listing", errorId },
      { status: 500 }
    );
  }
}
