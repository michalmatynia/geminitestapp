import { NextRequest, NextResponse } from "next/server";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { decryptSecret } from "@/lib/utils/encryption";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError, notFoundError } from "@/lib/errors/app-error";
import { apiHandlerWithParams } from "@/lib/api/api-handler";

/**
 * GET /api/integrations/connections/[id]/session
 * Returns stored Playwright session cookies for a connection.
 */
async function GET_handler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connectionId: string | null = null;

  try {
    const { id } = await params;
    connectionId = id;
    if (!connectionId) {
      throw badRequestError("Connection id is required");
    }

    const repo = await getIntegrationRepository();
    const connection = await repo.getConnectionById(connectionId);

    if (!connection) {
      throw notFoundError("Connection not found", { connectionId });
    }

    if (!connection.playwrightStorageState) {
      throw notFoundError("No stored Playwright session.", { connectionId });
    }

    const decrypted = decryptSecret(connection.playwrightStorageState);
    const storageState = JSON.parse(decrypted) as {
      cookies?: unknown[];
      origins?: unknown[];
    };

    return NextResponse.json({
      cookies: storageState.cookies ?? [],
      origins: storageState.origins ?? [],
      updatedAt: connection.playwrightStorageStateUpdatedAt,
    });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "integrations.connections.[id].session.GET",
      fallbackMessage: "Failed to load session",
      ...(connectionId ? { extra: { connectionId } } : {}),
    });
  }
}

export const GET = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => GET_handler(req, { params: Promise.resolve(params) }), { source: "integrations.connections.[id].session.GET" });
