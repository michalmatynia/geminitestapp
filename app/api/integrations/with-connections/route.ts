import { NextResponse } from "next/server";
import { getIntegrationsWithConnections } from "@/lib/services/product-listing-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";

/**
 * GET /api/integrations/with-connections
 * Fetches all integrations with their connections.
 * Used for the product listing dropdown selection.
 * Supports both MongoDB and Prisma based on provider settings.
 */
export async function GET(req: Request) {
  try {
    const integrations = await getIntegrationsWithConnections();
    return NextResponse.json(integrations);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "integrations.with-connections.GET",
      fallbackMessage: "Failed to fetch integrations",
    });
  }
}
