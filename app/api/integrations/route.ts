import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getIntegrationRepository } from "@/lib/services/integration-repository";

const integrationSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
});

/**
 * GET /api/integrations
 * Fetches all integrations.
 */
export async function GET() {
  try {
    const repo = await getIntegrationRepository();
    const integrations = await repo.listIntegrations();
    return NextResponse.json(integrations);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[integrations][GET] Failed to fetch integrations", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to fetch integrations", errorId },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations
 * Creates an integration.
 */
export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      const errorId = randomUUID();
      console.error("[integrations][POST] Failed to parse JSON body", {
        errorId,
        error,
      });
      return NextResponse.json(
        { error: "Invalid JSON payload", errorId },
        { status: 400 }
      );
    }
    const data = integrationSchema.parse(body);
    const repo = await getIntegrationRepository();
    const integration = await repo.upsertIntegration(data);
    return NextResponse.json(integration);
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof z.ZodError) {
      console.warn("[integrations][POST] Invalid payload", {
        errorId,
        issues: error.flatten(),
      });
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten(), errorId },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      console.error("[integrations][POST] Failed to create integration", {
        errorId,
        message: error.message,
      });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[integrations][POST] Unknown error", { errorId, error });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId },
      { status: 400 }
    );
  }
}
