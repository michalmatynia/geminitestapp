import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getIntegrationRepository } from "@/features/integrations/server";
import { encryptSecret } from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { badRequestError, conflictError, notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const createConnectionSchema = z
  .object({
    name: z.string().trim().min(1),
    username: z.string().trim().min(1),
    password: z.string().trim().min(1),
  })
  .strict();

/**
 * GET /api/integrations/[id]/connections
 * Fetch connections for an integration.
 */
async function GET_handler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  let integrationId: string | null = null;

  try {
    const { id } = await params;
    integrationId = id;
    if (!integrationId) {
      throw badRequestError("Integration id is required");
    }

    const repo = await getIntegrationRepository();
    const connections = await repo.listConnections(integrationId);
    const payload = connections.map((connection) => ({
      id: connection.id,
      integrationId: connection.integrationId,
      name: connection.name,
      username: connection.username,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,

      hasPlaywrightStorageState: Boolean(connection.playwrightStorageState),
      playwrightStorageStateUpdatedAt:
        connection.playwrightStorageStateUpdatedAt,
      hasAllegroAccessToken: Boolean(connection.allegroAccessToken),
      allegroTokenUpdatedAt: connection.allegroTokenUpdatedAt,
      allegroExpiresAt: connection.allegroExpiresAt,
      allegroScope: connection.allegroScope,
      allegroUseSandbox: connection.allegroUseSandbox ?? false,

      hasBaseApiToken: Boolean(connection.baseApiToken),
      baseTokenUpdatedAt: connection.baseTokenUpdatedAt,
      baseLastInventoryId: connection.baseLastInventoryId,

      playwrightHeadless: connection.playwrightHeadless,
      playwrightSlowMo: connection.playwrightSlowMo,
      playwrightTimeout: connection.playwrightTimeout,
      playwrightNavigationTimeout: connection.playwrightNavigationTimeout,
      playwrightHumanizeMouse: connection.playwrightHumanizeMouse,
      playwrightMouseJitter: connection.playwrightMouseJitter,
      playwrightClickDelayMin: connection.playwrightClickDelayMin,
      playwrightClickDelayMax: connection.playwrightClickDelayMax,
      playwrightInputDelayMin: connection.playwrightInputDelayMin,
      playwrightInputDelayMax: connection.playwrightInputDelayMax,
      playwrightActionDelayMin: connection.playwrightActionDelayMin,
      playwrightActionDelayMax: connection.playwrightActionDelayMax,
      playwrightProxyEnabled: connection.playwrightProxyEnabled,
      playwrightProxyServer: connection.playwrightProxyServer,
      playwrightProxyUsername: connection.playwrightProxyUsername,
      playwrightProxyHasPassword: Boolean(connection.playwrightProxyPassword),
      playwrightEmulateDevice: connection.playwrightEmulateDevice,
      playwrightDeviceName: connection.playwrightDeviceName,
    }));

    return NextResponse.json(payload);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "integrations.[id].connections.GET",
      fallbackMessage: "Failed to fetch connections",
      ...(integrationId ? { extra: { integrationId } } : {}),
    });
  }
}

/**
 * POST /api/integrations/[id]/connections
 * Create a new connection for an integration.
 */
async function POST_handler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  let integrationId: string | null = null;

  try {
    const { id } = await params;
    integrationId = id;
    if (!integrationId) {
      throw badRequestError("Integration id is required");
    }

    const parsed = await parseJsonBody(req, createConnectionSchema, {
      logPrefix: "integrations.connections.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;

    const repo = await getIntegrationRepository();
    const integration = await repo.getIntegrationById(integrationId);
    if (!integration) {
      throw notFoundError("Integration not found", { integrationId });
    }

    const existing = await repo.listConnections(integrationId);
    if (existing.length > 0) {
      throw conflictError("Connection already exists", { integrationId });
    }

    const created = await repo.createConnection(integrationId, {
      name: data.name,
      username: data.username,
      password: encryptSecret(data.password),
    });

    return NextResponse.json({
      id: created.id,
      integrationId: created.integrationId,
      name: created.name,
      username: created.username,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      hasPlaywrightStorageState: Boolean(created.playwrightStorageState),
      playwrightStorageStateUpdatedAt: created.playwrightStorageStateUpdatedAt,
      hasBaseApiToken: Boolean(created.baseApiToken),
      baseTokenUpdatedAt: created.baseTokenUpdatedAt,
      baseLastInventoryId: created.baseLastInventoryId,
      allegroUseSandbox: created.allegroUseSandbox ?? false,
      playwrightHeadless: created.playwrightHeadless,
      playwrightSlowMo: created.playwrightSlowMo,
      playwrightTimeout: created.playwrightTimeout,
      playwrightNavigationTimeout: created.playwrightNavigationTimeout,
      playwrightHumanizeMouse: created.playwrightHumanizeMouse,
      playwrightMouseJitter: created.playwrightMouseJitter,
      playwrightClickDelayMin: created.playwrightClickDelayMin,
      playwrightClickDelayMax: created.playwrightClickDelayMax,
      playwrightInputDelayMin: created.playwrightInputDelayMin,
      playwrightInputDelayMax: created.playwrightInputDelayMax,
      playwrightActionDelayMin: created.playwrightActionDelayMin,
      playwrightActionDelayMax: created.playwrightActionDelayMax,
      playwrightProxyEnabled: created.playwrightProxyEnabled,
      playwrightProxyServer: created.playwrightProxyServer,
      playwrightProxyUsername: created.playwrightProxyUsername,
      playwrightProxyHasPassword: Boolean(created.playwrightProxyPassword),
      playwrightEmulateDevice: created.playwrightEmulateDevice,
      playwrightDeviceName: created.playwrightDeviceName,
    });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "integrations.[id].connections.POST",
      fallbackMessage: "Failed to create connection",
      ...(integrationId ? { extra: { integrationId } } : {}),
    });
  }
}

export const GET = apiHandlerWithParams<{ id: string }>(
  async (req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> =>
    GET_handler(req, { params: Promise.resolve(params) }),
  { source: "integrations.[id].connections.GET" }
);
export const POST = apiHandlerWithParams<{ id: string }>(
  async (req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> =>
    POST_handler(req, { params: Promise.resolve(params) }),
  { source: "integrations.[id].connections.POST" }
);
