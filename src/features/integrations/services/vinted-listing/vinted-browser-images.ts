import { access, copyFile, mkdtemp, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import {
  resolveAppBaseUrl,
  getPublicPathFromStoredPath,
} from '@/shared/lib/files/services/storage/file-storage-service';
import {
  collectCanonicalVintedProductImageEntries,
  collectProductImageUrlCandidates,
} from './vinted-browser-images.helpers';

export const MIN_VINTED_IMAGE_BYTES = 10_240;
const VINTED_ORDERED_UPLOAD_DIR_PREFIX = 'vinted-upload-order-';

export const resolveProductImageUrls = (product: ProductWithImages): string[] =>
  collectProductImageUrlCandidates(product);

export const resolveLocalAppHost = (): string | null => {
  try {
    return new URL(resolveAppBaseUrl()).host || null;
  } catch {
    return null;
  }
};

export const toAbsolutePublicFilePath = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const localAppHost = resolveLocalAppHost();
      if (!localAppHost || url.host !== localAppHost) {
        return null;
      }
    } catch {
      return null;
    }
  }

  const publicPath = getPublicPathFromStoredPath(trimmed);
  if (!publicPath?.startsWith('/')) return null;
  return path.join(process.cwd(), 'public', publicPath.replace(/^\/+/, ''));
};

const validateLocalProductImagePath = async (candidate: string): Promise<string | null> => {
  try {
    await access(candidate);
    const stats = await stat(candidate);
    if (stats.isFile() && stats.size >= MIN_VINTED_IMAGE_BYTES) {
      return candidate;
    }
  } catch {
  }
  return null;
};

const resolveFirstValidLocalProductImagePath = async (
  candidates: readonly string[]
): Promise<string | null> => {
  for (const candidate of candidates) {
    const absolutePath = toAbsolutePublicFilePath(candidate);
    if (!absolutePath) {
      continue;
    }
    const validatedPath = await validateLocalProductImagePath(absolutePath);
    if (validatedPath) {
      return validatedPath;
    }
  }
  return null;
};

const sanitizeUploadFilenameSegment = (value: string): string => {
  const normalized = value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-+/g, '-');
  return normalized.replace(/^-+|-+$/g, '') || 'product';
};

const resolveOrderedUploadFilePrefix = (product: ProductWithImages): string =>
  sanitizeUploadFilenameSegment(product.baseProductId || product.sku || product.id || 'product');

const resolveOrderedUploadExtension = (sourcePath: string, sourceUrl: string | null): string => {
  const localExtension = path.extname(sourcePath).trim().toLowerCase();
  if (localExtension) {
    return localExtension;
  }
  if (sourceUrl) {
    try {
      const parsed = new URL(sourceUrl, resolveAppBaseUrl());
      const remoteExtension = path.extname(parsed.pathname).trim().toLowerCase();
      if (remoteExtension) {
        return remoteExtension;
      }
    } catch {
    }
  }
  return '.jpg';
};

const stageOrderedLocalProductImagePaths = async ({
  product,
  localImagePaths,
  imageUrls,
}: {
  product: ProductWithImages;
  localImagePaths: string[];
  imageUrls: string[];
}): Promise<string[]> => {
  if (localImagePaths.length === 0) {
    return [];
  }
  const directory = await mkdtemp(path.join(tmpdir(), VINTED_ORDERED_UPLOAD_DIR_PREFIX));
  const prefix = resolveOrderedUploadFilePrefix(product);
  const padWidth = Math.max(2, String(localImagePaths.length).length);
  const stagedPaths: string[] = [];
  for (let index = 0; index < localImagePaths.length; index += 1) {
    const sourcePath = localImagePaths[index];
    if (!sourcePath) continue;
    const imageUrl = imageUrls[index];
    const extension = resolveOrderedUploadExtension(sourcePath, imageUrl ?? null);
    const filename = `${prefix}_${String(index + 1).padStart(padWidth, '0')}${extension}`;
    const stagedPath = path.join(directory, filename);
    await copyFile(sourcePath, stagedPath);
    stagedPaths.push(stagedPath);
  }
  return stagedPaths;
};

export type VintedProductImageUploadPlan = {
  imageUrls: string[];
  localImagePaths: string[];
  imageCount: number;
  localImageCoverageCount: number;
};

export const resolveVintedProductImageUploadPlan = async (
  product: ProductWithImages
): Promise<VintedProductImageUploadPlan> => {
  const imageEntries = collectCanonicalVintedProductImageEntries(product);
  const imageUrls = imageEntries
    .map((entry) => entry.imageUrls[0] ?? entry.localCandidates[0] ?? null)
    .filter((value): value is string => value !== null);
  const validatedLocalPaths = await Promise.all(
    imageEntries.map((entry) => resolveFirstValidLocalProductImagePath(entry.localCandidates))
  );
  const localImageCoverageCount = validatedLocalPaths.filter(
    (candidate): candidate is string => candidate !== null
  ).length;
  const orderedValidatedLocalPaths =
    imageUrls.length > 0 && localImageCoverageCount === imageUrls.length
      ? validatedLocalPaths.filter((candidate): candidate is string => candidate !== null)
      : [];
  const localImagePaths =
    orderedValidatedLocalPaths.length === imageUrls.length
      ? await stageOrderedLocalProductImagePaths({
          product,
          localImagePaths: orderedValidatedLocalPaths,
          imageUrls,
        }).catch(() => [])
      : [];

  return {
    imageUrls,
    localImagePaths,
    imageCount: imageUrls.length,
    localImageCoverageCount,
  };
};
