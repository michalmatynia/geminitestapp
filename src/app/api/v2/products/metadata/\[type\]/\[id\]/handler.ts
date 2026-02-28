import { NextRequest } from 'next/server';
import { PUT_handler as putPriceGroup, DELETE_handler as deletePriceGroup } from '../../../../price-groups/[id]/handler';
import { DELETE_handler as deleteSimpleParameter } from '../../../../products/simple-parameters/[id]/handler';
import { GET_handler as getProducer, PUT_handler as putProducer, DELETE_handler as deleteProducer } from '../../../../products/producers/[id]/handler';
import { GET_handler as getTag, PUT_handler as putTag, DELETE_handler as deleteTag } from '../../../../products/tags/[id]/handler';
import { GET_handler as getParameter, PUT_handler as putParameter, DELETE_handler as deleteParameter } from '../../../../products/parameters/[id]/handler';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export async function GET_products_metadata_id_handler(
  req: NextRequest, 
  ctx: ApiHandlerContext,
  params: { type: string, id: string }
): Promise<Response> {
  const { type, id } = params;
  const p = { id };
  if (type === 'producers') return getProducer(req, ctx, p);
  if (type === 'tags') return getTag(req, ctx, p);
  if (type === 'parameters') return getParameter(req, ctx, p);
  throw badRequestError(`Invalid products metadata type for GET: ${type}`);
}

export async function PUT_products_metadata_id_handler(
  req: NextRequest, 
  ctx: ApiHandlerContext,
  params: { type: string, id: string }
): Promise<Response> {
  const { type, id } = params;
  const p = { id };
  if (type === 'producers') return putProducer(req, ctx, p);
  if (type === 'tags') return putTag(req, ctx, p);
  if (type === 'parameters') return putParameter(req, ctx, p);
  if (type === 'price-groups') return putPriceGroup(req, ctx, p);
  throw badRequestError(`Invalid products metadata type for PUT: ${type}`);
}

export async function DELETE_products_metadata_id_handler(
  req: NextRequest, 
  ctx: ApiHandlerContext,
  params: { type: string, id: string }
): Promise<Response> {
  const { type, id } = params;
  const p = { id };
  if (type === 'producers') return deleteProducer(req, ctx, p);
  if (type === 'tags') return deleteTag(req, ctx, p);
  if (type === 'parameters') return deleteParameter(req, ctx, p);
  if (type === 'price-groups') return deletePriceGroup(req, ctx, p);
  if (type === 'simple-parameters') return deleteSimpleParameter(req, ctx, p);
  throw badRequestError(`Invalid products metadata type for DELETE: ${type}`);
}
