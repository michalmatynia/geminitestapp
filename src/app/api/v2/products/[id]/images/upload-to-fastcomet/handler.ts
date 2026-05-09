import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { CachedProductService } from '@/features/products/performance/cached-service';
import { parseJsonBody } from '@/features/products/server';
import type { ImageFileRecord, ImageFileSelection } from '@/shared/contracts/files';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError, validationError } from '@/shared/errors/app-error';
import { getFileStorageSettings } from '@/shared/lib/files/services/storage/file-storage-service';
import { DEFAULT_IMAGE_SLOT_COUNT } from '@/shared/lib/image-slots';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';

import {
  isMultipartFastCometUploadRequest,
  parseMultipartFastCometUploadBody,
  uploadNewImageFileToFastComet,
  type FastCometFileUploadBody,
} from './handler.file-upload';
import { uploadLinkedImageFileToFastComet } from './handler.linked-upload';

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Product id is required'),
});

const uploadToFastCometSchema = z.object({
  imageFileId: z.string().trim().min(1, 'Image file id is required'),
  imageSlotIndex: z.number().int().min(0).max(DEFAULT_IMAGE_SLOT_COUNT - 1).optional(),
});

type ProductRepository = Awaited<ReturnType<typeof getProductRepository>>;
type UploadToFastCometBody = z.infer<typeof uploadToFastCometSchema>;
type ParsedUploadBody =
  | ({ kind: 'existing' } & UploadToFastCometBody)
  | FastCometFileUploadBody;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isFastCometImageFile = (imageFile: ImageFileRecord): boolean => {
  if (imageFile.storageProvider === 'fastcomet') return true;
  const metadata = imageFile.metadata;
  return isRecord(metadata) && metadata['storageSource'] === 'fastcomet';
};

const resolveLinkedImageFile = (
  product: ProductWithImages,
  imageFileId: string,
  imageSlotIndex: number | undefined
): ImageFileRecord => {
  if (imageSlotIndex !== undefined) {
    const imageAtSlot = product.images[imageSlotIndex];
    if (imageAtSlot?.imageFileId !== imageFileId) {
      throw badRequestError('Image file is not linked at the requested product image slot.', {
        imageFileId,
        imageSlotIndex,
        productId: product.id,
      });
    }
    return imageAtSlot.imageFile;
  }

  const linkedImage = product.images.find((image) => image.imageFileId === imageFileId);
  if (linkedImage === undefined) {
    throw badRequestError('Image file is not linked to this product.', {
      imageFileId,
      productId: product.id,
    });
  }
  return linkedImage.imageFile;
};

const toImageFileSelection = (imageFile: ImageFileRecord): ImageFileSelection => imageFile;

const parseProductId = (params: { id: string }): string => {
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    throw validationError('Invalid route parameters', {
      issues: parsedParams.error.flatten(),
    });
  }
  return parsedParams.data.id;
};

const parseUploadBody = async (
  req: NextRequest
): Promise<{ ok: true; data: ParsedUploadBody } | { ok: false; response: Response }> => {
  if (isMultipartFastCometUploadRequest(req)) return await parseMultipartFastCometUploadBody(req);

  const parsed = await parseJsonBody(req, uploadToFastCometSchema, {
    logPrefix: 'products.[id].images.upload-to-fastcomet.POST',
  });
  if (!parsed.ok) {
    return { ok: false, response: parsed.response };
  }
  return { ok: true, data: { ...parsed.data, kind: 'existing' } };
};

const loadProduct = async (
  productRepo: ProductRepository,
  productId: string
): Promise<ProductWithImages> => {
  const product = await productRepo.getProductById(productId);
  if (product === null) {
    throw notFoundError('Product not found', { productId });
  }
  return product;
};

const requireFastCometConfigured = async (): Promise<void> => {
  const settings = await getFileStorageSettings();
  if (settings.source !== 'fastcomet') {
    throw badRequestError(
      'FastComet storage is not enabled. Set the file storage source to FastComet in Settings.',
      { hint: 'FILE_STORAGE_SOURCE_SETTING_KEY' }
    );
  }
  if (settings.fastComet.uploadEndpoint.length === 0) {
    throw badRequestError(
      'FastComet storage is not configured. Set FASTCOMET_STORAGE_BASE_URL or configure fastcomet_storage_config_v1 in Settings.',
      { hint: 'FASTCOMET_STORAGE_CONFIG_SETTING_KEY' }
    );
  }
};

export async function postHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const productId = parseProductId(params);
  const parsed = await parseUploadBody(req);
  if (!parsed.ok) return parsed.response;

  const productRepo = await getProductRepository();
  const product = await loadProduct(productRepo, productId);
  if (parsed.data.kind === 'file') {
    await requireFastCometConfigured();
    const result = await uploadNewImageFileToFastComet({
      body: parsed.data,
      product,
      productId,
      productRepo,
    });
    CachedProductService.invalidateProduct(productId);
    return NextResponse.json({
      status: 'ok',
      imageFile: toImageFileSelection(result.imageFile),
      product: result.product,
      publicPath: result.publicPath,
      remoteUrl: result.remoteUrl,
    });
  }

  const linkedImageFile = resolveLinkedImageFile(
    product,
    parsed.data.imageFileId,
    parsed.data.imageSlotIndex
  );
  if (isFastCometImageFile(linkedImageFile)) {
    return NextResponse.json({
      status: 'ok',
      imageFile: toImageFileSelection(linkedImageFile),
      product,
      alreadyUploaded: true,
    });
  }

  await requireFastCometConfigured();
  const result = await uploadLinkedImageFileToFastComet({
    linkedImageFile,
    product,
    productId,
    productRepo,
  });
  CachedProductService.invalidateProduct(productId);

  return NextResponse.json({
    status: 'ok',
    imageFile: toImageFileSelection(result.imageFile),
    product: result.product,
    publicPath: result.publicPath,
    remoteUrl: result.remoteUrl,
  });
}
