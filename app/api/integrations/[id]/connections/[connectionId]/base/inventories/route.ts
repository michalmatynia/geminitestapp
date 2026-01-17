import { NextResponse } from "next/server";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { decryptSecret } from "@/lib/utils/encryption";
import { fetchBaseInventories } from "@/lib/services/imports/base-client";
import { randomUUID } from "crypto";

/**
 * GET /api/integrations/[id]/connections/[connectionId]/base/inventories
 * Fetches available inventories from Base.com/Baselinker API.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; connectionId: string }> }
) {
  try {
    const { id, connectionId } = await params;

    const repo = await getIntegrationRepository();
    const connection = await repo.getConnectionByIdAndIntegration(connectionId, id);

    if (!connection) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      );
    }

    const integration = await repo.getIntegrationById(id);

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    if (integration.slug !== "baselinker") {
      return NextResponse.json(
        { error: "This endpoint is for Base.com/Baselinker connections only." },
        { status: 400 }
      );
    }

    // Get the Base API token
    let baseToken: string | null = null;

    if (connection.baseApiToken) {
      baseToken = decryptSecret(connection.baseApiToken);
    } else if (connection.password) {
      baseToken = decryptSecret(connection.password);
    }

    if (!baseToken) {
      return NextResponse.json(
        { error: "No Base API token configured. Please test the connection first." },
        { status: 400 }
      );
    }

    const inventories = await fetchBaseInventories(baseToken);

    return NextResponse.json({
      inventories: inventories.map((inv) => ({ id: inv.id, name: inv.name })),
      count: inventories.length,
      lastInventoryId: connection.baseLastInventoryId,
    });
  } catch (error: unknown) {
    const errorId = randomUUID();
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[integrations][connections][base][inventories] Error", {
      errorId,
      message,
    });
    return NextResponse.json(
      { error: message, errorId },
      { status: 500 }
    );
  }
}
