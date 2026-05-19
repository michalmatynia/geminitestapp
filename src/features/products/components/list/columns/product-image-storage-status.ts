import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import {
  isFastCometImageFile,
  isFastCometUploadUrl,
} from '@/shared/ui/image-slot-manager/product-image-source-classification';

export type ProductImageStorageStatus = {
  hasFastCometImage: boolean;
  hasLocalImage: boolean;
  hasExternalLinkImage: boolean;
  hasBase64Image: boolean;
};

const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const isHttpProtocol = (protocol: string): boolean =>
  protocol === 'http:' || protocol === 'https:';

const isInlinePreviewUrl = (value: string): boolean =>
  value.startsWith('data:') || value.startsWith('blob:');

const parseUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const getProductImageFileRecords = (product: ProductWithImages): Record<string, unknown>[] =>
  (Array.isArray(product.images) ? product.images : [])
    .map((image) => toRecord(image)?.['imageFile'])
    .map(toRecord)
    .filter((record): record is Record<string, unknown> => record !== null);

const hasProductUploadPath = (pathname: string): boolean => {
  const normalized = pathname.replace(/^\/?public\/uploads\//i, '/uploads/');
  return normalized.startsWith('/uploads/') || normalized.startsWith('uploads/');
};

const isLoopbackHostname = (hostname: string): boolean => {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(normalized);
};

const isLoopbackProductUploadUrl = (candidate: string): boolean => {
  const parsed = parseUrl(candidate);
  if (parsed === null || !isHttpProtocol(parsed.protocol)) return false;
  return isLoopbackHostname(parsed.hostname) && hasProductUploadPath(parsed.pathname);
};

const isLocalProductUploadUrl = (value: unknown): boolean => {
  const candidate = toTrimmedString(value);
  if (candidate.length === 0) return false;
  if (isInlinePreviewUrl(candidate) || isFastCometUploadUrl(candidate)) return false;
  return hasProductUploadPath(candidate) || isLoopbackProductUploadUrl(candidate);
};

const isExternalProductImageLink = (value: unknown): boolean => {
  const candidate = toTrimmedString(value);
  if (candidate.length === 0) return false;
  if (isFastCometUploadUrl(candidate) || isLocalProductUploadUrl(candidate)) return false;

  const parsed = parseUrl(candidate);
  return parsed !== null && isHttpProtocol(parsed.protocol);
};

const isFastCometImageFileRecord = (imageFile: Record<string, unknown>): boolean => {
  const metadata = toRecord(imageFile['metadata']);
  const fastCometUploadStatus = toTrimmedString(metadata?.['fastCometUploadStatus']).toLowerCase();
  return (
    isFastCometImageFile(imageFile as ImageFileSelection) ||
    toTrimmedString(imageFile['storageProvider']).toLowerCase() === 'fastcomet' ||
    toTrimmedString(metadata?.['storageSource']).toLowerCase() === 'fastcomet' ||
    ['completed', 'complete', 'success', 'uploaded'].includes(fastCometUploadStatus) ||
    toTrimmedString(metadata?.['uploadedToFastCometAt']).length > 0
  );
};

const hasCompletedFastCometImageStorage = (
  imageFiles: Record<string, unknown>[],
  imageLinks: string[]
): boolean => {
  if (imageFiles.length > 0) {
    return imageFiles.every(isFastCometImageFileRecord);
  }
  return imageLinks.some(isFastCometUploadUrl);
};

export const hasAnyProductImageStorageStatus = (status: ProductImageStorageStatus): boolean =>
  status.hasFastCometImage ||
  status.hasLocalImage ||
  status.hasExternalLinkImage ||
  status.hasBase64Image;

export const resolveProductImageStorageStatus = (
  product: ProductWithImages
): ProductImageStorageStatus => {
  const imageFiles = getProductImageFileRecords(product);
  const imageLinks = Array.isArray(product.imageLinks) ? product.imageLinks : [];

  return {
    hasFastCometImage: hasCompletedFastCometImageStorage(imageFiles, imageLinks),
    hasLocalImage: imageFiles.length > 0 || imageLinks.some(isLocalProductUploadUrl),
    hasExternalLinkImage: imageLinks.some(isExternalProductImageLink),
    hasBase64Image: Array.isArray(product.imageBase64s)
      ? product.imageBase64s.some((imageBase64: string) => imageBase64.trim() !== '')
      : false,
  };
};
