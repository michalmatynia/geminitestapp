import { promises as fs } from 'node:fs';
import path from 'node:path';

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { CachedProductService } from '@/features/products/performance/cached-service';
import { parseJsonBody } from '@/features/products/server';
import type { ImageFileRecord, ImageFileSelection } from '@/shared/contracts/files';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError, validationError } from '@/shared/errors/app-error';
import {
  getDiskPathFromPublicPath,
  getImageFileRepository,
} from '@/shared/lib/files/services/image-file-service';
import {
  getPublicPathFromStoredPath,
  uploadBufferToFastComet,
} from '@/shared/lib/files/services/storage/file-storage-service';
import { DEFAULT_IMAGE_SLOT_COUNT } from '@/shared/lib/image-slots';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Product id is required'),
});

const uploadToFastCometSchema = z.object({
  imageFileId: z.string().trim().min(1, 'Image file id is required'),
  imageSlotIndex: z.number().int().min(0).max(DEFAULT_IMAGE_SLOT_COUNT - 1).optional(),
});

type ProductRepository = Awaited<ReturnType<typeof getProductRepository>>;
type UploadToFastCometBody = z.infer<typeof uploadToFastCometSchema>;

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
): Promise<{ ok: true; data: UploadToFastCometBody } | { ok: false; response: Response }> => {
  const parsed = await parseJsonBody(req, uploadToFastCometSchema, {
    logPrefix: 'products.[id].images.upload-to-fastcomet.POST',
  });
  if (!parsed.ok) {
    return { ok: false, response: parsed.response };
  }
  return { ok: true, data: parsed.data };
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

const uploadLinkedImageFileToFastComet = async (input: {
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
