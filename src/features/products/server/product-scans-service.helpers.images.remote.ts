import 'server-only';

import { extname, join } from 'node:path';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  PRODUCT_SCAN_MAX_REMOTE_IMAGE_BYTES,
  PRODUCT_SCAN_MIN_IMAGE_BYTES,
} from './product-scans-service.constants';
import { readOptionalString } from './product-scans-service.helpers.base';
import {
  PRODUCT_SCAN_HTTP_URL_PATTERN,
  PRODUCT_SCAN_TEMP_IMAGE_DIRECTORY,
  productScanImageFs,
  writeProductScanTempImageCandidate,
} from './product-scans-service.helpers.images.shared';

const getRemoteImageExtension = (url: string): string => {
  const extension = extname(new URL(url).pathname);
  return extension.length > 0 ? extension : '.jpg';
};

const isValidRemoteImageResponse = (response: Response): boolean => {
  if (response.ok === false) return false;
  const contentType = response.headers.get('content-type');
  if (contentType !== null && contentType.startsWith('image/') === false) return false;
  const contentLength = Number.parseInt(response.headers.get('content-length') ?? '0', 10);
  return contentLength <= PRODUCT_SCAN_MAX_REMOTE_IMAGE_BYTES;
};

const writeDownloadedRemoteImage = async (url: string, buffer: ArrayBuffer): Promise<string> => {
  await productScanImageFs.mkdir(PRODUCT_SCAN_TEMP_IMAGE_DIRECTORY, { recursive: true });
  const filename = `scan_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}${getRemoteImageExtension(url)}`;
  const filepath = join(PRODUCT_SCAN_TEMP_IMAGE_DIRECTORY, filename);

  await productScanImageFs.writeFile(filepath, Buffer.from(buffer));
  return filepath;
};

export const downloadRemoteImageForScanning = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (isValidRemoteImageResponse(response) === false) return null;

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < PRODUCT_SCAN_MIN_IMAGE_BYTES) return null;

    return await writeDownloadedRemoteImage(url, buffer);
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'downloadRemoteImageForScanning',
      url,
    });
    return null;
  }
};

const isMaterializableScanImageResponse = (response: Response): boolean => {
  if (response.ok === false) return false;
  const contentLength = Number(response.headers.get('content-length') ?? '');
  if (Number.isFinite(contentLength) && contentLength > PRODUCT_SCAN_MAX_REMOTE_IMAGE_BYTES) {
    return false;
  }
  const contentType = response.headers.get('content-type');
  return contentType === null || /^image\//i.test(contentType);
};

export const materializeProductScanUrlCandidate = async (
  candidate: ProductScanRecord['imageCandidates'][number]
): Promise<ProductScanRecord['imageCandidates'][number] | null> => {
  const url = readOptionalString(candidate.url);
  if (url === null || PRODUCT_SCAN_HTTP_URL_PATTERN.test(url) === false) return null;

  const response = await fetch(url);
  if (isMaterializableScanImageResponse(response) === false) return null;

  return await writeProductScanTempImageCandidate({
    id: candidate.id,
    filename: candidate.filename,
    buffer: Buffer.from(await response.arrayBuffer()),
    mimeType: response.headers.get('content-type'),
    sourceUrl: url,
  });
};
