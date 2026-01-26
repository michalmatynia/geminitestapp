import { NextResponse } from "next/server";
import { z } from "zod";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/api/parse-json";
import { apiHandler } from "@/lib/api/api-handler";

const integrationSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
});

/**
 * GET /api/integrations
 * Fetches all integrations.
 */
async function GET_handler(req: Request) {
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
async function POST_handler(req: Request) {
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

export const GET = apiHandler(GET_handler, { source: "integrations.GET" });
export const POST = apiHandler(POST_handler, { source: "integrations.POST" });
