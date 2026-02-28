import { NextRequest, NextResponse } from 'next/server';
import { getValidationPatternRepository } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export async function POST_validator_template_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string }
): Promise<Response> {
  const { type } = params;
  const repo = await getValidationPatternRepository();

  if (type === 'name-segment-category') {
    const pattern = await repo.createPattern({
      label: 'Name Segment: Category',
      target: 'name',
      regex: '^\\[.*\\]',
      message: 'Product name must start with a category in brackets.',
      severity: 'error',
      enabled: true,
    });
    return NextResponse.json(pattern);
  }

  if (type === 'name-segment-dimensions') {
    const pattern = await repo.createPattern({
      label: 'Name Segment: Dimensions',
      target: 'name',
      regex: '\\d+x\\d+',
      message: 'Product name must contain dimensions.',
      severity: 'warning',
      enabled: true,
    });
    return NextResponse.json(pattern);
  }

  throw badRequestError(`Invalid validator template type: ${type}`);
}
