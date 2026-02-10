export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { integrationService } from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const integrationSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1)
});

/**
 * GET /api/integrations
 * Fetches all integrations.
 */
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const integrations = await integrationService.listIntegrations();
  return NextResponse.json(integrations);
}

/**
 * POST /api/integrations
 * Creates an integration.
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, integrationSchema, {
    logPrefix: 'integrations.POST'
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  const integration = await integrationService.upsertIntegration(data);
  return NextResponse.json(integration);
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'integrations.GET', requireCsrf: false });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'integrations.POST', requireCsrf: false });
