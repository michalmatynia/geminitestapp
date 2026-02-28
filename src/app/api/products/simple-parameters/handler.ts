import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createSimpleParameter,
  listSimpleParameters,
} from '@/features/products/services/simple-parameter-service';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export const productSimpleParameterCreateSchema = z.object({
  name_en: z.string().trim().min(1, 'English name is required'),
  name_pl: z.string().trim().optional().nullable(),
  name_de: z.string().trim().optional().nullable(),
  catalogId: z.string().trim().min(1, 'Catalog ID is required'),
});

/**
 * GET /api/products/simple-parameters
 * Fetches simple product parameters for a catalog.
 * Query params:
 * - catalogId: Filter by catalog (required)
 * - search: Optional search phrase
 */
export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const catalogId = searchParams.get('catalogId')?.trim() ?? '';
  const search = searchParams.get('search')?.trim() ?? '';

  if (!catalogId) {
    throw badRequestError('catalogId query parameter is required');
  }

  const parameters = await listSimpleParameters({
    catalogId,
    ...(search ? { search } : {}),
  });
  return NextResponse.json(parameters);
}

/**
 * POST /api/products/simple-parameters
 * Creates a new simple product parameter.
 */
export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as z.infer<typeof productSimpleParameterCreateSchema>;
  const created = await createSimpleParameter({
    name_en: data.name_en,
    catalogId: data.catalogId,
    ...(data.name_pl !== undefined ? { name_pl: data.name_pl } : {}),
    ...(data.name_de !== undefined ? { name_de: data.name_de } : {}),
  });
  return NextResponse.json(created, { status: 201 });
}
