import { NextRequest, NextResponse } from "next/server";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { decryptSecret, encryptSecret } from "@/lib/utils/encryption";

const TOKEN_URL =
  process.env.ALLEGRO_TOKEN_URL ?? "https://allegro.pl/auth/oauth/token";

type AllegroTokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

const toErrorRedirect = (origin: string, reason: string) => {
  const url = new URL("/admin/integrations", origin);
  url.searchParams.set("allegro", "error");
  url.searchParams.set("reason", reason);
  return url.toString();
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; connectionId: string }> }
) {
  let integrationId: string | null = null;
  let connectionId: string | null = null;
  const requestUrl = new URL(req.url);

  try {
    const { id, connectionId: connId } = await params;
    integrationId = id;
    connectionId = connId;

    const errorParam = requestUrl.searchParams.get("error");
    if (errorParam) {
      const description =
        requestUrl.searchParams.get("error_description") || errorParam;
      return NextResponse.redirect(toErrorRedirect(requestUrl.origin, description));
    }

    const code = requestUrl.searchParams.get("code");
    const state = requestUrl.searchParams.get("state");
    if (!code || !state) {
      return NextResponse.redirect(
        toErrorRedirect(requestUrl.origin, "Missing authorization code.")
      );
    }

    const expectedState = req.cookies.get(
      `allegro_oauth_state_${connId}`
    )?.value;
    if (!expectedState || expectedState !== state) {
      return NextResponse.redirect(
        toErrorRedirect(requestUrl.origin, "Invalid OAuth state.")
      );
    }

    const repo = await getIntegrationRepository();
    const integration = await repo.getIntegrationById(id);
    if (!integration || integration.slug !== "allegro") {
      return NextResponse.redirect(
        toErrorRedirect(requestUrl.origin, "Allegro integration not found.")
      );
    }

    const connection = await repo.getConnectionByIdAndIntegration(connId, id);

    if (!connection?.username || !connection.password) {
      return NextResponse.redirect(
        toErrorRedirect(requestUrl.origin, "Missing Allegro credentials.")
      );
    }

    const clientId = connection.username;
    const clientSecret = decryptSecret(connection.password);
    const redirectUri = `${requestUrl.origin}/api/integrations/${id}/connections/${connId}/allegro/callback`;

    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    let payload: AllegroTokenResponse;
    const contentType = tokenRes.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      payload = (await tokenRes.json()) as AllegroTokenResponse;
    } else {
      payload = { error_description: await tokenRes.text() };
    }

    if (!tokenRes.ok || payload.error || !payload.access_token) {
      const reason =
        payload.error_description || payload.error || "Token exchange failed.";
      return NextResponse.redirect(toErrorRedirect(requestUrl.origin, reason));
    }

    const expiresAt =
      typeof payload.expires_in === "number"
        ? new Date(Date.now() + payload.expires_in * 1000)
        : null;

    await repo.updateConnection(connId, {
      allegroAccessToken: encryptSecret(payload.access_token),
      allegroRefreshToken: payload.refresh_token
        ? encryptSecret(payload.refresh_token)
        : null,
      allegroTokenType: payload.token_type ?? null,
      allegroScope: payload.scope ?? null,
      allegroExpiresAt: expiresAt,
      allegroTokenUpdatedAt: new Date(),
    });

    const successUrl = new URL("/admin/integrations", requestUrl.origin);
    successUrl.searchParams.set("allegro", "connected");

    const response = NextResponse.redirect(successUrl.toString());
    response.cookies.set({
      name: `allegro_oauth_state_${connId}`,
      value: "",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[allegro][callback] OAuth failed", {
      integrationId,
      connectionId,
      error,
    });
    return NextResponse.redirect(
      toErrorRedirect(requestUrl.origin, "Allegro authorization failed.")
    );
  }
}
