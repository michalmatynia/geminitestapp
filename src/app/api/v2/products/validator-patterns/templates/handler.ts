import { NextRequest } from 'next/server';
import { POST_handler as postCategory } from '../../../../products/validator-patterns/templates/name-segment-category/handler';
import { POST_handler as postDimensions } from '../../../../products/validator-patterns/templates/name-segment-dimensions/handler';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export async function POST_validator_template_handler(
  req: NextRequest, 
  ctx: ApiHandlerContext,
  params: { type: string }
): Promise<Response> {
  const { type } = params;
  if (type === 'name-segment-category') return postCategory(req, ctx);
  if (type === 'name-segment-dimensions') return postDimensions(req, ctx);
  throw badRequestError(`Invalid validator template type: ${type}`);
}
