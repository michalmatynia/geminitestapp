export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getValidationPatternRepository } from '@/features/products/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

const updateValidatorSettingsSchema = z.object({
  enabledByDefault: z.boolean(),
});

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const repository = await getValidationPatternRepository();
  const enabledByDefault = await repository.getEnabledByDefault();
  return NextResponse.json({ enabledByDefault });
}

async function PUT_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as z.infer<typeof updateValidatorSettingsSchema>;
  const repository = await getValidationPatternRepository();
  const enabledByDefault = await repository.setEnabledByDefault(body.enabledByDefault);
  return NextResponse.json({ enabledByDefault });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'products.validator-settings.GET' },
);

export const PUT = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => PUT_handler(req, ctx),
  {
    source: 'products.validator-settings.PUT',
    parseJsonBody: true,
    bodySchema: updateValidatorSettingsSchema,
  },
);
