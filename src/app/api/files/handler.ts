import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { imageFileService } from '@/features/files/server';
import { getProductRepository } from '@/features/products/server';
import type { ImageFileRecord } from '@/shared/contracts/files';
import type { ProductWithImages } from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import {
  optionalCsvQueryStringArray,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  filename: optionalTrimmedQueryString(),
  productId: optionalTrimmedQueryString(),
  productName: optionalTrimmedQueryString(),
  tags: optionalCsvQueryStringArray(),
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;

  const files = await imageFileService.listImageFiles({
    filename: query.filename ?? undefined,
    tags: query.tags ?? [],
  });

  const getProductDisplayName = (product: ProductWithImages): string =>
    product.name_en ?? product.name_pl ?? product.name_de ?? 'Product';

  let products: ProductWithImages[] = [];
  let productRepoAvailable = true;
  try {
    const productRepository = await getProductRepository();
    products = await productRepository.getProducts(
      query.productName ? { search: query.productName } : {}
    );
  } catch (_error) {
    productRepoAvailable = false;
  }
  const filteredProducts = query.productId
    ? products.filter((product: ProductWithImages) => product.id === query.productId)
    : products;

  const imageFileToProducts = new Map<string, Array<{ product: { id: string; name: string } }>>();
  for (const product of filteredProducts) {
    const name = getProductDisplayName(product);
    for (const image of product.images ?? []) {
      if (!imageFileToProducts.has(image.imageFileId)) {
        imageFileToProducts.set(image.imageFileId, []);
      }
      imageFileToProducts.get(image.imageFileId)?.push({
        product: { id: product.id, name },
      });
    }
  }

  const allowedImageFileIds =
    productRepoAvailable && (query.productId || query.productName)
      ? new Set(imageFileToProducts.keys())
      : null;

  const result = files
    .filter((file: ImageFileRecord) =>
      allowedImageFileIds ? allowedImageFileIds.has(file.id) : true
    )
    .map((file: ImageFileRecord) => ({
      ...file,
      products: imageFileToProducts.get(file.id) ?? [],
    }));

  return NextResponse.json(result);
}
