import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getIntegrationRepository } from "@/lib/services/integration-repository";

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

    const repo = await getIntegrationRepository();
    const integration = await repo.getIntegrationById(id);

    if (!integration || integration.slug !== "allegro") {
      return NextResponse.json(
        { error: "Allegro integration not found." },
        { status: 404 }
      );
    }

    const connection = await repo.getConnectionByIdAndIntegration(connId, id);

    if (!connection) {
      return NextResponse.json(
        { error: "Connection not found." },
        { status: 404 }
      );
    }

    if (!connection.username?.trim()) {
      return NextResponse.json(
        { error: "Allegro client ID is required." },
        { status: 400 }
      );
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
    console.error("[allegro][authorize] Failed to start OAuth", {
      integrationId,
      connectionId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to start Allegro authorization." },
      { status: 500 }
    );
  }
}
