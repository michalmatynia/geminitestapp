import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getProductListingRepository } from "@/lib/services/product-listing-repository";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { deleteBaseProduct } from "@/lib/services/imports/base-client";
import { decryptSecret } from "@/lib/utils/encryption";

const deleteSchema = z.object({
  inventoryId: z.string().min(1).optional(),
});

export async function POST(
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

    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const data = deleteSchema.parse(body);

    // Try to find inventoryId from multiple sources (in order of priority):
    // 1. Request body (explicit override)
    // 2. Listing's stored inventoryId
    // 3. Export history (most recent entry with inventoryId)
    // 4. Connection's baseLastInventoryId (fallback)
    let inventoryId =
      data.inventoryId ||
      listing.inventoryId ||
      listing.exportHistory
        ?.slice()
        .reverse()
        .find((event) => event.inventoryId)?.inventoryId ||
      null;

    // If still no inventoryId, try to get it from the connection's baseLastInventoryId
    if (!inventoryId) {
      const integrationRepo = await getIntegrationRepository();
      const connectionForInventory = await integrationRepo.getConnectionById(
        listing.connectionId
      );
      if (connectionForInventory?.baseLastInventoryId) {
        inventoryId = connectionForInventory.baseLastInventoryId;
      }
    }

    if (!inventoryId) {
      return NextResponse.json(
        { error: "Missing inventoryId for Base.com deletion. Please set an inventory ID in the connection settings or provide one manually." },
        { status: 400 }
      );
    }

    if (!listing.externalListingId) {
      return NextResponse.json(
        { error: "Missing Base.com product id for deletion." },
        { status: 400 }
      );
    }

    const integrationRepo = await getIntegrationRepository();
    const connection = await integrationRepo.getConnectionById(
      listing.connectionId
    );
    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    let token: string | null = null;
    if (connection.baseApiToken) {
      token = decryptSecret(connection.baseApiToken);
    } else if (connection.password) {
      token = decryptSecret(connection.password);
    }

    if (!token) {
      return NextResponse.json(
        { error: "Base.com API token not found in connection." },
        { status: 400 }
      );
    }

    const isMissingBaseProduct = (error: unknown) => {
      if (!(error instanceof Error)) return false;
      const message = error.message.toLowerCase();
      return (
        message.includes("invalid product identifier") ||
        message.includes("product does not exist")
      );
    };

    try {
      await deleteBaseProduct(token, inventoryId, listing.externalListingId);
    } catch (error) {
      if (!isMissingBaseProduct(error)) {
        throw error;
      }
    }

    await repo.updateListingStatus(listingId, "removed");
    await repo.appendExportHistory(listingId, {
      exportedAt: new Date(),
      status: "deleted",
      inventoryId,
      externalListingId: listing.externalListingId,
    });

    return NextResponse.json({ status: "deleted" });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[product-listings][DELETE_FROM_BASE] Failed to delete", {
      errorId,
      error,
    });
    const message = error instanceof Error ? error.message : "Failed to delete";
    return NextResponse.json({ error: message, errorId }, { status: 500 });
  }
}
