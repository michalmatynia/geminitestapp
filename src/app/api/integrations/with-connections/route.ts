import { NextResponse } from "next/server";
import { getIntegrationsWithConnections } from "@/features/integrations";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";

/**
 * GET /api/integrations/with-connections
 * Fetches all integrations with their connections.
 * Used for the product listing dropdown selection.
 * Supports both MongoDB and Prisma based on provider settings.
 */
async function GET_handler(req: Request) {
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

export const GET = apiHandler(GET_handler, { source: "integrations.with-connections.GET" });
