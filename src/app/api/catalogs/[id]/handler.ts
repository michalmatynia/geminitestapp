import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCatalogRepository } from '@/features/products/server';
import { parseJsonBody } from '@/features/products/server';
import { normalizeCatalogLanguageSelection } from '@/shared/lib/products/services/catalog-language-normalization';
import { getProductDataProvider } from '@/shared/lib/products/services/product-provider';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
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
export async function PUT_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
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
  const provider = await getProductDataProvider();
  const normalizedLanguages = await normalizeCatalogLanguageSelection({
    provider,
    languageIds: data.languageIds ?? [],
    defaultLanguageId: data.defaultLanguageId ?? null,
  });

  if (normalizedLanguages.languageIds.length === 0) {
    throw badRequestError('Select at least one language.', {
      field: 'languageIds',
    });
  }
  if (
    !normalizedLanguages.defaultLanguageId ||
    !normalizedLanguages.languageIds.includes(normalizedLanguages.defaultLanguageId)
  ) {
    throw badRequestError('Default language must be one of the selected languages.', {
      field: 'defaultLanguageId',
    });
  }
  if (!data.priceGroupIds || data.priceGroupIds.length === 0) {
    throw badRequestError('Select at least one price group.', {
      field: 'priceGroupIds',
    });
  }
  if (!data.defaultPriceGroupId || !data.priceGroupIds.includes(data.defaultPriceGroupId)) {
    throw badRequestError('Default price group must be one of the selected price groups.', {
      field: 'defaultPriceGroupId',
    });
  }
  const catalogRepository = await getCatalogRepository(provider);
  const catalog = await catalogRepository.updateCatalog(
    id,
    removeUndefined({
      name: data.name,
      description: data.description,
      isDefault: data.isDefault,
      languageIds: normalizedLanguages.languageIds,
      defaultLanguageId: normalizedLanguages.defaultLanguageId,
      priceGroupIds: data.priceGroupIds,
      defaultPriceGroupId: data.defaultPriceGroupId,
    })
  );
  if (!catalog) {
    throw notFoundError('Catalog not found', { catalogId: id });
  }
  return NextResponse.json(catalog);
}

/**
 * DELETE /api/catalogs/[id]
 * Deletes a catalog.
 */
export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const { id } = params;
  if (!id) {
    throw badRequestError('Catalog id is required');
  }
  const catalogRepository = await getCatalogRepository();
  await catalogRepository.deleteCatalog(id);
  return new Response(null, { status: 204 });
}
