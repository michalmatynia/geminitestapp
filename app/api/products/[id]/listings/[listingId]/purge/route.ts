import { NextResponse } from "next/server";
import { getProductListingRepository } from "@/lib/services/product-listing-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError, notFoundError } from "@/lib/errors/app-error";

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
    const listing = await repo.getListingById(listingId);

    if (!listing || listing.productId !== productId) {
      throw notFoundError("Listing not found", { listingId, productId });
    }

    await repo.deleteListing(listingId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "product-listings.PURGE",
      fallbackMessage: "Failed to purge listing",
    });
  }
}
