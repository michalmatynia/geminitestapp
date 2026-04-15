import { type NextRequest, NextResponse } from 'next/server';
import { type z } from 'zod';

import { getValidationPatternRepository } from '@/features/products/server';
import { updateProductValidatorSettingsSchema as updateValidatorSettingsSchema } from '@/shared/contracts/products/validation';
import { type ProductValidationInstanceDenyBehaviorMap } from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { normalizeProductValidationInstanceDenyBehaviorMap } from '@/shared/lib/products/utils/validator-instance-behavior';

export { updateValidatorSettingsSchema };

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const repository = await getValidationPatternRepository();
  const [enabledByDefault, formatterEnabledByDefault, instanceDenyBehavior] = await Promise.all([
    repository.getEnabledByDefault(),
    repository.getFormatterEnabledByDefault(),
    repository.getInstanceDenyBehavior(),
  ]);
  return NextResponse.json({
    enabledByDefault,
    formatterEnabledByDefault,
    instanceDenyBehavior,
  });
}

export async function PUT_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as z.infer<typeof updateValidatorSettingsSchema>;
  const repository = await getValidationPatternRepository();
  let enabledByDefault: boolean;
  let formatterEnabledByDefault: boolean;
  let instanceDenyBehavior: ProductValidationInstanceDenyBehaviorMap;

  if (typeof body.enabledByDefault === 'boolean') {
    enabledByDefault = await repository.setEnabledByDefault(body.enabledByDefault);
  } else {
    enabledByDefault = await repository.getEnabledByDefault();
  }

  if (typeof body.formatterEnabledByDefault === 'boolean') {
    formatterEnabledByDefault = await repository.setFormatterEnabledByDefault(
      body.formatterEnabledByDefault
    );
  } else {
    formatterEnabledByDefault = await repository.getFormatterEnabledByDefault();
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
    formatterEnabledByDefault,
    instanceDenyBehavior,
  });
}
