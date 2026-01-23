import { NextResponse } from "next/server";
import { z } from "zod";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { parseJsonBody } from "@/lib/api/parse-json";

const integrationSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
});

/**
 * GET /api/integrations
 * Fetches all integrations.
 */
export async function GET(req: Request) {
  try {
    const repo = await getIntegrationRepository();
    const integrations = await repo.listIntegrations();
    return NextResponse.json(integrations);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "integrations.GET",
      fallbackMessage: "Failed to fetch integrations",
    });
  }
}

/**
 * POST /api/integrations
 * Creates an integration.
 */
export async function POST(req: Request) {
  try {
    const parsed = await parseJsonBody(req, integrationSchema, {
      logPrefix: "integrations.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;
    const repo = await getIntegrationRepository();
    const integration = await repo.upsertIntegration(data);
    return NextResponse.json(integration);
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "integrations.POST",
      fallbackMessage: "Failed to create integration",
    });
  }
}
