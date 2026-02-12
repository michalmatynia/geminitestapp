export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getParameterRepository } from '@/features/products/server';
import { badRequestError, conflictError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

export const revalidate = 300;

const productParameterCreateSchema = z.object({
  name_en: z.string().min(1, 'English name is required'),
  name_pl: z.string().optional().nullable(),
  name_de: z.string().optional().nullable(),
  catalogId: z.string().min(1, 'Catalog ID is required'),
});

/**
 * GET /api/products/parameters
 * Fetches all product parameters (flat list).
 * Query params:
 * - catalogId: Filter by catalog (required)
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const catalogId = searchParams.get('catalogId');

  if (!catalogId) {
    throw badRequestError('catalogId query parameter is required');
  }

  const repository = await getParameterRepository();
  const parameters = await repository.listParameters({ catalogId });
  
  return NextResponse.json(parameters);
}

/**
 * POST /api/products/parameters
 * Creates a new product parameter.
 */
async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as z.infer<typeof productParameterCreateSchema>;
  const { name_en, catalogId } = data;

  const repository = await getParameterRepository();
  const existing = await repository.findByName(catalogId, name_en);
  
  if (existing) {
    throw conflictError(
      'A parameter with this name already exists in this catalog',
      { name_en, catalogId }
    );
  }

  const parameter = await repository.createParameter({
    name_en,
    catalogId,
    ...(data.name_pl !== undefined && { name_pl: data.name_pl }),
    ...(data.name_de !== undefined && { name_de: data.name_de }),
  });

  return NextResponse.json(parameter, { status: 201 });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'products.parameters.GET' });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'products.parameters.POST', parseJsonBody: true, bodySchema: productParameterCreateSchema });
