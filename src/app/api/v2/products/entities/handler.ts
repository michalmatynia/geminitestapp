import { NextRequest, NextResponse } from 'next/server';

import { getCatalogsHandler, postCatalogsHandler } from '@/features/products/api/catalogs/handlers';
import {
  getCatalogRepository,
  getProductDataProvider,
} from '@/features/products/server';
import { updateCatalogSchema } from '@/shared/contracts/products/catalogs';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';
import prisma from '@/shared/lib/db/prisma';

export async function GET_products_entities_handler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { type: string }
): Promise<Response> {
  const { type } = params;

  if (type === 'catalogs') {
    return getCatalogsHandler(req, ctx);
  }

  throw badRequestError(`Invalid products entity type for GET: ${type}`);
}

export async function POST_products_entities_handler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { type: string }
): Promise<Response> {
  const { type } = params;

  if (type === 'catalogs') {
    return postCatalogsHandler(req, ctx);
  }

  throw badRequestError(`Invalid products entity type for POST: ${type}`);
}

export async function GET_products_entity_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string; id: string }
): Promise<Response> {
  const { type, id } = params;

  if (type === 'drafts') {
    const draft = await prisma.productDraft.findUnique({
      where: { id },
    });
    if (!draft) throw notFoundError(`Draft not found: ${id}`);
    return NextResponse.json(draft);
  }

  throw badRequestError(`Invalid products entity type for GET: ${type}`);
}

export async function PUT_products_entity_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string; id: string }
): Promise<Response> {
  const { type, id } = params;
  let payload = _ctx.body;
  if (payload === undefined) {
    const parsed = await parseObjectJsonBody(req, {
      logPrefix: 'products.entities.[type].[id].PUT',
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    payload = parsed.data;
  }

  if (type === 'catalogs') {
    const validated = updateCatalogSchema.safeParse(payload);
    if (!validated.success) {
      throw badRequestError('Invalid catalog payload.', {
        errors: validated.error.flatten(),
      });
    }
    const provider = await getProductDataProvider();
    const repo = await getCatalogRepository(provider);
    return NextResponse.json(await repo.updateCatalog(id, validated.data));
  }

  throw badRequestError(`Invalid products entity type for PUT: ${type}`);
}

export async function DELETE_products_entity_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string; id: string }
): Promise<Response> {
  const { type, id } = params;

  if (type === 'catalogs') {
    const provider = await getProductDataProvider();
    const repo = await getCatalogRepository(provider);
    await repo.deleteCatalog(id);
    return new Response(null, { status: 204 });
  }

  if (type === 'drafts') {
    await prisma.productDraft.delete({
      where: { id },
    });
    return new Response(null, { status: 204 });
  }

  throw badRequestError(`Invalid products entity type for DELETE: ${type}`);
}
