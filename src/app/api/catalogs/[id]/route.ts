export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCatalogRepository } from '@/features/products/server';
import { parseJsonBody } from '@/features/products/server';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';
import { removeUndefined } from '@/shared/utils';

const catalogUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional().nullable(),
  languageIds: z.array(z.string().trim().min(1)).optional(),
  defaultLanguageId: z.string().trim().min(1).optional(),
  priceGroupIds: z.array(z.string().trim().min(1)).optional(),
  defaultPriceGroupId: z.string().trim().min(1).optional(),
  isDefault: z.boolean().optional(),
});

/**
 * PUT /api/catalogs/[id]
 * Updates a catalog.
 */
async function PUT_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const { id } = params;
  if (!id) {
    throw badRequestError('Catalog id is required');
  }
  const parsed = await parseJsonBody(req, catalogUpdateSchema, {
    logPrefix: 'catalogs.PUT',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  if (!data.languageIds || data.languageIds.length === 0) {
    throw badRequestError('Select at least one language.', {
      field: 'languageIds',
    });
  }
  if (!data.defaultLanguageId || !data.languageIds.includes(data.defaultLanguageId)) {
    throw badRequestError(
      'Default language must be one of the selected languages.',
      { field: 'defaultLanguageId' }
    );
  }
  if (!data.priceGroupIds || data.priceGroupIds.length === 0) {
    throw badRequestError('Select at least one price group.', {
      field: 'priceGroupIds',
    });
  }
  if (
    !data.defaultPriceGroupId ||
    !data.priceGroupIds.includes(data.defaultPriceGroupId)
  ) {
    throw badRequestError(
      'Default price group must be one of the selected price groups.',
      { field: 'defaultPriceGroupId' }
    );
  }
  const catalogRepository = await getCatalogRepository();
  const catalog = await catalogRepository.updateCatalog(id, removeUndefined({
    name: data.name,
    description: data.description,
    isDefault: data.isDefault,
    languageIds: data.languageIds,
    defaultLanguageId: data.defaultLanguageId,
    priceGroupIds: data.priceGroupIds,
    defaultPriceGroupId: data.defaultPriceGroupId,
  }));
  if (!catalog) {
    throw notFoundError('Catalog not found', { catalogId: id });
  }
  return NextResponse.json(catalog);
}

/**
 * DELETE /api/catalogs/[id]
 * Deletes a catalog.
 */
async function DELETE_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const { id } = params;
  if (!id) {
    throw badRequestError('Catalog id is required');
  }
  const catalogRepository = await getCatalogRepository();
  await catalogRepository.deleteCatalog(id);
  return new Response(null, { status: 204 });
}

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, { source: 'catalogs.[id].PUT' });
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, { source: 'catalogs.[id].DELETE' });
