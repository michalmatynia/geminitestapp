import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getProductListingRepository } from "@/lib/services/product-listing-repository";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; listingId: string }> }
) {
  try {
    const { id: productId, listingId } = await params;
    const repo = await getProductListingRepository();
    const listing = await repo.getListingById(listingId);

    if (!listing || listing.productId !== productId) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    await repo.deleteListing(listingId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[product-listings][PURGE] Failed to purge listing", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to purge listing", errorId },
      { status: 500 }
    );
  }
}
