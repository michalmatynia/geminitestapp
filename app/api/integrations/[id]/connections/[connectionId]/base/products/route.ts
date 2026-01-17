import { NextResponse } from "next/server";
import { z } from "zod";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { decryptSecret } from "@/lib/utils/encryption";
import { fetchBaseProducts } from "@/lib/services/imports/base-client";
import { randomUUID } from "crypto";

const requestSchema = z.object({
  inventoryId: z.string().trim().min(1),
  limit: z.coerce.number().int().positive().optional(),
});

/**
 * POST /api/integrations/[id]/connections/[connectionId]/base/products
 * Fetches products from a specific inventory in Base.com/Baselinker.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; connectionId: string }> }
) {
  try {
    const { id, connectionId } = await params;

    const body = await req.json();
    const data = requestSchema.parse(body);

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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.flatten() },
        { status: 400 }
      );
    }

    const errorId = randomUUID();
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[integrations][connections][base][products] Error", {
      errorId,
      message,
    });
    return NextResponse.json(
      { error: message, errorId },
      { status: 500 }
    );
  }
}
