import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { decryptSecret } from "@/lib/utils/encryption";

/**
 * GET /api/integrations/connections/[id]/session
 * Returns stored Playwright session cookies for a connection.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const connection = await prisma.integrationConnection.findFirst({
      where: { id },
    });
    if (!connection) {
      return NextResponse.json(
        { error: "Connection not found", errorId: randomUUID(), connectionId: id },
        { status: 404 }
      );
    }
    if (!connection.playwrightStorageState) {
      return NextResponse.json(
        {
          error: "No stored Playwright session.",
          errorId: randomUUID(),
          connectionId: id,
        },
        { status: 404 }
      );
    }

    const decrypted = decryptSecret(connection.playwrightStorageState);
    const storageState = JSON.parse(decrypted) as {
      cookies?: unknown[];
      origins?: unknown[];
    };

    return NextResponse.json({
      cookies: storageState.cookies ?? [],
      origins: storageState.origins ?? [],
      updatedAt: connection.playwrightStorageStateUpdatedAt,
    });
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      console.error("[integrations][connection][session][GET] Failed to load session", {
        errorId,
        connectionId: id,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId, connectionId: id },
        { status: 400 }
      );
    }
    console.error("[integrations][connection][session][GET] Unknown error", {
      errorId,
      connectionId: id,
      error,
    });
    return NextResponse.json(
      { error: "Failed to load session", errorId, connectionId: id },
      { status: 500 }
    );
  }
}
