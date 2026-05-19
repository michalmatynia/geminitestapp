import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { imageFileService } from '@/features/files/server';
import { getProductRepository } from '@/features/products/server';
import type { ImageFileRecord } from '@/shared/contracts/files';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  optionalCsvQueryStringArray,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

/**
 * Files API Handlers
 *
 * HTTP request handlers for file management.
 * Handlers: getHandler, postHandler
 *
 * - Lists and uploads files
 * - Manages file metadata and associations
 * - Handles file storage and CDN routing
 */

export const querySchema = z.object({
  filename: optionalTrimmedQueryString(),
  productId: optionalTrimmedQueryString(),
  productName: optionalTrimmedQueryString(),
  tags: optionalCsvQueryStringArray(),
});

const getProductDisplayName = (product: ProductWithImages): string =>
  product.name_en ?? product.name_pl ?? product.name_de ?? 'Product';

async function fetchFilteredProducts(
  productName: string | null | undefined
): Promise<ProductWithImages[]> {
  try {
    const productRepository = await getProductRepository();
    if (productName !== null && productName !== undefined && productName !== '') {
      return await productRepository.getProducts({ search: productName });
    }
    return await productRepository.getProducts({});
  } catch (error) {
    void ErrorSystem.captureException(error);
    return [];
  }
}

function mapFilesToProducts(
  products: ProductWithImages[],
  productIdFilter: string | null | undefined
): Map<string, Array<{ product: { id: string; name: string } }>> {
  const map = new Map<string, Array<{ product: { id: string; name: string } }>>();
  const filteredProducts =
    productIdFilter !== null && productIdFilter !== undefined && productIdFilter !== ''
      ? products.filter((p) => p.id === productIdFilter)
      : products;

  for (const product of filteredProducts) {
    const name = getProductDisplayName(product);
    for (const image of product.images ?? []) {
      const existing = map.get(image.imageFileId) ?? [];
      map.set(image.imageFileId, [...existing, { product: { id: product.id, name } }]);
    }
  }
  return map;
}

const applyFileFiltering = (
  file: ImageFileRecord,
  isFilterActive: boolean,
  imageFileToProducts: Map<string, Array<{ product: { id: string; name: string } }>>
): boolean => (!isFilterActive || imageFileToProducts.has(file.id));

/**
 * Handles HTTP requests.
 *
 * - Validates request inputs
 * - Performs business logic
 * - Returns appropriate response
 *
 * @param req - NextRequest object
 * @param ctx - API handler context
 * @returns Response with operation result
 */
export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;

  const [files, products] = await Promise.all([
    imageFileService.listImageFiles({
      filename: query.filename ?? undefined,
      tags: query.tags ?? [],
    }),
    fetchFilteredProducts(query.productName ?? null),
  ]);

  const imageFileToProducts = mapFilesToProducts(products, query.productId ?? null);
  const filterActive = (query.productId ?? '') !== '' || (query.productName ?? '') !== '';
  
  const result = files
    .filter((f) => applyFileFiltering(f, filterActive, imageFileToProducts))
    .map((file: ImageFileRecord) => ({
      ...file,
      products: imageFileToProducts.get(file.id) ?? [],
    }));

  return NextResponse.json(result);
}
