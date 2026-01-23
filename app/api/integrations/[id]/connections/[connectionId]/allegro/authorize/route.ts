import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError, notFoundError } from "@/lib/errors/app-error";

const PROD_AUTH_URL =
  process.env.ALLEGRO_AUTH_URL ?? "https://allegro.pl/auth/oauth/authorize";
const SANDBOX_AUTH_URL =
  process.env.ALLEGRO_SANDBOX_AUTH_URL ??
  "https://allegro.pl.allegrosandbox.pl/auth/oauth/authorize";

export async function GET(
  req: NextRequest,
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
      throw notFoundError("Allegro integration not found.", { integrationId: id });
    }

    const connection = await repo.getConnectionByIdAndIntegration(connId, id);

    if (!connection) {
      throw notFoundError("Connection not found.", {
        connectionId: connId,
        integrationId: id,
      });
    }

    if (!connection.username?.trim()) {
      throw badRequestError("Allegro client ID is required.", {
        connectionId: connId,
      });
    }

    const state = randomUUID();
    const callbackUrl = new URL(req.url);
    const redirectUri = `${callbackUrl.origin}/api/integrations/${id}/connections/${connId}/allegro/callback`;

    const authUrl = connection.allegroUseSandbox ? SANDBOX_AUTH_URL : PROD_AUTH_URL;
    const url = new URL(authUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", connection.username);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);

    const response = NextResponse.redirect(url.toString());
    response.cookies.set({
      name: `allegro_oauth_state_${connId}`,
      value: state,
      httpOnly: true,
      sameSite: "lax",
      secure: callbackUrl.protocol === "https:",
      maxAge: 600,
      path: "/",
    });

    return response;
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "integrations.allegro.authorize.GET",
      fallbackMessage: "Failed to start Allegro authorization.",
      ...(integrationId || connectionId
        ? { extra: { integrationId, connectionId } }
        : {}),
    });
  }
}
