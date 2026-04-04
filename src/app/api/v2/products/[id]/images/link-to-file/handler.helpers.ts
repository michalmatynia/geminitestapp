import path from 'path';

import { badRequestError, notFoundError } from '@/shared/errors/app-error';

export const requireLinkedProductImageId = (params: { id: string }): string => {
  const productId = params.id.trim();
  if (!productId) {
    throw badRequestError('Product id is required');
  }

  return productId;
};

export const requireLinkedProduct = <TProduct>(
  product: TProduct | null,
  productId: string
): TProduct => {
  if (!product) {
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
  const detectedMime = input.blobType?.trim() || input.headerType?.trim() || 'image/jpeg';
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
  const withSource =
    input.preferred?.trim() ||
    (() => {
      try {
        const parsed = new URL(input.url);
        const basename = path.basename(parsed.pathname).trim();
        return basename || '';
      } catch (error) {
        void (input.captureException?.(error) ?? undefined);
        return '';
      }
    })();

  const source = withSource || baseFallback;
  const ext = path.extname(source).trim();
  if (ext.length > 0) return source;
  return `${source}${resolveLinkedImageExtensionForMimeType(input.mimetype)}`;
};

export const buildLinkedProductImageResponse = (uploaded: {
  id: string;
  filepath: string;
}): {
  status: 'ok';
  imageFile: {
    id: string;
    filepath: string;
  };
} => ({
  status: 'ok',
  imageFile: {
    id: uploaded.id,
    filepath: uploaded.filepath,
  },
});
