import 'server-only';

import sharp from 'sharp';

import {
  getImageStudioSlotById,
  updateImageStudioSlot,
  type ImageStudioSlotRecord,
} from '@/features/ai/image-studio/server/slot-repository';
import { uploadFile } from '@/shared/lib/files/file-uploader';
import { DEFAULT_IMAGE_SLOT_COUNT } from '@/features/image-slots';
import { getProductStudioConfig } from '@/features/products/services/product-studio-config';
import { getProductRepository } from '@/features/products/services/product-repository';
import { productService } from '@/features/products/services/productService';
import {
  type ProductStudioSequencingConfig,
  type ProductWithImages,
} from '@/shared/contracts/products';
import {
  badRequestError,
  notFoundError,
  operationFailedError,
} from '@/shared/errors/app-error';

import {
  appendFilenameSuffix,
  buildUpscaledImage,
  resolveBufferFromImagePath,
} from './product-studio-service.io';
import {
  toProductImageFileSource,
} from './product-studio-service.images';
import {
  asRecord,
  normalizeImageSlotIndex,
  trimString,
} from './product-studio-service.helpers';
import {
  ensureProduct,
  resolveProductAndStudioTarget,
  resolveSourceSlotIdForIndex,
} from './product-studio-service.resolution';
import { resolveStudioSettingsBundle } from './product-studio-service.settings';

const createUpscaledAcceptedProductImage = async (params: {
  generationSlot: ImageStudioSlotRecord;
  product: ProductWithImages;
  imageSlotIndex: number;
  sequencing: ProductStudioSequencingConfig;
}): Promise<{ imageFileId: string; filepath: string; scale: number }> => {
  const sourcePath =
    trimString(params.generationSlot.imageFile?.filepath) ??
    trimString(params.generationSlot.imageUrl);
  if (!sourcePath) {
    throw badRequestError(
      'Selected generation card has no image path to upscale.',
    );
  }

  const sourceFilename =
    trimString(params.generationSlot.imageFile?.filename) ??
    trimString(params.generationSlot.name) ??
    `product-${params.product.id}-slot-${params.imageSlotIndex + 1}`;

  const { buffer } = await resolveBufferFromImagePath(sourcePath);
  const upscaled = await buildUpscaledImage(
    buffer,
    params.sequencing.upscaleScale,
  );
  const scaleLabel = `${upscaled.scale.toFixed(2).replace(/\.00$/, '')}x`;
  const targetFilename = appendFilenameSuffix(
    sourceFilename,
    `-upscaled-${scaleLabel}`,
    '.png',
  );

  const file = new File([new Uint8Array(upscaled.buffer)], targetFilename, {
    type: 'image/png',
  });
  const uploaded = await uploadFile(file, {
    category: 'products',
    sku: params.product.sku?.trim() ?? undefined,
    filenameOverride: targetFilename,
  });

  return {
    imageFileId: uploaded.id,
    filepath: uploaded.filepath,
    scale: upscaled.scale,
  };
};

export async function acceptProductStudioVariant(params: {
  productId: string;
  imageSlotIndex: number;
  generationSlotId: string;
  projectId?: string | null | undefined;
}): Promise<ProductWithImages> {
  const resolved = await resolveProductAndStudioTarget(params);
  const generationSlotId = trimString(params.generationSlotId);
  if (!generationSlotId) {
    throw badRequestError('Generation slot id is required.');
  }

  const generationSlot = await getImageStudioSlotById(generationSlotId);
  if (generationSlot?.projectId !== resolved.projectId) {
    throw notFoundError(
      'Generation slot not found in selected Studio project.',
      {
        generationSlotId,
        projectId: resolved.projectId,
      },
    );
  }

  const generationImageFileId =
    trimString(generationSlot.imageFileId) ??
    trimString(generationSlot.imageFile?.id);
  if (!generationImageFileId) {
    throw badRequestError(
      'Selected generation card has no image file to accept.',
    );
  }

  const { sequencing } = await resolveStudioSettingsBundle(resolved.projectId);
  let acceptedImageFileId = generationImageFileId;
  if (sequencing.enabled && sequencing.upscaleOnAccept) {
    const upscaled = await createUpscaledAcceptedProductImage({
      generationSlot,
      product: resolved.product,
      imageSlotIndex: resolved.imageSlotIndex,
      sequencing,
    });
    acceptedImageFileId = upscaled.imageFileId;
  }

  const nextImageFileIds = resolved.product.images
    .slice(0, DEFAULT_IMAGE_SLOT_COUNT)
    .map((image) => trimString(image.imageFileId) ?? '')
    .filter(Boolean);

  while (nextImageFileIds.length <= resolved.imageSlotIndex) {
    nextImageFileIds.push('');
  }

  nextImageFileIds[resolved.imageSlotIndex] = acceptedImageFileId;

  const compactedImageIds = nextImageFileIds.filter((id) => id.length > 0);

  const productRepository = await getProductRepository();
  await productRepository.replaceProductImages(
    resolved.product.id,
    compactedImageIds,
  );

  const updatedProduct = await productService.getProductById(
    resolved.product.id,
  );
  if (!updatedProduct) {
    throw operationFailedError(
      'Product image was updated, but failed to reload product.',
    );
  }

  return updatedProduct;
}

export async function rotateProductStudioImageSlot(params: {
  productId: string;
  imageSlotIndex: number;
  direction: 'left' | 'right';
}): Promise<ProductWithImages> {
  const imageSlotIndex = normalizeImageSlotIndex(params.imageSlotIndex);
  const product = await ensureProduct(params.productId);
  const sourceImage = toProductImageFileSource(
    product.images[imageSlotIndex]?.imageFile,
  );

  if (!sourceImage) {
    throw badRequestError('Selected product image slot has no uploaded source image.');
  }

  const sourcePath = trimString(sourceImage.filepath);
  if (!sourcePath) {
    throw badRequestError('Selected product image has no filepath.');
  }

  const sourceFilename =
    trimString(sourceImage.filename) ?? `product-image-${imageSlotIndex + 1}.png`;
  const { buffer } = await resolveBufferFromImagePath(sourcePath);
  const rotationDegrees = params.direction === 'left' ? -90 : 90;
  const rotatedBuffer = await sharp(buffer)
    .rotate(rotationDegrees)
    .png()
    .toBuffer();
  const targetFilename = appendFilenameSuffix(
    sourceFilename,
    params.direction === 'left' ? '-rotl90' : '-rotr90',
    '.png',
  );

  const file = new File([new Uint8Array(rotatedBuffer)], targetFilename, {
    type: 'image/png',
  });
  const uploaded = await uploadFile(file, {
    category: 'products',
    sku: product.sku?.trim() ?? undefined,
    filenameOverride: targetFilename,
  });

  // Keep mapped Image Studio source card in sync with the rotated product slot image.
  const existingConfig = await getProductStudioConfig(product.id);
  const sourceSlotId = resolveSourceSlotIdForIndex(existingConfig, imageSlotIndex);
  if (sourceSlotId) {
    const sourceSlot = await getImageStudioSlotById(sourceSlotId);
    if (sourceSlot) {
      const currentMetadata = asRecord(sourceSlot.metadata) ?? {};
      await updateImageStudioSlot(sourceSlot.id, {
        imageFileId: uploaded.id,
        imageUrl: uploaded.filepath,
        imageBase64: null,
        metadata: {
          ...currentMetadata,
          source: 'product-studio',
          rotateUpdatedAt: new Date().toISOString(),
          rotateDirection: params.direction,
        },
      });
    }
  }

  const nextImageFileIds = product.images
    .slice(0, DEFAULT_IMAGE_SLOT_COUNT)
    .map((image) => trimString(image.imageFileId) ?? '')
    .filter(Boolean);

  while (nextImageFileIds.length <= imageSlotIndex) {
    nextImageFileIds.push('');
  }

  nextImageFileIds[imageSlotIndex] = uploaded.id;

  const compactedImageIds = nextImageFileIds.filter((id) => id.length > 0);
  const productRepository = await getProductRepository();
  await productRepository.replaceProductImages(product.id, compactedImageIds);

  const updatedProduct = await productService.getProductById(product.id);
  if (!updatedProduct) {
    throw operationFailedError(
      'Product image was rotated, but failed to reload product.',
    );
  }

  return updatedProduct;
}
