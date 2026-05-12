import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { ImageFileRecord } from '@/shared/contracts/files';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import {
  getDiskPathFromPublicPath,
  getImageFileRepository,
} from '@/shared/lib/files/services/image-file-service';
import {
  getPublicPathFromStoredPath,
  uploadBufferToFastComet,
} from '@/shared/lib/files/services/storage/file-storage-service';
import type { getProductRepository } from '@/shared/lib/products/services/product-repository';

type ProductRepository = Pick<
  Awaited<ReturnType<typeof getProductRepository>>,
  'getProductById' | 'replaceProductImages'
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const normalizeOptionalPath = (value: string | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
};

const readImageFileSourcePath = (imageFile: ImageFileRecord): string => {
  const sourcePath =
    normalizeOptionalPath(imageFile.filepath) ??
    normalizeOptionalPath(imageFile.publicUrl) ??
    normalizeOptionalPath(imageFile.url);
  if (sourcePath === null) {
    throw badRequestError('Image file does not have a stored path.', {
      imageFileId: imageFile.id,
    });
  }
  return sourcePath;
};

const readLocalImageBuffer = async (input: {
  imageFile: ImageFileRecord;
  publicPath: string;
  sourcePath: string;
}): Promise<Buffer> => {
  try {
    return await fs.readFile(getDiskPathFromPublicPath(input.publicPath));
  } catch {
    throw badRequestError('Local image file could not be read for FastComet upload.', {
      filepath: input.sourcePath,
      imageFileId: input.imageFile.id,
      publicPath: input.publicPath,
    });
  }
};

const buildUpdatedImageMetadata = (input: {
  imageFile: ImageFileRecord;
  publicPath: string;
  sourcePath: string;
}): Record<string, unknown> => ({
  ...(isRecord(input.imageFile.metadata) ? input.imageFile.metadata : {}),
  fastCometUploadStatus: 'completed',
  localPublicPath: input.publicPath,
  mirroredLocally: true,
  previousFilepath: input.sourcePath,
  publicPath: input.publicPath,
  storageSource: 'fastcomet',
  uploadedToFastCometAt: new Date().toISOString(),
});

const refreshProductImageSnapshot = async (input: {
  product: ProductWithImages;
  productId: string;
  productRepo: ProductRepository;
}): Promise<ProductWithImages> => {
  await input.productRepo.replaceProductImages(
    input.productId,
    input.product.images.map((image) => image.imageFileId)
  );

  const updatedProduct = await input.productRepo.getProductById(input.productId);
  if (updatedProduct === null) {
    throw notFoundError('Product not found after FastComet upload.', { productId: input.productId });
  }
  return updatedProduct;
};

const resolvePublicPath = (imageFile: ImageFileRecord, sourcePath: string): string => {
  const publicPath = getPublicPathFromStoredPath(sourcePath);
  if (publicPath === null) {
    throw badRequestError('Image file path cannot be mapped to a public upload path.', {
      filepath: sourcePath,
      imageFileId: imageFile.id,
    });
  }
  return publicPath;
};

const resolveUploadFilename = (imageFile: ImageFileRecord, publicPath: string): string => {
  const normalizedFilename = imageFile.filename.trim();
  return normalizedFilename.length > 0 ? normalizedFilename : path.basename(publicPath);
};

const resolveUploadMimetype = (imageFile: ImageFileRecord): string => {
  const normalizedMimetype = imageFile.mimetype.trim();
  return normalizedMimetype.length > 0 ? normalizedMimetype : 'image/jpeg';
};

export const uploadLinkedImageFileToFastComet = async (input: {
  linkedImageFile: ImageFileRecord;
  product: ProductWithImages;
  productId: string;
  productRepo: ProductRepository;
}): Promise<{ imageFile: ImageFileRecord; product: ProductWithImages; publicPath: string; remoteUrl: string }> => {
  const { linkedImageFile, product, productId, productRepo } = input;
  const sourcePath = readImageFileSourcePath(linkedImageFile);
  const publicPath = resolvePublicPath(linkedImageFile, sourcePath);
  const buffer = await readLocalImageBuffer({
    imageFile: linkedImageFile,
    publicPath,
    sourcePath,
  });
  const remoteUrl = await uploadBufferToFastComet({
    buffer,
    category: 'products',
    filename: resolveUploadFilename(linkedImageFile, publicPath),
    mimetype: resolveUploadMimetype(linkedImageFile),
    publicPath,
  });

  const imageFileRepo = await getImageFileRepository();
  const updatedImageFile = await imageFileRepo.updateImageFile(linkedImageFile.id, {
    filepath: remoteUrl,
    metadata: buildUpdatedImageMetadata({
      imageFile: linkedImageFile,
      publicPath,
      sourcePath,
    }),
    publicUrl: remoteUrl,
    storageProvider: 'fastcomet',
    url: remoteUrl,
  });
  if (updatedImageFile === null) {
    throw notFoundError('Image file not found after FastComet upload.', {
      imageFileId: linkedImageFile.id,
    });
  }

  const updatedProduct = await refreshProductImageSnapshot({ product, productId, productRepo });
  return {
    imageFile: updatedImageFile,
    product: updatedProduct,
    publicPath,
    remoteUrl,
  };
};
