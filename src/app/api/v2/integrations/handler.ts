import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { integrationService } from '@/features/integrations/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const integrationSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
});

/**
 * GET /api/integrations
 * Fetches all integrations.
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const integrations = await integrationService.listIntegrations();
  return NextResponse.json(integrations, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * POST /api/integrations
 * Creates an integration.
 */
export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, integrationSchema, {
    logPrefix: 'integrations.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  const integration = await integrationService.upsertIntegration(data);
  return NextResponse.json(integration);
}
