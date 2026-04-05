import { access, stat } from 'node:fs/promises';
import path from 'node:path';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import {
  resolveAppBaseUrl,
  getPublicPathFromStoredPath,
} from '@/shared/lib/files/services/storage/file-storage-service';
import {
  collectProductImageUrlCandidates,
  collectProductLocalImageCandidates,
  readNormalizedScriptInputStrings,
  resolveScriptInputImageSource,
} from './tradera-browser-images.helpers';

export const MIN_TRADERA_IMAGE_BYTES = 10_240;

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

const resolveDistinctLocalImageCandidates = (product: ProductWithImages): string[] => {
  const candidates = new Set<string>();

  collectProductLocalImageCandidates(product).forEach((value) => {
    const absolutePath = toAbsolutePublicFilePath(value);
    if (absolutePath) {
      candidates.add(absolutePath);
    }
  });

  return Array.from(candidates);
};

const validateLocalProductImagePath = async (candidate: string): Promise<string | null> => {
  try {
    await access(candidate);
    const stats = await stat(candidate);
    if (stats.isFile() && stats.size >= MIN_TRADERA_IMAGE_BYTES) {
      return candidate;
    }
  } catch {
    // Ignore missing or unreadable image files and fall back to URL downloads.
  }

  return null;
};

export const resolveLocalProductImagePaths = async (
  product: ProductWithImages
): Promise<string[]> => {
  const validPaths = await Promise.all(
    resolveDistinctLocalImageCandidates(product).map((candidate) =>
      validateLocalProductImagePath(candidate)
    )
  );

  return validPaths.filter((candidate): candidate is string => candidate !== null);
};

export const resolveScriptInputImageDiagnostics = (
  scriptInput: Record<string, unknown> | null
): {
  imageInputSource: 'local' | 'remote' | 'none';
  localImagePathCount: number;
  imageUrlCount: number;
} => {
  const localImagePaths = readNormalizedScriptInputStrings(scriptInput, 'localImagePaths');
  const imageUrls = readNormalizedScriptInputStrings(scriptInput, 'imageUrls');

  return {
    imageInputSource: resolveScriptInputImageSource(localImagePaths.length, imageUrls.length),
    localImagePathCount: localImagePaths.length,
    imageUrlCount: imageUrls.length,
  };
};
