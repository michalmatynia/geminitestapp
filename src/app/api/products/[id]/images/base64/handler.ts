import { NextRequest, NextResponse } from 'next/server';

import {
  buildImageBase64Slots,
  type ProductImageBase64Source,
} from '@/features/products/services/image-base64';
import { getProductRepository } from '@/features/products/services/product-repository';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const productId = params.id;
  if (!productId) {
    throw badRequestError('Product id is required');
  }

  const productRepo = await getProductRepository();
  const product = await productRepo.getProductById(productId);
  if (!product) {
    throw notFoundError('Product not found', { productId });
  }

  const { imageBase64s, imageLinks } = await buildImageBase64Slots(
    product as unknown as ProductImageBase64Source
  );
  await productRepo.updateProduct(productId, { imageBase64s, imageLinks });

  return NextResponse.json({
    status: 'ok',
    productId,
    count: imageBase64s.filter(Boolean).length,
  });
}
