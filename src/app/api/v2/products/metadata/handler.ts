import { NextRequest, NextResponse } from 'next/server';
import { 
  getProducerRepository,
  getTagRepository,
  getParameterRepository,
} from '@/features/products/server';
import { listSimpleParameters } from '@/shared/lib/products/services/simple-parameter-service';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export async function GET_products_metadata_handler(
  _req: NextRequest, 
  _ctx: ApiHandlerContext,
  params: { type: string }
): Promise<Response> {
  const { type } = params;
  const searchParams = _req.nextUrl.searchParams;
  const catalogId = searchParams.get('catalogId') || '';

  if (type === 'producers') {
    const repo = await getProducerRepository();
    return NextResponse.json(await repo.listProducers({}));
  }
  if (type === 'tags') {
    const repo = await getTagRepository();
    return NextResponse.json(await repo.listTags({}));
  }
  if (type === 'parameters') {
    const repo = await getParameterRepository();
    return NextResponse.json(await repo.listParameters({}));
  }
  if (type === 'simple-parameters') {
    if (!catalogId) throw badRequestError('catalogId is required for simple-parameters');
    return NextResponse.json(await listSimpleParameters({ catalogId }));
  }
  // Price groups handled by separate route for now if missing
  throw badRequestError(`Invalid products metadata type: ${type}`);
}

export async function POST_products_metadata_handler(
  _req: NextRequest, 
  _ctx: ApiHandlerContext,
  params: { type: string }
): Promise<Response> {
  const { type } = params;
  // Implement POST logic if needed, currently fallback to error
  throw badRequestError(`POST not implemented for products metadata type: ${type}`);
}
