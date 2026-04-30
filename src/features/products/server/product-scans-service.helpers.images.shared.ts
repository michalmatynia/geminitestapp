import 'server-only';

import { randomUUID } from 'crypto';
import { tmpdir } from 'node:os';
import { extname, join, sep } from 'node:path';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { getFsPromises } from '@/shared/lib/files/runtime-fs';

import {
  PRODUCT_SCAN_MAX_REMOTE_IMAGE_BYTES,
  PRODUCT_SCAN_MIN_IMAGE_BYTES,
  PRODUCT_SCAN_SUPPORTED_LOCAL_IMAGE_EXTENSIONS,
} from './product-scans-service.constants';
import { readOptionalString } from './product-scans-service.helpers.base';

export const PRODUCT_SCAN_HTTP_URL_PATTERN = /^https?:\/\//i;
export const productScanImageFs = getFsPromises();
export const PRODUCT_SCAN_TEMP_IMAGE_DIRECTORY = join(
  tmpdir(),
  'geminitestapp-product-scan-images'
);
export const PRODUCT_SCAN_DEV_PUBLIC_UPLOADS_ROOT = `${process.cwd()}${sep}public${sep}uploads`;

const PRODUCT_SCAN_MIME_TYPE_EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/bmp': '.bmp',
  'image/tiff': '.tiff',
  'image/avif': '.avif',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

export const resolveProductScanBase64ImageExtension = (mimeType: string): string => {
  const normalized = mimeType.trim().toLowerCase();
  return PRODUCT_SCAN_MIME_TYPE_EXTENSIONS[normalized] ?? '.jpg';
};

export const resolveProductScanUrlImageExtension = (input: {
  contentType?: string | null;
  filename?: string | null;
  url?: string | null;
}): string => {
  const contentType = input.contentType;
  if (contentType !== null && contentType !== undefined && contentType.length > 0) {
    return resolveProductScanBase64ImageExtension(contentType);
  }

  const extensionSource = readOptionalString(input.filename) ?? readOptionalString(input.url);
  if (extensionSource === null) return '.jpg';

  const [pathWithoutQuery = ''] = extensionSource.split('?');
  const extension = extname(pathWithoutQuery).toLowerCase();
  return PRODUCT_SCAN_SUPPORTED_LOCAL_IMAGE_EXTENSIONS.has(extension) ? extension : '.jpg';
};

const resolveSafeProductId = (productId: string | null | undefined): string => {
  const rawSafeProductId = readOptionalString(productId)
    ?.replace(/[^a-zA-Z0-9_-]+/g, '-')
    .slice(0, 60);
  if (rawSafeProductId !== undefined && rawSafeProductId.length > 0) return rawSafeProductId;
  return 'product';
};

const resolveProductScanSlotLabel = (slotIndex: number | null | undefined): string => {
  if (typeof slotIndex === 'number' && Number.isFinite(slotIndex)) {
    return `slot-${slotIndex + 1}`;
  }
  return 'remote';
};

export const writeProductScanTempImageCandidate = async (input: {
  id: string | null;
  filename: string | null;
  buffer: Buffer;
  mimeType?: string | null;
  sourceUrl?: string | null;
  productId?: string | null;
  slotIndex?: number | null;
}): Promise<ProductScanRecord['imageCandidates'][number] | null> => {
  const byteLength = input.buffer.byteLength;
  if (byteLength < PRODUCT_SCAN_MIN_IMAGE_BYTES || byteLength > PRODUCT_SCAN_MAX_REMOTE_IMAGE_BYTES) {
    return null;
  }

  const extension = resolveProductScanUrlImageExtension({
    contentType: input.mimeType,
    filename: input.filename,
    url: input.sourceUrl,
  });
  const safeProductId = resolveSafeProductId(input.productId);
  const slotLabel = resolveProductScanSlotLabel(input.slotIndex);
  const filename =
    readOptionalString(input.filename) ?? `${safeProductId}-scan-${slotLabel}${extension}`;
  const filepath = join(
    PRODUCT_SCAN_TEMP_IMAGE_DIRECTORY,
    `${safeProductId}-${slotLabel}-${randomUUID()}${extension}`
  );

  await productScanImageFs.mkdir(PRODUCT_SCAN_TEMP_IMAGE_DIRECTORY, { recursive: true });
  await productScanImageFs.writeFile(filepath, input.buffer);

  return {
    id: input.id,
    filepath,
    url: readOptionalString(input.sourceUrl),
    filename,
  };
};
