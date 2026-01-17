import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { decryptSecret, encryptSecret } from "@/lib/utils/encryption";

const requestSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  path: z.string().trim().min(1),
  body: z.unknown().optional(),
});

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
 * POST /api/integrations/[id]/connections/[connectionId]/allegro/request
 * Proxy Allegro API requests using the stored access token.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; connectionId: string }> }
) {
  const errorId = randomUUID();
  try {
    const { id, connectionId } = await params;
    const body = await req.json();
    const data = requestSchema.parse(body);

    if (data.path.includes("://")) {
      return NextResponse.json(
        { error: "Path must be relative to the Allegro API base URL.", errorId },
        { status: 400 }
      );
    }

    if (!data.path.startsWith("/")) {
      return NextResponse.json(
        { error: "Path must start with /", errorId },
        { status: 400 }
      );
    }

    const repo = await getIntegrationRepository();
    const integration = await repo.getIntegrationById(id);
    if (!integration || integration.slug !== "allegro") {
      return NextResponse.json(
        { error: "Allegro integration not found.", errorId },
        { status: 404 }
      );
    }

    const connection = await repo.getConnectionByIdAndIntegration(
      connectionId,
      id
    );
    if (!connection) {
      return NextResponse.json(
        { error: "Connection not found.", errorId },
        { status: 404 }
      );
    }

    if (!connection.allegroAccessToken) {
      return NextResponse.json(
        { error: "Allegro access token missing. Connect first.", errorId },
        { status: 400 }
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
    const url = new URL(`${baseUrl}${data.path}`);

    const buildFetchOptions = (token: string): RequestInit => {
      const options: RequestInit = {
        method: data.method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.allegro.public.v1+json",
        },
      };
      if (data.method !== "GET" && data.body !== undefined) {
        options.headers = {
          ...options.headers,
          "Content-Type": "application/json",
        };
        options.body = JSON.stringify(data.body);
      }
      return options;
    };

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

    const accessToken = decryptSecret(connection.allegroAccessToken);
    let response = await fetch(url.toString(), buildFetchOptions(accessToken));
    let refreshed = false;
    if (response.status === 401 && refreshToken) {
      const newAccessToken = await refreshAccessToken();
      refreshed = true;
      response = await fetch(url.toString(), buildFetchOptions(newAccessToken));
    }
    const contentType = response.headers.get("content-type") ?? "";
    const raw = await response.text();
    let parsed: unknown = raw;
    if (contentType.includes("application/json") && raw) {
      try {
        parsed = JSON.parse(raw) as unknown;
      } catch {
        parsed = raw;
      }
    }

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      data: parsed,
      refreshed,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[allegro][request] Failed to proxy request", {
      errorId,
      message,
    });
    return NextResponse.json(
      { error: message, errorId },
      { status: 500 }
    );
  }
}
