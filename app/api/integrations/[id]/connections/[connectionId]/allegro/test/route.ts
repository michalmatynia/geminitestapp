import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { decryptSecret, encryptSecret } from "@/lib/utils/encryption";

type TestLogEntry = {
  step: string;
  status: "pending" | "ok" | "failed";
  timestamp: string;
  detail: string;
};

const PROD_BASE_URL = process.env.ALLEGRO_API_URL ?? "https://api.allegro.pl";
const SANDBOX_BASE_URL =
  process.env.ALLEGRO_SANDBOX_API_URL ??
  "https://api.allegro.pl.allegrosandbox.pl";
const PROD_TOKEN_URL =
  process.env.ALLEGRO_TOKEN_URL ?? "https://allegro.pl/auth/oauth/token";
const SANDBOX_TOKEN_URL =
  process.env.ALLEGRO_SANDBOX_TOKEN_URL ??
  "https://allegro.pl.allegrosandbox.pl/auth/oauth/token";

/**
 * POST /api/integrations/[id]/connections/[connectionId]/allegro/test
 * Tests Allegro API access using stored credentials.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; connectionId: string }> }
) {
  let integrationId: string | null = null;
  let integrationConnectionId: string | null = null;
  const steps: TestLogEntry[] = [];

  const pushStep = (
    step: string,
    status: "pending" | "ok" | "failed",
    detail: string
  ) => {
    steps.push({
      step,
      status,
      detail,
      timestamp: new Date().toISOString(),
    });
  };

  const fail = (step: string, detail: string, status = 400) => {
    const errorId = randomUUID();
    const safeDetail = detail?.trim() ? detail : "Unknown error";
    pushStep(step, "failed", safeDetail);
    console.error("[integrations][connections][allegro][test] Failed", {
      errorId,
      integrationId,
      connectionId: integrationConnectionId,
      step,
      status,
      detail: safeDetail,
    });
    return NextResponse.json(
      {
        error: safeDetail,
        steps,
        errorId,
        integrationId,
        connectionId: integrationConnectionId,
      },
      { status }
    );
  };

  try {
    const { id, connectionId } = await params;
    integrationId = id;
    integrationConnectionId = connectionId;

    pushStep("Loading connection", "pending", "Fetching stored credentials");
    const repo = await getIntegrationRepository();
    const connection = await repo.getConnectionByIdAndIntegration(
      connectionId,
      id
    );

    if (!connection) {
      return fail("Loading connection", "Connection not found", 404);
    }
    pushStep("Loading connection", "ok", "Connection loaded");

    const integration = await repo.getIntegrationById(id);

    if (!integration) {
      return fail("Loading integration", "Integration not found", 404);
    }

    if (integration.slug !== "allegro") {
      return fail(
        "Connection test",
        `This endpoint is for Allegro connections only. Got: ${integration.name}`,
        400
      );
    }

    if (!connection.allegroAccessToken) {
      return fail(
        "Token validation",
        "Allegro access token not configured. Connect first."
      );
    }

    const clientId = connection.username?.trim();
    const clientSecret = connection.password
      ? decryptSecret(connection.password)
      : null;
    const refreshToken = connection.allegroRefreshToken
      ? decryptSecret(connection.allegroRefreshToken)
      : null;

    const baseUrl = connection.allegroUseSandbox
      ? SANDBOX_BASE_URL
      : PROD_BASE_URL;
    const tokenUrl = connection.allegroUseSandbox
      ? SANDBOX_TOKEN_URL
      : PROD_TOKEN_URL;

    const buildRequest = (token: string) =>
      fetch(`${baseUrl}/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.allegro.public.v1+json",
        },
      });

    const refreshAccessToken = async () => {
      if (!refreshToken || !clientId || !clientSecret) {
        throw new Error("Missing refresh token or client credentials.");
      }
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });
      const tokenRes = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
      if (!tokenRes.ok) {
        const payload = await tokenRes.text();
        throw new Error(
          `Failed to refresh Allegro token: ${tokenRes.status} ${payload}`
        );
      }
      const payload = (await tokenRes.json()) as {
        access_token: string;
        refresh_token?: string;
        token_type?: string;
        scope?: string;
        expires_in?: number;
      };
      const expiresAt = payload.expires_in
        ? new Date(Date.now() + payload.expires_in * 1000)
        : null;
      await repo.updateConnection(connection.id, {
        allegroAccessToken: encryptSecret(payload.access_token),
        allegroRefreshToken: payload.refresh_token
          ? encryptSecret(payload.refresh_token)
          : connection.allegroRefreshToken ?? null,
        allegroTokenType: payload.token_type ?? null,
        allegroScope: payload.scope ?? null,
        allegroExpiresAt: expiresAt,
        allegroTokenUpdatedAt: new Date(),
      });
      return payload.access_token;
    };

    pushStep("Testing API connection", "pending", "Calling Allegro /me");
    let accessToken = decryptSecret(connection.allegroAccessToken);
    let response = await buildRequest(accessToken);
    let refreshed = false;

    if (response.status === 401 && refreshToken) {
      pushStep("Refreshing token", "pending", "Refreshing Allegro access token");
      try {
        accessToken = await refreshAccessToken();
        refreshed = true;
        pushStep("Refreshing token", "ok", "Allegro token refreshed");
        response = await buildRequest(accessToken);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return fail("Refreshing token", message);
      }
    }

    const raw = await response.text();
    if (!response.ok) {
      const detail = raw || `${response.status} ${response.statusText}`.trim();
      return fail("Testing API connection", detail, response.status);
    }

    pushStep(
      "Testing API connection",
      "ok",
      refreshed
        ? "API connection successful. Token refreshed."
        : "API connection successful."
    );

    await repo.updateConnection(connection.id, {
      allegroTokenUpdatedAt: new Date(),
    });

    let profile: unknown = raw;
    try {
      profile = raw ? (JSON.parse(raw) as unknown) : null;
    } catch {
      profile = raw;
    }

    return NextResponse.json({
      ok: true,
      steps,
      profile,
    });
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      pushStep("Unexpected error", "failed", error.message);
      console.error("[integrations][connections][allegro][test] Unexpected", {
        errorId,
        integrationId,
        connectionId: integrationConnectionId,
        message: error.message,
      });
      return NextResponse.json(
        {
          error: error.message,
          steps,
          errorId,
          integrationId,
          connectionId: integrationConnectionId,
        },
        { status: 400 }
      );
    }
    pushStep("Unexpected error", "failed", "Failed to test connection");
    console.error("[integrations][connections][allegro][test] Unknown error", {
      errorId,
      integrationId,
      connectionId: integrationConnectionId,
      error,
    });
    return NextResponse.json(
      {
        error: "Failed to test connection",
        steps,
        errorId,
        integrationId,
        connectionId: integrationConnectionId,
      },
      { status: 500 }
    );
  }
}
