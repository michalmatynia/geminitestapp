import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { decryptSecret } from "@/lib/utils/encryption";
import { callBaseApi } from "@/lib/services/imports/base-client";

const requestSchema = z.object({
  method: z.string().trim().min(1),
  parameters: z.record(z.unknown()).optional(),
});

/**
 * POST /api/integrations/[id]/connections/[connectionId]/base/request
 * Proxy Base.com API requests using the stored token.
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

    const repo = await getIntegrationRepository();
    const integration = await repo.getIntegrationById(id);
    if (!integration || integration.slug !== "baselinker") {
      return NextResponse.json(
        { error: "Base.com integration not found.", errorId },
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

    let baseToken: string | null = null;
    if (connection.baseApiToken) {
      baseToken = decryptSecret(connection.baseApiToken);
    } else if (connection.password) {
      baseToken = decryptSecret(connection.password);
    }

    if (!baseToken) {
      return NextResponse.json(
        { error: "No Base API token configured.", errorId },
        { status: 400 }
      );
    }

    const payload = await callBaseApi(
      baseToken,
      data.method,
      data.parameters ?? {}
    );

    return NextResponse.json({ data: payload });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[base][request] Failed to proxy request", {
      errorId,
      message,
    });
    return NextResponse.json(
      { error: message, errorId },
      { status: 500 }
    );
  }
}
