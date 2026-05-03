import { type NextRequest, NextResponse } from 'next/server';
import { type z } from 'zod';

import { getValidationPatternRepository } from '@/features/products/server';
import { createProductValidationPatternSchema as createPatternSchema } from '@/shared/contracts/products/validation';
export { createPatternSchema };
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  invalidateValidationPatternRuntimeCache,
  listValidationPatternsCached,
} from '@/shared/lib/products/services/validation-pattern-runtime-cache';
import {
  buildValidatorPatternCreateInput,
  resolveValidatorPatternCreateState,
} from './handler.helpers';


export async function getValidatorPatternsHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  return NextResponse.json(await listValidationPatternsCached());
}

export async function postValidatorPatternsHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as z.infer<typeof createPatternSchema>;
  
  const state = resolveValidatorPatternCreateState(body);
  const input = buildValidatorPatternCreateInput({ body, state });

  const repository = await getValidationPatternRepository();
  const pattern = await repository.createPattern(input, {
    semanticAuditSource: 'manual_save',
  });

  invalidateValidationPatternRuntimeCache();

  return NextResponse.json(pattern, { status: 201 });
}
