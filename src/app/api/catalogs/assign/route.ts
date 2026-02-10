export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCatalogRepository } from '@/features/products/server';
import { getProductRepository } from '@/features/products/server';
import { parseJsonBody } from '@/features/products/server';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const assignSchema = z.object({
  productIds: z.array(z.string().trim().min(1)).min(1),
  catalogIds: z.array(z.string().trim().min(1)).min(1),
  mode: z.enum(['add', 'replace', 'remove']).optional(),
});

/**
 * POST /api/catalogs/assign
 * Bulk assigns catalogs to products.
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, assignSchema, {
    logPrefix: 'catalogs.ASSIGN',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  const mode = data.mode ?? 'add';

  const uniqueCatalogIds = Array.from(new Set(data.catalogIds));
  const catalogRepository = await getCatalogRepository();
  const existingCatalogs =
    await catalogRepository.getCatalogsByIds(uniqueCatalogIds);
  const existingIds = new Set(existingCatalogs.map((entry: { id: string }) => entry.id));
  const validCatalogIds = uniqueCatalogIds.filter((id: string) => existingIds.has(id));
  if (validCatalogIds.length === 0) {
    throw badRequestError('No valid catalogs found.', {
      catalogIds: uniqueCatalogIds,
    });
  }

  const uniqueProductIds = Array.from(new Set(data.productIds));
  const productRepository = await getProductRepository();

  for (const productId of uniqueProductIds) {
    const product = await productRepository.getProductById(productId);
    if (!product) {
      continue;
    }
    const existingCatalogIds = product.catalogs.map(
      (entry: { catalogId: string }) => entry.catalogId
    );
    let nextCatalogIds = existingCatalogIds;
    if (mode === 'replace') {
      nextCatalogIds = validCatalogIds;
    } else if (mode === 'remove') {
      nextCatalogIds = existingCatalogIds.filter(
        (catalogId: string) => !validCatalogIds.includes(catalogId)
      );
    } else {
      nextCatalogIds = Array.from(
        new Set([...existingCatalogIds, ...validCatalogIds])
      );
    }
    await productRepository.replaceProductCatalogs(productId, nextCatalogIds);
  }

  return NextResponse.json({
    updated: uniqueProductIds.length,
    catalogs: validCatalogIds.length,
    mode,
  });
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'catalogs.assign.POST' });
