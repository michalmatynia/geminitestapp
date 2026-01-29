import { NextRequest, NextResponse } from "next/server";
import { getIntegrationRepository } from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

async function POST_handler(req: NextRequest,
  { params }: { params: Promise<{ id: string; connectionId: string }> }
): Promise<Response> {
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

export const POST = apiHandlerWithParams<{ id: string; connectionId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { id: string; connectionId: string }): Promise<Response> => async (req: NextRequest(req, { params: Promise.resolve(params) }),
 _ctx: ApiHandlerContext, params: { id: string; connectionId: string }): Promise<Response> => POST_handler(req, { params: Promise.resolve(params) }), { source: "integrations.[id].connections.[connectionId].allegro.disconnect.POST" });
