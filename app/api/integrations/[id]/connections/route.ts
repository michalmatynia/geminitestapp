import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { encryptSecret } from "@/lib/utils/encryption";

/**
 * PUT payload for updating a single integration connection.
 * Your UI sends name/username always, and may send password / playwright settings.
 */
const updateConnectionSchema = z
  .object({
    name: z.string().trim().min(1),
    username: z.string().trim().min(1),

    // Optional secrets: treat "" as "do not update"
    password: z.string().trim().min(1).optional(),

    // Playwright settings (all optional)
    playwrightHeadless: z.boolean().optional(),
    playwrightSlowMo: z.number().int().min(0).optional(),
    playwrightTimeout: z.number().int().min(0).optional(),
    playwrightNavigationTimeout: z.number().int().min(0).optional(),
    playwrightHumanizeMouse: z.boolean().optional(),
    playwrightMouseJitter: z.number().int().min(0).optional(),
    playwrightClickDelayMin: z.number().int().min(0).optional(),
    playwrightClickDelayMax: z.number().int().min(0).optional(),
    playwrightInputDelayMin: z.number().int().min(0).optional(),
    playwrightInputDelayMax: z.number().int().min(0).optional(),
    playwrightActionDelayMin: z.number().int().min(0).optional(),
    playwrightActionDelayMax: z.number().int().min(0).optional(),

    playwrightProxyEnabled: z.boolean().optional(),
    playwrightProxyServer: z.string().trim().optional(),
    playwrightProxyUsername: z.string().trim().optional(),
    playwrightProxyPassword: z.string().trim().optional(), // "" = keep
    playwrightEmulateDevice: z.boolean().optional(),
    playwrightDeviceName: z.string().trim().optional(),
  })
  .strict();

function emptyToNull(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * GET /api/integrations/connections/[id]
 * Fetch single connection.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connectionId: string | null = null;

  try {
    const { id } = await params;
    connectionId = id;

    const connection = await prisma.integrationConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return NextResponse.json(
        { error: "Connection not found", connectionId },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: connection.id,
      integrationId: connection.integrationId,
      name: connection.name,
      username: connection.username,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,

      hasPlaywrightStorageState: Boolean(connection.playwrightStorageState),
      playwrightStorageStateUpdatedAt:
        connection.playwrightStorageStateUpdatedAt,

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
  } catch (error) {
    const errorId = randomUUID();
    console.error(
      "[integrations][connection][GET] Failed to fetch connection",
      {
        errorId,
        connectionId,
        error,
      }
    );

    return NextResponse.json(
      { error: "Failed to fetch connection", errorId, connectionId },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/integrations/connections/[id]
 * Update a connection (name/username/password + playwright settings).
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connectionId: string | null = null;

  try {
    const { id } = await params;
    connectionId = id;

    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      const errorId = randomUUID();
      console.error(
        "[integrations][connection][PUT] Failed to parse JSON body",
        {
          errorId,
          connectionId,
          error,
        }
      );
      return NextResponse.json(
        { error: "Invalid JSON payload", errorId, connectionId },
        { status: 400 }
      );
    }

    const data = updateConnectionSchema.parse(body);

    // Treat empty strings as "do not update" for secrets
    const passwordToSet =
      data.password && data.password.trim().length > 0
        ? encryptSecret(data.password.trim())
        : undefined;

    const proxyPasswordToSet =
      data.playwrightProxyPassword &&
      data.playwrightProxyPassword.trim().length > 0
        ? encryptSecret(data.playwrightProxyPassword.trim())
        : undefined;

    const updated = await prisma.integrationConnection.update({
      where: { id: connectionId },
      data: {
        name: data.name,
        username: data.username,

        ...(passwordToSet ? { password: passwordToSet } : {}),

        // Playwright settings
        ...(data.playwrightHeadless !== undefined
          ? { playwrightHeadless: data.playwrightHeadless }
          : {}),
        ...(data.playwrightSlowMo !== undefined
          ? { playwrightSlowMo: data.playwrightSlowMo }
          : {}),
        ...(data.playwrightTimeout !== undefined
          ? { playwrightTimeout: data.playwrightTimeout }
          : {}),
        ...(data.playwrightNavigationTimeout !== undefined
          ? { playwrightNavigationTimeout: data.playwrightNavigationTimeout }
          : {}),
        ...(data.playwrightHumanizeMouse !== undefined
          ? { playwrightHumanizeMouse: data.playwrightHumanizeMouse }
          : {}),
        ...(data.playwrightMouseJitter !== undefined
          ? { playwrightMouseJitter: data.playwrightMouseJitter }
          : {}),
        ...(data.playwrightClickDelayMin !== undefined
          ? { playwrightClickDelayMin: data.playwrightClickDelayMin }
          : {}),
        ...(data.playwrightClickDelayMax !== undefined
          ? { playwrightClickDelayMax: data.playwrightClickDelayMax }
          : {}),
        ...(data.playwrightInputDelayMin !== undefined
          ? { playwrightInputDelayMin: data.playwrightInputDelayMin }
          : {}),
        ...(data.playwrightInputDelayMax !== undefined
          ? { playwrightInputDelayMax: data.playwrightInputDelayMax }
          : {}),
        ...(data.playwrightActionDelayMin !== undefined
          ? { playwrightActionDelayMin: data.playwrightActionDelayMin }
          : {}),
        ...(data.playwrightActionDelayMax !== undefined
          ? { playwrightActionDelayMax: data.playwrightActionDelayMax }
          : {}),

        ...(data.playwrightProxyEnabled !== undefined
          ? { playwrightProxyEnabled: data.playwrightProxyEnabled }
          : {}),
        ...(data.playwrightProxyServer !== undefined
          ? { playwrightProxyServer: emptyToNull(data.playwrightProxyServer) }
          : {}),
        ...(data.playwrightProxyUsername !== undefined
          ? {
              playwrightProxyUsername: emptyToNull(
                data.playwrightProxyUsername
              ),
            }
          : {}),
        ...(proxyPasswordToSet
          ? { playwrightProxyPassword: proxyPasswordToSet }
          : {}),

        ...(data.playwrightEmulateDevice !== undefined
          ? { playwrightEmulateDevice: data.playwrightEmulateDevice }
          : {}),
        ...(data.playwrightDeviceName !== undefined
          ? { playwrightDeviceName: emptyToNull(data.playwrightDeviceName) }
          : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const errorId = randomUUID();

    if (error instanceof z.ZodError) {
      // ✅ FIX: use connectionId, NOT id
      console.warn("[integrations][connection][PUT] Invalid payload", {
        errorId,
        connectionId,
        issues: error.flatten(),
      });

      return NextResponse.json(
        {
          error: "Invalid payload",
          details: error.flatten(),
          errorId,
          connectionId,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      console.error(
        "[integrations][connection][PUT] Failed to update connection",
        {
          errorId,
          connectionId,
          message: error.message,
        }
      );

      return NextResponse.json(
        { error: error.message, errorId, connectionId },
        { status: 400 }
      );
    }

    console.error("[integrations][connection][PUT] Unknown error", {
      errorId,
      connectionId,
      error,
    });

    return NextResponse.json(
      { error: "An unknown error occurred", errorId, connectionId },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/integrations/connections/[id]
 * Delete a connection.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connectionId: string | null = null;

  try {
    const { id } = await params;
    connectionId = id;

    await prisma.integrationConnection.delete({ where: { id: connectionId } });

    return NextResponse.json({ ok: true, connectionId });
  } catch (error) {
    const errorId = randomUUID();
    console.error(
      "[integrations][connection][DELETE] Failed to delete connection",
      {
        errorId,
        connectionId,
        error,
      }
    );

    return NextResponse.json(
      { error: "Failed to delete connection", errorId, connectionId },
      { status: 400 }
    );
  }
}
