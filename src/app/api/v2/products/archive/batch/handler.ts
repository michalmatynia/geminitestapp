import { type NextRequest, NextResponse } from 'next/server';

import { CachedProductService, getProductRepository } from '@/features/products/server';
import { productBulkArchiveRequestSchema } from '@/shared/contracts/products/product';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, productBulkArchiveRequestSchema, {
    logPrefix: 'products.archive.batch.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const { archived } = parsed.data;
  const productIds = Array.from(new Set(parsed.data.productIds));
  const productRepository = await getProductRepository();
  const updated = await productRepository.bulkSetArchived(productIds, archived);
  CachedProductService.invalidateAll();

  return NextResponse.json({
    status: 'ok',
    archived,
    updated,
  });
}
