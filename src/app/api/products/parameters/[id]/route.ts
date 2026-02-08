export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getParameterRepository } from '@/features/products/server';
import { conflictError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

const productParameterUpdateSchema = z.object({
  name_en: z.string().min(1).optional(),
  name_pl: z.string().optional().nullable(),
  name_de: z.string().optional().nullable(),
  catalogId: z.string().min(1).optional(),
});

/**
 * PUT /api/products/parameters/[id]
 * Updates a product parameter.
 */
async function PUT_handler(_req: NextRequest, ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const id = params.id;
  const data = productParameterUpdateSchema.parse(ctx.body);
  const { name_en, catalogId } = data;

  const repository = await getParameterRepository();
  const current = await repository.getParameterById(id);
  
  if (!current) {
    throw notFoundError('Parameter not found', { parameterId: id });
  }
  
  const nextCatalogId = catalogId ?? current.catalogId;
  
  if (name_en !== undefined) {
    const existing = await repository.findByName(nextCatalogId, name_en);
    if (existing && existing.id !== id) {
      throw conflictError(
        'A parameter with this name already exists in this catalog',
        { name_en, catalogId: nextCatalogId }
      );
    }
  }

  const parameter = await repository.updateParameter(id, {
    ...(data.name_en !== undefined && { name_en: data.name_en }),
    ...(data.name_pl !== undefined && { name_pl: data.name_pl }),
    ...(data.name_de !== undefined && { name_de: data.name_de }),
  });

  return NextResponse.json(parameter);
}

/**
 * DELETE /api/products/parameters/[id]
 * Deletes a product parameter.
 */
async function DELETE_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const repository = await getParameterRepository();
  await repository.deleteParameter(params.id);
  return NextResponse.json({ success: true });
}

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, { 
  source: 'products.parameters.[id].PUT',
  parseJsonBody: true,
  bodySchema: productParameterUpdateSchema,
});
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, { 
  source: 'products.parameters.[id].DELETE' 
});
