import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { decryptSecret } from "@/lib/utils/encryption";

/**
 * GET /api/integrations/connections/[id]/session
 * Returns stored Playwright session cookies for a connection.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connectionId: string | null = null;

  try {
    const { id } = await params;
    connectionId = id;

    const connection = await prisma.integrationConnection.findFirst({
      where: { id: connectionId },
    });

    if (!connection) {
      return NextResponse.json(
        {
          error: "Connection not found",
          errorId: randomUUID(),
          connectionId,
        },
        { status: 404 }
      );
    }

    if (!connection.playwrightStorageState) {
      return NextResponse.json(
        {
          error: "No stored Playwright session.",
          errorId: randomUUID(),
          connectionId,
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
      console.error(
        "[integrations][connection][session][GET] Failed to load session",
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

    console.error("[integrations][connection][session][GET] Unknown error", {
      errorId,
      connectionId,
      error,
    });

    return NextResponse.json(
      { error: "Failed to load session", errorId, connectionId },
      { status: 500 }
    );
  }
}
