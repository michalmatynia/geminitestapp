import { NextRequest, NextResponse } from "next/server";
import { getIntegrationsWithConnections } from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

/**
 * GET /api/integrations/with-connections
 * Fetches all integrations with their connections.
 * Used for the product listing dropdown selection.
 * Supports both MongoDB and Prisma based on provider settings.
 */
async function GET_handler(req: NextRequest): Promise<Response> {
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

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "integrations.with-connections.GET" });
