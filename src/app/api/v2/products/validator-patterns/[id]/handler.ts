import { type NextRequest, NextResponse } from 'next/server';

import { getValidationPatternRepository } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';
import { invalidateValidationPatternRuntimeCache } from '@/shared/lib/products/services/validation-pattern-runtime-cache';
import {
  buildValidatorPatternUpdateInput,
  resolveValidatorPatternUpdateState,
  updatePatternSchema,
} from './handler.helpers';
export { updatePatternSchema };


export async function putValidatorPatternByIdHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const repository = await getValidationPatternRepository();
  const current = await repository.getPatternById(params.id);
  if (current === null) {
    throw notFoundError('Validation pattern not found', { patternId: params.id });
  }

  const body = updatePatternSchema.parse(ctx.body);
  const state = resolveValidatorPatternUpdateState(body, current);
  const input = buildValidatorPatternUpdateInput(body, state);

  const updated = await repository.updatePattern(
    params.id,
    input,
    {
      semanticAuditSource: 'manual_save',
    }
  );

  invalidateValidationPatternRuntimeCache();

  return NextResponse.json(updated);
}

export async function deleteValidatorPatternByIdHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const repository = await getValidationPatternRepository();
  await repository.deletePattern(params.id);
  invalidateValidationPatternRuntimeCache();
  return new Response(null, { status: 204 });
}
