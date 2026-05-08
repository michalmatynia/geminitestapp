import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { CachedProductService } from '@/features/products/performance/cached-service';
import { parseJsonBody } from '@/features/products/server';
import { downloadRemoteProductImageFile } from '@/features/products/server/product-remote-image-download';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { uploadFile } from '@/shared/lib/files/services/image-file-service';
import { DEFAULT_IMAGE_SLOT_COUNT } from '@/shared/lib/image-slots';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';

import {
  buildLinkedProductImageResponse,
  buildLinkedProductImageWithProductResponse,
  clearLinkedImageSlotValue,
  requireLinkedProduct,
  requireLinkedProductImageId,
  resolveConvertedLinkedImageFileIds,
} from './handler.helpers';

const linkToFileSchema = z.object({
  url: z.string().trim().url(),
  filename: z.string().trim().optional(),
  imageSlotIndex: z.number().int().min(0).max(DEFAULT_IMAGE_SLOT_COUNT - 1).optional(),
});

type ProductRepository = Awaited<ReturnType<typeof getProductRepository>>;
type UploadedProductImage = { id: string; filepath: string };

const persistConvertedImageSlot = async (input: {
  imageSlotIndex: number;
  product: ProductWithImages;
  productId: string;
  productRepo: ProductRepository;
  uploaded: UploadedProductImage;
}): Promise<ProductWithImages> => {
  await input.productRepo.updateProduct(input.productId, {
    imageLinks: clearLinkedImageSlotValue(input.product.imageLinks, input.imageSlotIndex),
    imageBase64s: clearLinkedImageSlotValue(input.product.imageBase64s, input.imageSlotIndex),
  });
  await input.productRepo.replaceProductImages(
    input.productId,
    resolveConvertedLinkedImageFileIds(input.product, input.imageSlotIndex, input.uploaded.id)
  );

  const updatedProduct = await input.productRepo.getProductById(input.productId);
  if (updatedProduct === null) {
    throw badRequestError('Image was converted, but the product could not be reloaded.', {
      productId: input.productId,
    });
  }
  return updatedProduct;
};

export async function postHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const productId = requireLinkedProductImageId(params);

  const parsed = await parseJsonBody(req, linkToFileSchema, {
    logPrefix: 'products.[id].images.link-to-file.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const productRepo = await getProductRepository();
  const product = requireLinkedProduct(await productRepo.getProductById(productId), productId);
  const { file, filename } = await downloadRemoteProductImageFile({
    fallbackFilenamePrefix: product.sku ?? product.id,
    imageUrl: parsed.data.url,
    preferredFilename: parsed.data.filename,
    refererUrl: product.supplierLink ?? parsed.data.url,
    sourcePageUrl: product.supplierLink ?? parsed.data.url,
  });

  const uploaded = await uploadFile(file, {
    category: 'products',
    sku: product.sku ?? undefined,
    filenameOverride: filename,
  });

  if (parsed.data.imageSlotIndex !== undefined) {
    const updatedProduct = await persistConvertedImageSlot({
      imageSlotIndex: parsed.data.imageSlotIndex,
      product,
      productId,
      productRepo,
      uploaded,
    });
    CachedProductService.invalidateProduct(productId);
    return NextResponse.json(
      buildLinkedProductImageWithProductResponse(uploaded, updatedProduct)
    );
  }

  return NextResponse.json(buildLinkedProductImageResponse(uploaded));
}
