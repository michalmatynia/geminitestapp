export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getIntegrationRepository } from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const integrationSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1)
});

/**
 * GET /api/integrations
 * Fetches all integrations.
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const repo = await getIntegrationRepository();
    const integrations = await repo.listIntegrations();
    return NextResponse.json(integrations);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "integrations.GET",
      fallbackMessage: "Failed to fetch integrations"
    });
  }
}

/**
 * POST /api/integrations
 * Creates an integration.
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const parsed = await parseJsonBody(req, integrationSchema, {
      logPrefix: "integrations.POST"
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
      fallbackMessage: "Failed to create integration"
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "integrations.GET", requireCsrf: false });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "integrations.POST", requireCsrf: false });
