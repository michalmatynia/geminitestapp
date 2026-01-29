import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getIntegrationRepository } from "@/features/integrations/server";
import { encryptSecret } from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { badRequestError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const connectionSchema = z.object({
  name: z.string().trim().min(1),
  username: z.string().trim().min(1),
  password: z.string().trim().optional(),
  playwrightHeadless: z.boolean().optional(),
  playwrightSlowMo: z.number().int().min(0).optional(),
  playwrightTimeout: z.number().int().min(1000).optional(),
  playwrightNavigationTimeout: z.number().int().min(1000).optional(),
  playwrightHumanizeMouse: z.boolean().optional(),
  playwrightMouseJitter: z.number().int().min(0).optional(),
  playwrightClickDelayMin: z.number().int().min(0).optional(),
  playwrightClickDelayMax: z.number().int().min(0).optional(),
  playwrightInputDelayMin: z.number().int().min(0).optional(),
  playwrightInputDelayMax: z.number().int().min(0).optional(),
  playwrightActionDelayMin: z.number().int().min(0).optional(),
  playwrightActionDelayMax: z.number().int().min(0).optional(),
  playwrightProxyEnabled: z.boolean().optional(),
  playwrightProxyServer: z.string().optional(),
  playwrightProxyUsername: z.string().optional(),
  playwrightProxyPassword: z.string().optional(),
  playwrightEmulateDevice: z.boolean().optional(),
  playwrightDeviceName: z.string().optional(),
  allegroUseSandbox: z.boolean().optional(),
});

/**
 * PUT /api/integrations/connections/[id]
 * Updates an integration connection.
 */
async function PUT_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  let connectionId: string | null = null;

  try {
    const { id } = params;
    connectionId = id;
    if (!connectionId) {
      throw badRequestError("Connection id is required");
    }

    const parsed = await parseJsonBody(req, connectionSchema, {
      logPrefix: "integrations.connection.PUT",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;

    const repo = await getIntegrationRepository();
    const connection = await repo.updateConnection(connectionId, {
      name: data.name,
      username: data.username,
      ...(data.password ? { password: encryptSecret(data.password) } : {}),

      ...(typeof data.playwrightHeadless === "boolean"
        ? { playwrightHeadless: data.playwrightHeadless }
        : {}),
      ...(typeof data.playwrightSlowMo === "number"
        ? { playwrightSlowMo: data.playwrightSlowMo }
        : {}),
      ...(typeof data.playwrightTimeout === "number"
        ? { playwrightTimeout: data.playwrightTimeout }
        : {}),
      ...(typeof data.playwrightNavigationTimeout === "number"
        ? { playwrightNavigationTimeout: data.playwrightNavigationTimeout }
        : {}),
      ...(typeof data.playwrightHumanizeMouse === "boolean"
        ? { playwrightHumanizeMouse: data.playwrightHumanizeMouse }
        : {}),
      ...(typeof data.playwrightMouseJitter === "number"
        ? { playwrightMouseJitter: data.playwrightMouseJitter }
        : {}),
      ...(typeof data.playwrightClickDelayMin === "number"
        ? { playwrightClickDelayMin: data.playwrightClickDelayMin }
        : {}),
      ...(typeof data.playwrightClickDelayMax === "number"
        ? { playwrightClickDelayMax: data.playwrightClickDelayMax }
        : {}),
      ...(typeof data.playwrightInputDelayMin === "number"
        ? { playwrightInputDelayMin: data.playwrightInputDelayMin }
        : {}),
      ...(typeof data.playwrightInputDelayMax === "number"
        ? { playwrightInputDelayMax: data.playwrightInputDelayMax }
        : {}),
      ...(typeof data.playwrightActionDelayMin === "number"
        ? { playwrightActionDelayMin: data.playwrightActionDelayMin }
        : {}),
      ...(typeof data.playwrightActionDelayMax === "number"
        ? { playwrightActionDelayMax: data.playwrightActionDelayMax }
        : {}),
      ...(typeof data.playwrightProxyEnabled === "boolean"
        ? { playwrightProxyEnabled: data.playwrightProxyEnabled }
        : {}),
      ...(typeof data.playwrightProxyServer === "string"
        ? { playwrightProxyServer: data.playwrightProxyServer }
        : {}),
      ...(typeof data.playwrightProxyUsername === "string"
        ? { playwrightProxyUsername: data.playwrightProxyUsername }
        : {}),
      ...(typeof data.playwrightProxyPassword === "string" &&
      data.playwrightProxyPassword.trim()
        ? {
            playwrightProxyPassword: encryptSecret(
              data.playwrightProxyPassword.trim()
            ),
          }
        : {}),
      ...(typeof data.playwrightEmulateDevice === "boolean"
        ? { playwrightEmulateDevice: data.playwrightEmulateDevice }
        : {}),
      ...(typeof data.playwrightDeviceName === "string"
        ? { playwrightDeviceName: data.playwrightDeviceName }
        : {}),
      ...(typeof data.allegroUseSandbox === "boolean"
        ? { allegroUseSandbox: data.allegroUseSandbox }
        : {}),
    });

    return NextResponse.json({
      id: connection.id,
      integrationId: connection.integrationId,
      name: connection.name,
      username: connection.username,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      hasAllegroAccessToken: Boolean(connection.allegroAccessToken),
      allegroTokenUpdatedAt: connection.allegroTokenUpdatedAt,
      allegroExpiresAt: connection.allegroExpiresAt,
      allegroScope: connection.allegroScope,
      allegroUseSandbox: connection.allegroUseSandbox ?? false,
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
    });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "integrations.connections.[id].PUT",
      fallbackMessage: "Failed to update connection",
      ...(connectionId ? { extra: { connectionId } } : {}),
    });
  }
}

/**
 * DELETE /api/integrations/connections/[id]
 * Deletes an integration connection.
 */
async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  let connectionId: string | null = null;

  try {
    const { id } = params;
    connectionId = id;
    if (!connectionId) {
      throw badRequestError("Connection id is required");
    }

    const repo = await getIntegrationRepository();
    await repo.deleteConnection(connectionId);
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "integrations.connections.[id].DELETE",
      fallbackMessage: "Failed to delete connection",
      ...(connectionId ? { extra: { connectionId } } : {}),
    });
  }
}

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, { source: "integrations.connections.[id].PUT" });
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, { source: "integrations.connections.[id].DELETE" });
