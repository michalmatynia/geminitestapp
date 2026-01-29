import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getIntegrationRepository } from "@/features/integrations/server";
import { decryptSecret } from "@/features/integrations/server";
import { fetchBaseProducts } from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const requestSchema = z.object({
  inventoryId: z.string().trim().min(1),
  limit: z.coerce.number().int().positive().optional(),
});

/**
 * POST /api/integrations/[id]/connections/[connectionId]/base/products
 * Fetches products from a specific inventory in Base.com/Baselinker.
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string; connectionId: string }): Promise<Response> {
  try {
    const { id, connectionId } = params;
    if (!id || !connectionId) {
      throw badRequestError("Integration id and connection id are required");
    }

    const parsed = await parseJsonBody(req, requestSchema, {
      logPrefix: "integrations.base.products.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;

    const repo = await getIntegrationRepository();
    const connection = await repo.getConnectionByIdAndIntegration(connectionId, id);

    if (!connection) {
      throw notFoundError("Connection not found", { connectionId, integrationId: id });
    }

    const integration = await repo.getIntegrationById(id);

    if (!integration) {
      throw notFoundError("Integration not found", { integrationId: id });
    }

    if (integration.slug !== "baselinker") {
      throw badRequestError("This endpoint is for Base.com/Baselinker connections only.");
    }

    // Get the Base API token
    let baseToken: string | null = null;

    if (connection.baseApiToken) {
      baseToken = decryptSecret(connection.baseApiToken);
    } else if (connection.password) {
      baseToken = decryptSecret(connection.password);
    }

    if (!baseToken) {
      throw badRequestError("No Base API token configured. Please test the connection first.");
    }

    const products = await fetchBaseProducts(baseToken, data.inventoryId, data.limit);

    // Update the last used inventory ID
    if (connection.baseLastInventoryId !== data.inventoryId) {
      await repo.updateConnection(connection.id, {
        baseLastInventoryId: data.inventoryId,
      });
    }

    return NextResponse.json({
      products,
      count: products.length,
      inventoryId: data.inventoryId,
    });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "integrations.[id].connections.[connectionId].base.products.POST",
      fallbackMessage: "Failed to fetch products",
    });
  }
}

export const POST = apiHandlerWithParams<{ id: string; connectionId: string }>(POST_handler, { source: "integrations.[id].connections.[connectionId].base.products.POST" });
