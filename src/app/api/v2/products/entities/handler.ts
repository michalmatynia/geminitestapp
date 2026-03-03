import { NextRequest, NextResponse } from 'next/server';
import {
  getCatalogRepository,
  getProductDataProvider,
  type CatalogUpdateInput,
} from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import prisma from '@/shared/lib/db/prisma';

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
  const data = (await req.json()) as Record<string, unknown>;

  if (type === 'catalogs') {
    const provider = await getProductDataProvider();
    const repo = await getCatalogRepository(provider);
    return NextResponse.json(
      await repo.updateCatalog(id, data as unknown as CatalogUpdateInput)
    );
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
