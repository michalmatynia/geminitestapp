import { NextResponse } from "next/server";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError, notFoundError } from "@/lib/errors/app-error";
import { apiHandlerWithParams } from "@/lib/api/api-handler";

async function POST_handler(
  req: Request,
  { params }: { params: Promise<{ id: string; connectionId: string }> }
) {
  let integrationId: string | null = null;
  let connectionId: string | null = null;

  try {
    const { id, connectionId: connId } = await params;
    integrationId = id;
    connectionId = connId;
    if (!integrationId || !connectionId) {
      throw badRequestError("Integration id and connection id are required.");
    }

    const repo = await getIntegrationRepository();
    const integration = await repo.getIntegrationById(id);

    if (!integration || integration.slug !== "allegro") {
      throw notFoundError("Allegro integration not found.", {
        integrationId: id,
      });
    }

    await repo.updateConnection(connId, {
      allegroAccessToken: null,
      allegroRefreshToken: null,
      allegroTokenType: null,
      allegroScope: null,
      allegroExpiresAt: null,
      allegroTokenUpdatedAt: null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "integrations.[id].connections.[connectionId].allegro.disconnect.POST",
      fallbackMessage: "Failed to disconnect Allegro.",
      ...(integrationId || connectionId
        ? { extra: { integrationId, connectionId } }
        : {}),
    });
  }
}

export const POST = apiHandlerWithParams<{ id: string; connectionId: string }>(async (req, _ctx, params) => POST_handler(req, { params: Promise.resolve(params) }), { source: "integrations.[id].connections.[connectionId].allegro.disconnect.POST" });
