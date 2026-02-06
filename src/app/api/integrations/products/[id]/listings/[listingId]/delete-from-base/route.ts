export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProductListingRepository } from "@/features/integrations/server";
import { getIntegrationRepository } from "@/features/integrations/server";
import { deleteBaseProduct } from "@/features/integrations/server";
import { decryptSecret } from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const deleteSchema = z.object({
  inventoryId: z.string().min(1).optional()
});

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string; listingId: string }): Promise<Response> {
  try {
    const { id: productId, listingId } = params;
    if (!productId || !listingId) {
      throw badRequestError("Product id and listing id are required");
    }
    const repo = await getProductListingRepository();
    const listing = await repo.getListingById(listingId);

    if (!listing || listing.productId !== productId) {
      throw notFoundError("Listing not found", { listingId, productId });
    }

    const parsed = await parseJsonBody(req, deleteSchema, {
      logPrefix: "integrations.products.listings.DELETE_FROM_BASE",
      allowEmpty: true
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;

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
      throw badRequestError(
        "Missing inventoryId for Base.com deletion. Please set an inventory ID in the connection settings or provide one manually."
      );
    }

    if (!listing.externalListingId) {
      throw badRequestError("Missing Base.com product id for deletion.");
    }

    const integrationRepo = await getIntegrationRepository();
    const connection = await integrationRepo.getConnectionById(
      listing.connectionId
    );
    if (!connection) {
      throw notFoundError("Connection not found", {
        connectionId: listing.connectionId
      });
    }

    let token: string | null = null;
    if (connection.baseApiToken) {
      token = decryptSecret(connection.baseApiToken);
    } else if (connection.password) {
      token = decryptSecret(connection.password);
    }

    if (!token) {
      throw badRequestError("Base.com API token not found in connection.", {
        connectionId: listing.connectionId
      });
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
      externalListingId: listing.externalListingId
    });

    return NextResponse.json({ status: "deleted" });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "integrations.products.listings.DELETE_FROM_BASE",
      fallbackMessage: "Failed to delete listing from Base.com"
    });
  }
}

export const POST = apiHandlerWithParams<{ id: string; listingId: string }>(
  POST_handler,
  { source: "integrations.products.[id].listings.[listingId].delete-from-base.POST", requireCsrf: false }
);
