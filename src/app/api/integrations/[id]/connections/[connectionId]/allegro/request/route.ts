import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getIntegrationRepository } from "@/features/integrations/server";
import { decryptSecret, encryptSecret } from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const requestSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  path: z.string().trim().min(1),
  body: z["unknown"]().optional(),
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
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string; connectionId: string }): Promise<Response> {
  try {
    const { id, connectionId } = params;
    if (!id || !connectionId) {
      throw badRequestError("Integration id and connection id are required");
    }
    const parsed = await parseJsonBody(req, requestSchema, {
      logPrefix: "integrations.allegro.request.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;

    if (data.path.includes("://")) {
      throw badRequestError("Path must be relative to the Allegro API base URL.");
    }

    if (!data.path.startsWith("/")) {
      throw badRequestError("Path must start with /");
    }

    const repo = await getIntegrationRepository();
    const integration = await repo.getIntegrationById(id);
    if (!integration || integration.slug !== "allegro") {
      throw notFoundError("Allegro integration not found.", {
        integrationId: id,
      });
    }

    const connection = await repo.getConnectionByIdAndIntegration(
      connectionId,
      id
    );
    if (!connection) {
      throw notFoundError("Connection not found.", { connectionId });
    }

    if (!connection.allegroAccessToken) {
      throw badRequestError("Allegro access token missing. Connect first.");
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

    const refreshAccessToken = async (): Promise<string> => {
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
    let apiResponseData: unknown = raw;
    if (contentType.includes("application/json") && raw) {
      try {
        apiResponseData = JSON.parse(raw) as unknown;
      } catch {
        apiResponseData = raw;
      }
    }

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      data: apiResponseData,
      refreshed,
    });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "integrations.[id].connections.[connectionId].allegro.request.POST",
      fallbackMessage: "Failed to proxy request",
    });
  }
}

export const POST = apiHandlerWithParams<{ id: string; connectionId: string }>(POST_handler, { source: "integrations.[id].connections.[connectionId].allegro.request.POST" });
