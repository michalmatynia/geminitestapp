import 'server-only';

import path from 'path';

import type { ProductScrapeProfileImageImportMode } from '@/shared/contracts/products/scrape-profiles';
import { uploadFile } from '@/shared/lib/files/services/image-file-service';
import { DEFAULT_IMAGE_SLOT_COUNT } from '@/shared/lib/image-slots';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { ProductScrapeCandidate } from './product-scrape-profiles.candidates';

export type ProductScrapeImagePayload = {
  imageFileIds?: string[];
  imageLinks: string[];
};

type DownloadedScrapeImage = {
  file: File;
  filename: string;
  sourceUrl: string;
};

type ScrapeImageImportContext = {
  candidate: ProductScrapeCandidate;
  dryRun: boolean;
  imageImportMode: ProductScrapeProfileImageImportMode;
};

const extensionForMimeType = (mimetype: string): string => {
  const normalized = mimetype.trim().toLowerCase();
  if (normalized === 'image/png') return '.png';
  if (normalized === 'image/webp') return '.webp';
  if (normalized === 'image/gif') return '.gif';
  if (normalized === 'image/avif') return '.avif';
  if (normalized === 'image/svg+xml') return '.svg';
  return '.jpg';
};

const resolveImageFilename = (
  candidate: ProductScrapeCandidate,
  imageUrl: string,
  mimetype: string,
  index: number
): string => {
  try {
    const sourceName = path.basename(new URL(imageUrl).pathname).trim();
    if (path.extname(sourceName).length > 0) return sourceName;
  } catch {
    // Fall through to the deterministic SKU-based fallback.
  }

  return `${candidate.sku.toLowerCase()}-${index + 1}${extensionForMimeType(mimetype)}`;
};

const resolveImageMimeType = (input: {
  blobType?: string | null;
  headerType?: string | null;
}): string => {
  const blobType = input.blobType?.trim() ?? '';
  const headerType = input.headerType?.trim() ?? '';
  const mimetype = blobType.length > 0 ? blobType : headerType;
  if (mimetype.length === 0) return 'image/jpeg';
  if (!mimetype.toLowerCase().startsWith('image/')) {
    throw new Error(`URL does not point to an image: ${mimetype}`);
  }
  return mimetype;
};

const createDownloadedImageFile = (blob: Blob, filename: string, mimetype: string): File => {
  if (typeof File === 'function') {
    return new File([blob], filename, { type: mimetype });
  }

  return Object.assign(blob, {
    lastModified: Date.now(),
    name: filename,
  }) as File;
};

const downloadScrapeImage = async (
  candidate: ProductScrapeCandidate,
  imageUrl: string,
  index: number
): Promise<DownloadedScrapeImage | null> => {
  try {
    const response = await fetch(imageUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to download image (${response.status}).`);

    const blob = await response.blob();
    if (blob.size <= 0) throw new Error('Downloaded image is empty.');

    const mimetype = resolveImageMimeType({
      blobType: blob.type,
      headerType: response.headers.get('content-type'),
    });
    const filename = resolveImageFilename(candidate, imageUrl, mimetype, index);
    return {
      file: createDownloadedImageFile(blob, filename, mimetype),
      filename,
      sourceUrl: imageUrl,
    };
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'product-scrape-profiles',
      action: 'downloadScrapeImage',
      sku: candidate.sku,
      sourceUrl: imageUrl,
    });
    return null;
  }
};

const uploadScrapeImage = async (
  candidate: ProductScrapeCandidate,
  image: DownloadedScrapeImage
): Promise<string | null> => {
  try {
    const uploaded = await uploadFile(image.file, {
      category: 'products',
      sku: candidate.sku,
      filenameOverride: image.filename,
    });
    return uploaded.id;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'product-scrape-profiles',
      action: 'uploadScrapeImage',
      sku: candidate.sku,
      sourceUrl: image.sourceUrl,
      filename: image.filename,
    });
    return null;
  }
};

export const resolveScrapeImagePayload = async ({
  candidate,
  dryRun,
  imageImportMode,
}: ScrapeImageImportContext): Promise<ProductScrapeImagePayload> => {
  const imageLinks = candidate.imageLinks.slice(0, DEFAULT_IMAGE_SLOT_COUNT);
  if (dryRun || imageImportMode === 'links' || imageLinks.length === 0) {
    return { imageLinks };
  }

  const imageFileIds = (
    await Promise.all(
      imageLinks.map(async (imageUrl, index) => {
        const downloaded = await downloadScrapeImage(candidate, imageUrl, index);
        return downloaded === null ? null : await uploadScrapeImage(candidate, downloaded);
      })
    )
  ).filter((id): id is string => id !== null);

  return imageFileIds.length > 0 ? { imageLinks, imageFileIds } : { imageLinks };
};
