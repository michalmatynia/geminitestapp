import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type { ImageFileCreateInput, ImageFileRecord } from '@/shared/contracts/files';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { MAX_IMAGE_BYTES } from '@/shared/lib/files/constants';
import {
  getDiskPathFromPublicPath,
  getProductImageFileRepository,
} from '@/shared/lib/files/services/image-file-service';
import { uploadBufferToFastComet } from '@/shared/lib/files/services/storage/file-storage-service';
import { DEFAULT_IMAGE_SLOT_COUNT } from '@/shared/lib/image-slots';
import type { getProductRepository } from '@/shared/lib/products/services/product-repository';

type ProductRepository = Pick<
  Awaited<ReturnType<typeof getProductRepository>>,
  'getProductById' | 'replaceProductImages' | 'updateProduct'
>;

const uploadFileToFastCometSchema = z.object({
  filename: z.string().trim().optional(),
  imageSlotIndex: z.number().int().min(0).max(DEFAULT_IMAGE_SLOT_COUNT - 1),
});

type UploadFileToFastCometBody = z.infer<typeof uploadFileToFastCometSchema>;

export type FastCometFileUploadBody = {
  file: File;
  kind: 'file';
} & UploadFileToFastCometBody;

const readFormDataText = (formData: FormData, key: string): string | undefined => {
  const value = formData.get(key);
  return typeof value === 'string' ? value : undefined;
};

const parseFormNumber = (value: string | undefined): number | undefined => {
  if (value === undefined || value.trim().length === 0) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const isFileUpload = (value: FormDataEntryValue | null): value is File =>
  typeof File !== 'undefined' && value instanceof File;

const requireFastCometUploadFile = (formData: FormData): File => {
  const file = formData.get('file');
  if (!isFileUpload(file) || file.size <= 0) {
    throw badRequestError('FastComet upload requires a non-empty image file.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw badRequestError(`File too large. Max size allowed is ${MAX_IMAGE_BYTES / 1024 / 1024}MB.`);
  }
  const mimetype = file.type.trim().toLowerCase();
  if (!mimetype.startsWith('image/')) {
    throw badRequestError('FastComet upload requires an image file.', {
      mimetype: file.type,
    });
  }
  return file;
};

export const isMultipartFastCometUploadRequest = (req: { headers?: Headers | null }): boolean =>
  req.headers?.get('content-type')?.toLowerCase().includes('multipart/form-data') === true;

export const parseMultipartFastCometUploadBody = async (
  req: NextRequest
): Promise<{ ok: true; data: FastCometFileUploadBody } | { ok: false; response: Response }> => {
  const formData = await req.formData();
  const file = requireFastCometUploadFile(formData);
  const parsed = uploadFileToFastCometSchema.safeParse({
    filename: readFormDataText(formData, 'filename') ?? file.name,
    imageSlotIndex: parseFormNumber(readFormDataText(formData, 'imageSlotIndex')),
  });
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Invalid FastComet file upload payload.',
          issues: parsed.error.flatten(),
        },
        { status: 400 }
      ),
    };
  }
  return { ok: true, data: { ...parsed.data, file, kind: 'file' } };
};

const buildUploadedFileMetadata = (input: {
  originalFilename: string;
  publicPath: string;
}): Record<string, unknown> => ({
  localPublicPath: input.publicPath,
  mirroredLocally: true,
  originalFilename: input.originalFilename,
  publicPath: input.publicPath,
  storageSource: 'fastcomet',
  uploadedToFastCometAt: new Date().toISOString(),
});

const buildStagedFileMetadata = (input: {
  originalFilename: string;
  publicPath: string;
}): Record<string, unknown> => ({
  fastCometUploadStatus: 'queued',
  localPublicPath: input.publicPath,
  mirroredLocally: true,
  originalFilename: input.originalFilename,
  publicPath: input.publicPath,
  queuedForFastCometAt: new Date().toISOString(),
  storageSource: 'local',
});

const sanitizePathSegment = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const extensionByMimeType: Record<string, string> = {
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/png': '.png',
  'image/svg+xml': '.svg',
  'image/webp': '.webp',
};

const resolveProductUploadFolder = (product: ProductWithImages): string => {
  const sku = typeof product.sku === 'string' ? sanitizePathSegment(product.sku) : '';
  if (sku.length > 0) return sku;
  const productId = sanitizePathSegment(product.id);
  return productId.length > 0 ? productId : 'uncategorized';
};

const resolveUploadedFileExtension = (file: File, preferredFilename: string | undefined): string => {
  const preferred = preferredFilename?.trim() ?? '';
  const source = preferred.length > 0 ? preferred : file.name.trim();
  const extension = path.extname(source).trim().toLowerCase();
  if (extension.length > 0) return extension;
  const mimetype = file.type.trim().toLowerCase();
  return extensionByMimeType[mimetype] ?? '.jpg';
};

const resolveUploadedFileTarget = (input: {
  file: File;
  filename?: string | undefined;
  product: ProductWithImages;
}): { filename: string; publicPath: string } => {
  const filename = `${randomUUID()}${resolveUploadedFileExtension(input.file, input.filename)}`;
  const publicPath = `/uploads/products/${resolveProductUploadFolder(input.product)}/${filename}`;
  return { filename, publicPath };
};

const writeLocalImageMirror = async (input: {
  buffer: Buffer;
  publicPath: string;
}): Promise<void> => {
  const diskPath = getDiskPathFromPublicPath(input.publicPath);
  await fs.mkdir(path.dirname(diskPath), { recursive: true });
  await fs.writeFile(diskPath, input.buffer);
};

const clearImageSlotValue = (
  values: string[] | undefined,
  imageSlotIndex: number
): string[] => {
  const next = Array.from(
    { length: Math.max(values?.length ?? 0, imageSlotIndex + 1) },
    (_value, index) => values?.[index] ?? ''
  );
  next[imageSlotIndex] = '';
  return next;
};

const resolveProductImageFileIdsForSlot = (
  product: ProductWithImages,
  imageSlotIndex: number,
  imageFileId: string
): string[] => {
  const nextImageFileIds = product.images
    .slice(0, DEFAULT_IMAGE_SLOT_COUNT)
    .map((image) => image.imageFileId.trim())
    .filter((id) => id.length > 0);

  while (nextImageFileIds.length <= imageSlotIndex) {
    nextImageFileIds.push('');
  }
  nextImageFileIds[imageSlotIndex] = imageFileId;
  return nextImageFileIds.filter((id) => id.length > 0);
};

const persistUploadedImageSlot = async (input: {
  imageFile: ImageFileRecord;
  imageSlotIndex: number;
  product: ProductWithImages;
  productId: string;
  productRepo: ProductRepository;
}): Promise<ProductWithImages> => {
  await input.productRepo.updateProduct(input.productId, {
    imageBase64s: clearImageSlotValue(input.product.imageBase64s, input.imageSlotIndex),
    imageLinks: clearImageSlotValue(input.product.imageLinks, input.imageSlotIndex),
  });
  await input.productRepo.replaceProductImages(
    input.productId,
    resolveProductImageFileIdsForSlot(input.product, input.imageSlotIndex, input.imageFile.id)
  );

  const updatedProduct = await input.productRepo.getProductById(input.productId);
  if (updatedProduct === null) {
    throw notFoundError('Product not found after FastComet upload.', { productId: input.productId });
  }
  return updatedProduct;
};

export const uploadNewImageFileToFastComet = async (input: {
  body: FastCometFileUploadBody;
  product: ProductWithImages;
  productId: string;
  productRepo: ProductRepository;
}): Promise<{ imageFile: ImageFileRecord; product: ProductWithImages; publicPath: string; remoteUrl: string }> => {
  const { body, product, productId, productRepo } = input;
  const { filename, publicPath } = resolveUploadedFileTarget({
    file: body.file,
    filename: body.filename,
    product,
  });
  const buffer = Buffer.from(await body.file.arrayBuffer());
  const trimmedMimetype = body.file.type.trim();
  const mimetype = trimmedMimetype.length > 0 ? trimmedMimetype : 'image/jpeg';
  await writeLocalImageMirror({ buffer, publicPath });
  const remoteUrl = await uploadBufferToFastComet({
    buffer,
    category: 'products',
    filename,
    mimetype,
    publicPath,
  });
  const recordInput: ImageFileCreateInput = {
    filename,
    filepath: remoteUrl,
    metadata: buildUploadedFileMetadata({
      originalFilename: body.file.name,
      publicPath,
    }),
    mimetype,
    publicUrl: remoteUrl,
    size: body.file.size,
    storageProvider: 'fastcomet',
    url: remoteUrl,
  };
  const imageFileRepo = await getProductImageFileRepository();
  const imageFile = await imageFileRepo.createImageFile(recordInput);
  const updatedProduct = await persistUploadedImageSlot({
    imageFile,
    imageSlotIndex: body.imageSlotIndex,
    product,
    productId,
    productRepo,
  });

  return {
    imageFile,
    product: updatedProduct,
    publicPath,
    remoteUrl,
  };
};

export const stageNewImageFileForFastCometUpload = async (input: {
  body: FastCometFileUploadBody;
  product: ProductWithImages;
  productId: string;
  productRepo: ProductRepository;
}): Promise<{ imageFile: ImageFileRecord; product: ProductWithImages; publicPath: string }> => {
  const { body, product, productId, productRepo } = input;
  const { filename, publicPath } = resolveUploadedFileTarget({
    file: body.file,
    filename: body.filename,
    product,
  });
  const buffer = Buffer.from(await body.file.arrayBuffer());
  const trimmedMimetype = body.file.type.trim();
  const mimetype = trimmedMimetype.length > 0 ? trimmedMimetype : 'image/jpeg';
  await writeLocalImageMirror({ buffer, publicPath });
  const recordInput: ImageFileCreateInput = {
    filename,
    filepath: publicPath,
    metadata: buildStagedFileMetadata({
      originalFilename: body.file.name,
      publicPath,
    }),
    mimetype,
    publicUrl: publicPath,
    size: body.file.size,
    storageProvider: 'local',
    url: publicPath,
  };
  const imageFileRepo = await getProductImageFileRepository();
  const imageFile = await imageFileRepo.createImageFile(recordInput);
  const updatedProduct = await persistUploadedImageSlot({
    imageFile,
    imageSlotIndex: body.imageSlotIndex,
    product,
    productId,
    productRepo,
  });

  return {
    imageFile,
    product: updatedProduct,
    publicPath,
  };
};
