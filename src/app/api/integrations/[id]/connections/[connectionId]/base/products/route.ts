export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getIntegrationRepository } from "@/features/integrations/server";
import { fetchBaseProducts } from "@/features/integrations/server";
import { resolveBaseConnectionToken } from "@/features/integrations/services/base-token-resolver";
import { parseJsonBody } from "@/features/products/server";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const requestSchema = z.object({
  inventoryId: z.string().trim().min(1),
  limit: z.coerce.number().int().positive().optional()
});

/**
 * POST /api/integrations/[id]/connections/[connectionId]/base/products
 * Fetches products from a specific inventory in Base.com/Baselinker.
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string; connectionId: string }): Promise<Response> {
  const { id, connectionId } = params;
  if (!id || !connectionId) {
    throw badRequestError("Integration id and connection id are required");
  }

  const parsed = await parseJsonBody(req, requestSchema, {
    logPrefix: "integrations.base.products.POST"
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

  const tokenResolution = resolveBaseConnectionToken(connection);
  if (!tokenResolution.token) {
    throw badRequestError(
      tokenResolution.error ?? "No Base API token configured. Please test the connection first."
    );
  }
  const baseToken = tokenResolution.token;

  const products = await fetchBaseProducts(baseToken, data.inventoryId, data.limit);

  // Update the last used inventory ID
  if (connection.baseLastInventoryId !== data.inventoryId) {
    await repo.updateConnection(connection.id, {
      baseLastInventoryId: data.inventoryId
    });
  }

  return NextResponse.json({
    products,
    count: products.length,
    inventoryId: data.inventoryId
  });
}

export const POST = apiHandlerWithParams<{ id: string; connectionId: string }>(
  POST_handler,
  { source: "integrations.[id].connections.[connectionId].base.products.POST", requireCsrf: false }
);
