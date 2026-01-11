import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { encryptSecret } from "@/lib/utils/encryption";

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
});

/**
 * PUT /api/integrations/connections/[id]
 * Updates an integration connection.
 */
export async function PUT(
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
      console.error("[integrations][connection][PUT] Failed to parse JSON body", {
        errorId,
        connectionId: id,
        error,
      });
      return NextResponse.json(
        { error: "Invalid JSON payload", errorId, connectionId: id },
        { status: 400 }
      );
    }
    const data = connectionSchema.parse(body);
    const connection = await prisma.integrationConnection.update({
      where: { id },
      data: {
        name: data.name,
        username: data.username,
        ...(data.password
          ? { password: encryptSecret(data.password) }
          : {}),
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
      },
    });
    return NextResponse.json({
      id: connection.id,
      integrationId: connection.integrationId,
      name: connection.name,
      username: connection.username,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
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
    const errorId = randomUUID();
    if (error instanceof z.ZodError) {
      console.warn("[integrations][connection][PUT] Invalid payload", {
        errorId,
        connectionId: id,
        issues: error.flatten(),
      });
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten(), errorId, connectionId: id },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      console.error("[integrations][connection][PUT] Failed to update connection", {
        errorId,
        connectionId: id,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId, connectionId: id },
        { status: 400 }
      );
    }
    console.error("[integrations][connection][PUT] Unknown error", {
      errorId,
      connectionId: id,
      error,
    });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId, connectionId: id },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/integrations/connections/[id]
 * Deletes an integration connection.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.integrationConnection.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      console.error("[integrations][connection][DELETE] Failed to delete connection", {
        errorId,
        connectionId: id,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId, connectionId: id },
        { status: 400 }
      );
    }
    console.error("[integrations][connection][DELETE] Unknown error", {
      errorId,
      connectionId: id,
      error,
    });
    return NextResponse.json(
      { error: "Failed to delete connection", errorId, connectionId: id },
      { status: 500 }
    );
  }
}
