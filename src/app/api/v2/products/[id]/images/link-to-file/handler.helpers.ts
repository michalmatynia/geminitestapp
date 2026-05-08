import path from 'path';

import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { DEFAULT_IMAGE_SLOT_COUNT } from '@/shared/lib/image-slots';

type LinkedImageUpload = ImageFileSelection;

const normalizeOptionalText = (value?: string | null): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

export const requireLinkedProductImageId = (params: { id: string }): string => {
  const productId = params.id.trim();
  if (productId.length === 0) {
    throw badRequestError('Product id is required');
  }

  return productId;
};

export const requireLinkedProduct = <TProduct>(
  product: TProduct | null,
  productId: string
): TProduct => {
  if (product === null) {
    throw notFoundError('Product not found', { productId });
  }

  return product;
};

export const requireLinkedImageDownloadResponse = (
  response: { ok: boolean; status: number },
  url: string
): void => {
  if (!response.ok) {
    throw badRequestError(`Failed to download image (${response.status}).`, {
      url,
      status: response.status,
    });
  }
};

export const requireLinkedImageBlob = (blob: Blob, url: string): Blob => {
  if (blob.size <= 0) {
    throw badRequestError('Downloaded image is empty.', {
      url,
    });
  }

  return blob;
};

export const resolveLinkedImageExtensionForMimeType = (mimetype: string): string => {
  const normalized = mimetype.trim().toLowerCase();
  if (normalized === 'image/png') return '.png';
  if (normalized === 'image/webp') return '.webp';
  if (normalized === 'image/gif') return '.gif';
  if (normalized === 'image/avif') return '.avif';
  if (normalized === 'image/svg+xml') return '.svg';
  return '.jpg';
};

export const resolveLinkedImageMimeType = (input: {
  blobType?: string | null;
  headerType?: string | null;
  url: string;
}): string => {
  const detectedMime =
    normalizeOptionalText(input.blobType) ?? normalizeOptionalText(input.headerType) ?? 'image/jpeg';
  if (!detectedMime.toLowerCase().startsWith('image/')) {
    throw badRequestError('URL does not point to an image.', {
      url: input.url,
      mimetype: detectedMime,
    });
  }

  return detectedMime;
};

export const resolveLinkedImageFilename = (input: {
  url: string;
  preferred?: string;
  mimetype: string;
  now?: () => number;
  captureException?: (error: unknown) => unknown;
}): string => {
  const baseFallback = `linked-image-${(input.now ?? Date.now)()}`;
  const preferred = normalizeOptionalText(input.preferred);
  const withSource =
    preferred ??
    (() => {
      try {
        const parsed = new URL(input.url);
        const basename = path.basename(parsed.pathname).trim();
        return basename.length > 0 ? basename : '';
      } catch (error) {
        void input.captureException?.(error);
        return '';
      }
    })();

  const source = withSource.length > 0 ? withSource : baseFallback;
  const ext = path.extname(source).trim();
  if (ext.length > 0) return source;
  return `${source}${resolveLinkedImageExtensionForMimeType(input.mimetype)}`;
};

export const clearLinkedImageSlotValue = (
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

export const resolveConvertedLinkedImageFileIds = (
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

export const buildLinkedProductImageResponse = (uploaded: LinkedImageUpload): {
  status: 'ok';
  imageFile: ImageFileSelection;
} => ({
  status: 'ok',
  imageFile: { ...uploaded },
});

export const buildLinkedProductImageWithProductResponse = <TProduct>(
  uploaded: LinkedImageUpload,
  product: TProduct
): ReturnType<typeof buildLinkedProductImageResponse> & { product: TProduct } => ({
  ...buildLinkedProductImageResponse(uploaded),
  product,
});
