import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { getProductRepository } from "@/features/products/services/product-repository";
import { getProductListingRepository } from "@/features/integrations/server";
import { getIntegrationRepository } from "@/features/integrations/server";
import { decryptSecret } from "@/features/integrations/server";
import { fetchBaseProductDetails } from "@/features/integrations/services/imports/base-client";
import { extractBaseImageUrls } from "@/features/integrations/services/imports/base-mapper";

const syncSchema = z.object({
  inventoryId: z.string().min(1).optional(),
});

const mergeImageLinks = (existing: string[], incoming: string[]): string[] => {
  const merged = [...existing];
  incoming.forEach((url: string, index: number) => {
    if (!url) return;
    merged[index] = url;
  });
  const seen = new Set<string>();
  return merged.filter((url: string) => {
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
};

async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; listingId: string }
): Promise<Response> {
  try {
    const { id: productId, listingId } = params;
    if (!productId || !listingId) {
      throw badRequestError("Product id and listing id are required");
    }

    const productRepo = await getProductRepository();
    const product = await productRepo.getProductById(productId);
    if (!product) {
      throw notFoundError("Product not found", { productId });
    }

    const listingRepo = await getProductListingRepository();
    const listing = await listingRepo.getListingById(listingId);
    if (!listing || listing.productId !== productId) {
      throw notFoundError("Listing not found", { listingId, productId });
    }

    const parsed = await parseJsonBody(req, syncSchema, {
      logPrefix: "integrations.products.listings.SYNC_BASE_IMAGES",
      allowEmpty: true,
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;

    let inventoryId =
      data.inventoryId ||
      listing.inventoryId ||
      listing.exportHistory
        ?.slice()
        .reverse()
        .find((event) => event.inventoryId)?.inventoryId ||
      null;

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
        "Missing inventoryId for Base.com sync. Please set an inventory ID in the connection settings or provide one manually."
      );
    }

    const baseProductId = listing.externalListingId || product.baseProductId;
    if (!baseProductId) {
      throw badRequestError("Missing Base.com product id for image sync.");
    }

    const integrationRepo = await getIntegrationRepository();
    const connection = await integrationRepo.getConnectionById(
      listing.connectionId
    );
    if (!connection) {
      throw notFoundError("Connection not found", {
        connectionId: listing.connectionId,
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
        connectionId: listing.connectionId,
      });
    }

    const records = await fetchBaseProductDetails(token, inventoryId, [
      baseProductId,
    ]);
    if (!records.length) {
      throw notFoundError("Base.com product not found", {
        baseProductId,
        inventoryId,
      });
    }

    const urls = extractBaseImageUrls(records[0] ?? {}).filter(Boolean);
    if (urls.length === 0) {
      throw badRequestError("No image URLs found in Base.com product data.");
    }

    const existingLinks = Array.isArray(product.imageLinks)
      ? product.imageLinks
      : [];
    const nextLinks = mergeImageLinks(existingLinks, urls);
    await productRepo.updateProduct(productId, {
      imageLinks: nextLinks,
    });

    return NextResponse.json({
      status: "synced",
      count: nextLinks.length,
      added: urls.length,
    });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "integrations.products.listings.SYNC_BASE_IMAGES",
      fallbackMessage: "Failed to sync image URLs from Base.com",
    });
  }
}

export const POST = apiHandlerWithParams<{ id: string; listingId: string }>(
  POST_handler,
  { source: "integrations.products.[id].listings.[listingId].sync-base-images.POST" }
);
