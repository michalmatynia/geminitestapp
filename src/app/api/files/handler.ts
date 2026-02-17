import { NextRequest, NextResponse } from 'next/server';

import { imageFileService } from '@/features/files/server';
import { getProductRepository } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import type { ImageFileRecord } from '@/shared/types/domain/files';
import type { ProductWithImages } from '@/shared/types/domain/products';

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);

  const filename = searchParams.get('filename')?.trim() || null;
  const productId = searchParams.get('productId')?.trim() || null;
  const productName = searchParams.get('productName')?.trim() || null;
  const tagsParam = searchParams.get('tags')?.trim() || null;
  const tags = tagsParam ? tagsParam.split(',').map((tag) => tag.trim()).filter(Boolean) : [];

  const files = await imageFileService.listImageFiles({ filename, tags });

  const getProductDisplayName = (product: ProductWithImages): string =>
    product.name_en ?? product.name_pl ?? product.name_de ?? 'Product';

  let products: ProductWithImages[] = [];
  let productRepoAvailable = true;
  try {
    const productRepository = await getProductRepository();
    products = await productRepository.getProducts(
      productName ? { search: productName } : {}
    );
  } catch (_error) {
    productRepoAvailable = false;
  }
  const filteredProducts = productId
    ? products.filter((product: ProductWithImages) => product.id === productId)
    : products;

  const imageFileToProducts = new Map<
    string,
    Array<{ product: { id: string; name: string } }>
  >();
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
    productRepoAvailable && (productId || productName)
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
