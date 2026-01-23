import { NextResponse } from "next/server";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { decryptSecret } from "@/lib/utils/encryption";
import { fetchBaseInventories } from "@/lib/services/imports/base-client";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError, notFoundError } from "@/lib/errors/app-error";

/**
 * GET /api/integrations/[id]/connections/[connectionId]/base/inventories
 * Fetches available inventories from Base.com/Baselinker API.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; connectionId: string }> }
) {
  try {
    const { id, connectionId } = await params;
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
      source: "integrations.base.inventories.GET",
      fallbackMessage: "Failed to fetch inventories",
    });
  }
}
