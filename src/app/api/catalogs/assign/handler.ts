import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCatalogRepository } from '@/features/products/server';
import { getProductRepository } from '@/features/products/server';
import { parseJsonBody } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

const assignSchema = z.object({
  productIds: z.array(z.string().trim().min(1)).min(1),
  catalogIds: z.array(z.string().trim().min(1)).min(1),
  mode: z.enum(['add', 'replace', 'remove']).optional(),
});

/**
 * POST /api/catalogs/assign
 * Bulk assigns catalogs to products.
 */
export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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

  if (mode === 'replace') {
    await productRepository.bulkReplaceProductCatalogs(
      uniqueProductIds,
      validCatalogIds
    );
  } else if (mode === 'remove') {
    await productRepository.bulkRemoveProductCatalogs(
      uniqueProductIds,
      validCatalogIds
    );
  } else {
    await productRepository.bulkAddProductCatalogs(
      uniqueProductIds,
      validCatalogIds
    );
  }

  return NextResponse.json({
    updated: uniqueProductIds.length,
    catalogs: validCatalogIds.length,
    mode,
  });
}
