import { NextResponse } from "next/server";
import { getIntegrationRepository } from "@/lib/services/integration-repository";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; connectionId: string }> }
) {
  let integrationId: string | null = null;
  let connectionId: string | null = null;

  try {
    const { id, connectionId: connId } = await params;
    integrationId = id;
    connectionId = connId;

    const repo = await getIntegrationRepository();
    const integration = await repo.getIntegrationById(id);

    if (!integration || integration.slug !== "allegro") {
      return NextResponse.json(
        { error: "Allegro integration not found." },
        { status: 404 }
      );
    }

    await repo.updateConnection(connId, {
      allegroAccessToken: null,
      allegroRefreshToken: null,
      allegroTokenType: null,
      allegroScope: null,
      allegroExpiresAt: null,
      allegroTokenUpdatedAt: null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[allegro][disconnect] Failed to disconnect", {
      integrationId,
      connectionId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to disconnect Allegro." },
      { status: 500 }
    );
  }
}
