import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getProductListingRepository } from "@/lib/services/product-listing-repository";

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

    await repo.updateListingStatus(listingId, "removed");

    return NextResponse.json({ status: "removed" });
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
    const repo = await getProductListingRepository();
    const listing = await repo.getListingById(listingId);

    if (!listing || listing.productId !== productId) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      const errorId = randomUUID();
      console.error("[product-listings][PATCH] Failed to parse JSON body", {
        errorId,
        error,
      });
      return NextResponse.json(
        { error: "Invalid JSON payload", errorId },
        { status: 400 }
      );
    }

    const data = updateListingSchema.parse(body);
    await repo.updateListingInventoryId(listingId, data.inventoryId ?? null);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof z.ZodError) {
      console.warn("[product-listings][PATCH] Invalid payload", {
        errorId,
        issues: error.flatten(),
      });
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten(), errorId },
        { status: 400 }
      );
    }
    console.error("[product-listings][PATCH] Failed to update listing", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to update listing", errorId },
      { status: 500 }
    );
  }
}
