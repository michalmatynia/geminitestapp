import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { encryptSecret } from "@/lib/utils/encryption";

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
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let integrationId: string | null = null;

  try {
    const { id } = await params;
    integrationId = id;

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
    const errorId = randomUUID();
    console.error("[integrations][connections][GET] Failed to fetch", {
      errorId,
      integrationId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to fetch connections", errorId, integrationId },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/[id]/connections
 * Create a new connection for an integration.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let integrationId: string | null = null;

  try {
    const { id } = await params;
    integrationId = id;

    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      const errorId = randomUUID();
      console.error("[integrations][connections][POST] Invalid JSON", {
        errorId,
        integrationId,
        error,
      });
      return NextResponse.json(
        { error: "Invalid JSON payload", errorId, integrationId },
        { status: 400 }
      );
    }

    const data = createConnectionSchema.parse(body);

    const repo = await getIntegrationRepository();
    const integration = await repo.getIntegrationById(integrationId);
    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found", integrationId },
        { status: 404 }
      );
    }

    const existing = await repo.listConnections(integrationId);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Connection already exists", integrationId },
        { status: 400 }
      );
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
    const errorId = randomUUID();
    if (error instanceof z.ZodError) {
      console.warn("[integrations][connections][POST] Invalid payload", {
        errorId,
        integrationId,
        issues: error.flatten(),
      });
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten(), errorId },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      console.error("[integrations][connections][POST] Failed", {
        errorId,
        integrationId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId, integrationId },
        { status: 400 }
      );
    }
    console.error("[integrations][connections][POST] Unknown error", {
      errorId,
      integrationId,
      error,
    });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId, integrationId },
      { status: 400 }
    );
  }
}
