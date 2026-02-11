export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getValidationPatternRepository } from '@/features/products/server';
import { normalizeProductValidationInstanceDenyBehaviorMap } from '@/features/products/utils/validator-instance-behavior';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import type { ProductValidationInstanceDenyBehaviorMap } from '@/shared/types/domain/products';

const instanceDenyBehaviorSchema = z.object({
  draft_template: z.enum(['ask_again', 'mute_session']),
  product_create: z.enum(['ask_again', 'mute_session']),
  product_edit: z.enum(['ask_again', 'mute_session']),
});

const updateValidatorSettingsSchema = z.object({
  enabledByDefault: z.boolean().optional(),
  instanceDenyBehavior: instanceDenyBehaviorSchema.optional(),
});

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const repository = await getValidationPatternRepository();
  const [enabledByDefault, instanceDenyBehavior] = await Promise.all([
    repository.getEnabledByDefault(),
    repository.getInstanceDenyBehavior(),
  ]);
  return NextResponse.json({
    enabledByDefault,
    instanceDenyBehavior,
  });
}

async function PUT_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as z.infer<typeof updateValidatorSettingsSchema>;
  const repository = await getValidationPatternRepository();
  let enabledByDefault: boolean;
  let instanceDenyBehavior: ProductValidationInstanceDenyBehaviorMap;

  if (typeof body.enabledByDefault === 'boolean') {
    enabledByDefault = await repository.setEnabledByDefault(body.enabledByDefault);
  } else {
    enabledByDefault = await repository.getEnabledByDefault();
  }

  if (body.instanceDenyBehavior) {
    instanceDenyBehavior = await repository.setInstanceDenyBehavior(
      normalizeProductValidationInstanceDenyBehaviorMap(body.instanceDenyBehavior)
    );
  } else {
    instanceDenyBehavior = await repository.getInstanceDenyBehavior();
  }

  return NextResponse.json({
    enabledByDefault,
    instanceDenyBehavior,
  });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  {
    source: 'products.validator-settings.GET',
    cacheControl: 'no-store',
  },
);

export const PUT = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => PUT_handler(req, ctx),
  {
    source: 'products.validator-settings.PUT',
    parseJsonBody: true,
    bodySchema: updateValidatorSettingsSchema,
  },
);
