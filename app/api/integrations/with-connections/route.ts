import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getIntegrationsWithConnections } from "@/lib/services/product-listing-repository";

/**
 * GET /api/integrations/with-connections
 * Fetches all integrations with their connections.
 * Used for the product listing dropdown selection.
 * Supports both MongoDB and Prisma based on provider settings.
 */
export async function GET() {
  try {
    const integrations = await getIntegrationsWithConnections();
    return NextResponse.json(integrations);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[integrations-with-connections][GET] Failed to fetch", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to fetch integrations", errorId },
      { status: 500 }
    );
  }
}
