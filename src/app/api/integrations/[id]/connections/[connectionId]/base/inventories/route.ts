import { NextRequest, NextResponse } from "next/server";
import { getIntegrationRepository } from "@/features/integrations/server";
import { decryptSecret } from "@/features/integrations/server";
import { fetchBaseInventories } from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";

/**
 * GET /api/integrations/[id]/connections/[connectionId]/base/inventories
 * Fetches available inventories from Base.com/Baselinker API.
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string; connectionId: string }): Promise<Response> {
  try {
    const { id, connectionId } = params;
    if (!id || !connectionId) {
      throw badRequestError("Integration id and connection id are required");
    }

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

    const inventories = await fetchBaseInventories(baseToken);

    return NextResponse.json({
      inventories: inventories.map((inv) => ({ id: inv.id, name: inv.name })),
      count: inventories.length,
      lastInventoryId: connection.baseLastInventoryId,
    });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "integrations.[id].connections.[connectionId].base.inventories.GET",
      fallbackMessage: "Failed to fetch inventories",
    });
  }
}

export const GET = apiHandlerWithParams<{ id: string; connectionId: string }>(GET_handler, { source: "integrations.[id].connections.[connectionId].base.inventories.GET" });
