import { NextRequest } from 'next/server';
import { GET_handler as getProducers, POST_handler as postProducers } from '../../products/producers/handler';
import { GET_handler as getTags, POST_handler as postTags } from '../../products/tags/handler';
import { GET_handler as getParameters, POST_handler as postParameters } from '../../products/parameters/handler';
import { GET_handler as getSimpleParameters, POST_handler as postSimpleParameters } from '../../products/simple-parameters/handler';
import { getPriceGroupsHandler, postPriceGroupsHandler } from '../../price-groups/handler';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export async function GET_products_metadata_handler(
  req: NextRequest, 
  ctx: ApiHandlerContext,
  params: { type: string }
): Promise<Response> {
  const { type } = params;
  if (type === 'producers') return getProducers(req, ctx);
  if (type === 'tags') return getTags(req, ctx);
  if (type === 'parameters') return getParameters(req, ctx);
  if (type === 'simple-parameters') return getSimpleParameters(req, ctx);
  if (type === 'price-groups') return getPriceGroupsHandler(req, ctx);
  throw badRequestError(`Invalid products metadata type: ${type}`);
}

export async function POST_products_metadata_handler(
  req: NextRequest, 
  ctx: ApiHandlerContext,
  params: { type: string }
): Promise<Response> {
  const { type } = params;
  if (type === 'producers') return postProducers(req, ctx);
  if (type === 'tags') return postTags(req, ctx);
  if (type === 'parameters') return postParameters(req, ctx);
  if (type === 'simple-parameters') return postSimpleParameters(req, ctx);
  if (type === 'price-groups') return postPriceGroupsHandler(req, ctx);
  throw badRequestError(`Invalid products metadata type: ${type}`);
}
