import 'server-only';

import sharp from 'sharp';

import {
  getImageStudioSlotById,
  updateImageStudioSlot,
  type ImageStudioSlotRecord,
} from '@/features/ai/image-studio/server';
import { type ProductStudioSequencingConfig, type ProductWithImages } from '@/shared/contracts/products';
import { badRequestError, notFoundError, operationFailedError } from '@/shared/errors/app-error';
import { DEFAULT_IMAGE_SLOT_COUNT } from '@/shared/lib/image-slots';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { uploadProductImageFileWithLocalFallback } from '@/shared/lib/products/services/product-image-upload-fallback';
import { getProductStudioConfig } from '@/shared/lib/products/services/product-studio-config';
import { productService } from '@/shared/lib/products/services/productService';

import { clearProductStudioActiveRun } from './product-studio-service.active-run';
import { asRecord, normalizeImageSlotIndex, trimString } from './product-studio-service.helpers';
import { toProductImageFileSource } from './product-studio-service.images';
import {
  appendFilenameSuffix,
  buildUpscaledImage,
  resolveBufferFromImagePath,
} from './product-studio-service.io';
import {
  ensureProduct,
  resolveProductAndStudioTarget,
  resolveSourceSlotIdForIndex,
} from './product-studio-service.resolution';
import { resolveStudioSettingsBundle } from './product-studio-service.settings';

type ProductStudioUploadedImage = {
  id: string;
  filepath: string;
};

const requireText = (value: string | null, message: string): string => {
  if (value === null) {
    throw badRequestError(message);
  }
  return value;
};

const resolveProductStudioSku = (product: ProductWithImages): string | null =>
  trimString(product.sku);

const uploadProductStudioImageFile = async (params: {
  action: string;
  file: File;
  filename: string;
  product: ProductWithImages;
}): Promise<ProductStudioUploadedImage> => {
  const uploaded = await uploadProductImageFileWithLocalFallback({
    action: params.action,
    file: params.file,
    filename: params.filename,
    service: 'product-studio',
    sku: resolveProductStudioSku(params.product),
  });
  return {
    id: uploaded.id,
    filepath: uploaded.filepath,
  };
};

const buildProductImageFileIdsForSlot = (
  product: ProductWithImages,
  imageSlotIndex: number,
  imageFileId: string
): string[] => {
  const nextImageFileIds = product.images
    .slice(0, DEFAULT_IMAGE_SLOT_COUNT)
    .map((image) => trimString(image.imageFileId) ?? '')
    .filter((id) => id.length > 0);

  while (nextImageFileIds.length <= imageSlotIndex) {
    nextImageFileIds.push('');
  }

  nextImageFileIds[imageSlotIndex] = imageFileId;
  return nextImageFileIds.filter((id) => id.length > 0);
};

const reloadMutatedProduct = async (
  productId: string,
  failureMessage: string
): Promise<ProductWithImages> => {
  const updatedProduct = await productService.getProductById(productId);
  if (updatedProduct === null) {
    throw operationFailedError(failureMessage);
  }
  return updatedProduct;
};

const requireProjectGenerationSlot = async (
  generationSlotId: string,
  projectId: string
): Promise<ImageStudioSlotRecord> => {
  const generationSlot = await getImageStudioSlotById(generationSlotId);
  if (generationSlot?.projectId !== projectId) {
    throw notFoundError('Generation slot not found in selected Studio project.', {
      generationSlotId,
      projectId,
    });
  }
  return generationSlot;
};

const resolveGenerationImageFileId = (generationSlot: ImageStudioSlotRecord): string => {
  const generationImageFileId =
    trimString(generationSlot.imageFileId) ?? trimString(generationSlot.imageFile?.id);
  if (generationImageFileId === null) {
    throw badRequestError('Selected generation card has no image file to accept.');
  }
  return generationImageFileId;
};

const createUpscaledAcceptedProductImage = async (params: {
  generationSlot: ImageStudioSlotRecord;
  product: ProductWithImages;
  imageSlotIndex: number;
  sequencing: ProductStudioSequencingConfig;
}): Promise<{ imageFileId: string; filepath: string; scale: number }> => {
  const sourcePath = requireText(
    trimString(params.generationSlot.imageFile?.filepath) ??
      trimString(params.generationSlot.imageUrl),
    'Selected generation card has no image path to upscale.'
  );

  const sourceFilename =
    trimString(params.generationSlot.imageFile?.filename) ??
    trimString(params.generationSlot.name) ??
    `product-${params.product.id}-slot-${params.imageSlotIndex + 1}`;

  const { buffer } = await resolveBufferFromImagePath(sourcePath);
  const upscaled = await buildUpscaledImage(buffer, params.sequencing.upscaleScale);
  const scaleLabel = `${upscaled.scale.toFixed(2).replace(/\.00$/, '')}x`;
  const targetFilename = appendFilenameSuffix(sourceFilename, `-upscaled-${scaleLabel}`, '.png');

  const file = new File([new Uint8Array(upscaled.buffer)], targetFilename, {
    type: 'image/png',
  });
  const uploaded = await uploadProductStudioImageFile({
    action: 'createUpscaledAcceptedProductImage',
    file,
    filename: targetFilename,
    product: params.product,
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
  if (generationSlotId === null) {
    throw badRequestError('Generation slot id is required.');
  }

  const generationSlot = await requireProjectGenerationSlot(generationSlotId, resolved.projectId);
  const generationImageFileId = resolveGenerationImageFileId(generationSlot);

  const { sequencing } = await resolveStudioSettingsBundle(resolved.projectId);
  let acceptedImageFileId = generationImageFileId;
  if (sequencing.enabled === true && sequencing.upscaleOnAccept === true) {
    const upscaled = await createUpscaledAcceptedProductImage({
      generationSlot,
      product: resolved.product,
      imageSlotIndex: resolved.imageSlotIndex,
      sequencing,
    });
    acceptedImageFileId = upscaled.imageFileId;
  }

  const productRepository = await getProductRepository();
  await productRepository.replaceProductImages(
    resolved.product.id,
    buildProductImageFileIdsForSlot(
      resolved.product,
      resolved.imageSlotIndex,
      acceptedImageFileId
    )
  );

  const updatedProduct = await reloadMutatedProduct(
    resolved.product.id,
    'Product image was updated, but failed to reload product.'
  );

  void clearProductStudioActiveRun({
    productId: resolved.product.id,
    imageSlotIndex: resolved.imageSlotIndex,
  });

  return updatedProduct;
}

const uploadRotatedProductStudioImage = async (params: {
  direction: 'left' | 'right';
  imageSlotIndex: number;
  product: ProductWithImages;
  sourceFilename: string;
  sourcePath: string;
}): Promise<ProductStudioUploadedImage> => {
  const { buffer } = await resolveBufferFromImagePath(params.sourcePath);
  const rotationDegrees = params.direction === 'left' ? -90 : 90;
  const rotatedBuffer = await sharp(buffer).rotate(rotationDegrees).png().toBuffer();
  const targetFilename = appendFilenameSuffix(
    params.sourceFilename,
    params.direction === 'left' ? '-rotl90' : '-rotr90',
    '.png'
  );

  const file = new File([new Uint8Array(rotatedBuffer)], targetFilename, {
    type: 'image/png',
  });
  return await uploadProductStudioImageFile({
    action: 'rotateProductImageSlot',
    file,
    filename: targetFilename,
    product: params.product,
  });
};

const syncRotatedProductStudioSourceSlot = async (params: {
  direction: 'left' | 'right';
  imageSlotIndex: number;
  productId: string;
  uploaded: ProductStudioUploadedImage;
}): Promise<void> => {
  const existingConfig = await getProductStudioConfig(params.productId);
  const sourceSlotId = resolveSourceSlotIdForIndex(existingConfig, params.imageSlotIndex);
  if (sourceSlotId === null) return;

  const sourceSlot = await getImageStudioSlotById(sourceSlotId);
  if (sourceSlot === null) return;

  const currentMetadata = asRecord(sourceSlot.metadata) ?? {};
  await updateImageStudioSlot(sourceSlot.id, {
    imageFileId: params.uploaded.id,
    imageUrl: params.uploaded.filepath,
    imageBase64: null,
    metadata: {
      ...currentMetadata,
      source: 'product-studio',
      rotateUpdatedAt: new Date().toISOString(),
      rotateDirection: params.direction,
    },
  });
};

export async function rotateProductStudioImageSlot(params: {
  productId: string;
  imageSlotIndex: number;
  direction: 'left' | 'right';
}): Promise<ProductWithImages> {
  const imageSlotIndex = normalizeImageSlotIndex(params.imageSlotIndex);
  const product = await ensureProduct(params.productId);
  const sourceImage = toProductImageFileSource(product.images[imageSlotIndex]?.imageFile);

  if (sourceImage === null) {
    throw badRequestError('Selected product image slot has no uploaded source image.');
  }

  const sourcePath = trimString(sourceImage.filepath);
  if (sourcePath === null) {
    throw badRequestError('Selected product image has no filepath.');
  }

  const sourceFilename =
    trimString(sourceImage.filename) ?? `product-image-${imageSlotIndex + 1}.png`;
  const uploaded = await uploadRotatedProductStudioImage({
    direction: params.direction,
    imageSlotIndex,
    product,
    sourceFilename,
    sourcePath,
  });

  // Keep mapped Image Studio source card in sync with the rotated product slot image.
  await syncRotatedProductStudioSourceSlot({
    direction: params.direction,
    imageSlotIndex,
    productId: product.id,
    uploaded,
  });

  const productRepository = await getProductRepository();
  await productRepository.replaceProductImages(
    product.id,
    buildProductImageFileIdsForSlot(product, imageSlotIndex, uploaded.id)
  );

  return await reloadMutatedProduct(
    product.id,
    'Product image was rotated, but failed to reload product.'
  );
}
