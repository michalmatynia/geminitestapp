import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { encryptSecret } from "@/lib/utils/encryption";

const connectionSchema = z.object({
  name: z.string().trim().min(1),
  username: z.string().trim().min(1),
  password: z.string().trim().min(1),
});

/**
 * GET /api/integrations/[id]/connections
 * Fetches connections for an integration.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let integrationId: string | null = null;
  try {
    const { id } = await params;
    integrationId = id;
    const connections = await prisma.integrationConnection.findMany({
      where: { integrationId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(
      connections.map((connection) => ({
        id: connection.id,
        integrationId: connection.integrationId,
        name: connection.name,
        username: connection.username,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
        hasPlaywrightStorageState: Boolean(connection.playwrightStorageState),
        playwrightStorageStateUpdatedAt: connection.playwrightStorageStateUpdatedAt,
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
      }))
    );
  } catch (error) {
    const errorId = randomUUID();
    console.error("[integrations][connections][GET] Failed to fetch connections", {
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
 * Creates a connection for an integration.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      const errorId = randomUUID();
      console.error("[integrations][connections][POST] Failed to parse JSON body", {
        errorId,
        integrationId: id,
        error,
      });
      return NextResponse.json(
        { error: "Invalid JSON payload", errorId, integrationId: id },
        { status: 400 }
      );
    }
    const data = connectionSchema.parse(body);
    const existing = await prisma.integrationConnection.findFirst({
      where: { integrationId: id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Only one connection is allowed for this integration." },
        { status: 400 }
      );
    }
    const connection = await prisma.integrationConnection.create({
      data: {
        integrationId: id,
        name: data.name,
        username: data.username,
        password: encryptSecret(data.password),
        playwrightHeadless: true,
      },
    });
    return NextResponse.json(connection);
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof z.ZodError) {
      console.warn("[integrations][connections][POST] Invalid payload", {
        errorId,
        integrationId: id,
        issues: error.flatten(),
      });
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten(), errorId, integrationId: id },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      console.error("[integrations][connections][POST] Failed to create connection", {
        errorId,
        integrationId: id,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId, integrationId: id },
        { status: 400 }
      );
    }
    console.error("[integrations][connections][POST] Unknown error", {
      errorId,
      integrationId: id,
      error,
    });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId, integrationId: id },
      { status: 400 }
    );
  }
}
