import { NextRequest } from 'next/server';
import { PUT_handler as putCatalog, DELETE_handler as deleteCatalog } from '../../../../catalogs/[id]/handler';
import { GET_handler as getDraft, DELETE_handler as deleteDraft } from '../../../../drafts/[id]/handler';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export async function GET_products_entity_handler(
  req: NextRequest, 
  ctx: ApiHandlerContext,
  params: { type: string, id: string }
): Promise<Response> {
  const { type, id } = params;
  if (type === 'drafts') return getDraft(req, ctx, { id });
  throw badRequestError(`Invalid products entity type for GET: ${type}`);
}

export async function PUT_products_entity_handler(
  req: NextRequest, 
  ctx: ApiHandlerContext,
  params: { type: string, id: string }
): Promise<Response> {
  const { type, id } = params;
  if (type === 'catalogs') return putCatalog(req, ctx, { id });
  throw badRequestError(`Invalid products entity type for PUT: ${type}`);
}

export async function DELETE_products_entity_handler(
  req: NextRequest, 
  ctx: ApiHandlerContext,
  params: { type: string, id: string }
): Promise<Response> {
  const { type, id } = params;
  if (type === 'catalogs') return deleteCatalog(req, ctx, { id });
  if (type === 'drafts') return deleteDraft(req, ctx, { id });
  throw badRequestError(`Invalid products entity type for DELETE: ${type}`);
}
