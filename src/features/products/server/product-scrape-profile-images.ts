import 'server-only';

import path from 'path';

import type { ImageFileRecord } from '@/shared/contracts/files';
import type { ProductScrapeProfileImageImportMode } from '@/shared/contracts/products/scrape-profiles';
import { uploadFile } from '@/shared/lib/files/services/image-file-service';
import { DEFAULT_IMAGE_SLOT_COUNT } from '@/shared/lib/image-slots';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { ProductScrapeCandidate } from './product-scrape-profiles.candidates';
import {
  fetchScrapeImageResponse,
  fetchSourcePageImageLinks,
} from './product-scrape-profile-image-download';
import {
  normalizeProductScrapeImageStepControls,
  type ProductScrapeImageStepControls,
} from './product-scrape-profile-image-step-controls';

export type ProductScrapeImagePayload = {
  imageFileIds?: string[];
  imageLinks: string[];
};

type DownloadedScrapeImage = {
  file: File;
  filename: string;
  sourceUrl: string;
};

type UploadedScrapeImage = {
  filepath: string;
  id: string;
};

type ScrapeImageUploadResult = {
  imageLinks: string[];
  uploadedImages: Array<UploadedScrapeImage | null>;
};

type ScrapeImageImportContext = {
  candidate: ProductScrapeCandidate;
  dryRun: boolean;
  imageImportMode: ProductScrapeProfileImageImportMode;
  imageStepControls?: Partial<ProductScrapeImageStepControls>;
};

type DownloadPreferredScrapeImagesOptions = {
  allowProductGalleryFallback: boolean;
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

const resolveUploadedImagePath = (uploaded: ImageFileRecord): string => {
  const filepath = uploaded.filepath.trim();
  if (filepath.length > 0) return filepath;

  const publicUrl = uploaded.publicUrl?.trim() ?? '';
  if (publicUrl.length > 0) return publicUrl;

  const url = uploaded.url?.trim() ?? '';
  if (url.length > 0) return url;

  return '';
};

const downloadScrapeImage = async (
  candidate: ProductScrapeCandidate,
  imageUrl: string,
  index: number
): Promise<DownloadedScrapeImage | null> => {
  try {
    const response = await fetchScrapeImageResponse(candidate, imageUrl);
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
): Promise<UploadedScrapeImage | null> => {
  try {
    const uploaded = await uploadFile(image.file, {
      category: 'products',
      sku: candidate.sku,
      filenameOverride: image.filename,
    });
    const filepath = resolveUploadedImagePath(uploaded);
    return {
      filepath: filepath.length > 0 ? filepath : image.sourceUrl,
      id: uploaded.id,
    };
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

const downloadAndUploadScrapeImages = async (
  candidate: ProductScrapeCandidate,
  imageLinks: string[]
): Promise<Array<UploadedScrapeImage | null>> =>
  Promise.all(
    imageLinks.map(async (imageUrl, index) => {
      const downloaded = await downloadScrapeImage(candidate, imageUrl, index);
      return downloaded === null ? null : await uploadScrapeImage(candidate, downloaded);
    })
  );

const countUploadedImages = (uploadedImages: Array<UploadedScrapeImage | null>): number =>
  uploadedImages.filter((uploaded) => uploaded !== null).length;

const resolveFallbackImageLinks = async (
  candidate: ProductScrapeCandidate,
  options: DownloadPreferredScrapeImagesOptions
): Promise<string[]> => {
  if (!options.allowProductGalleryFallback) return [];
  return await fetchSourcePageImageLinks(candidate);
};

const resolveInitialFileModeImageLinks = async (
  candidate: ProductScrapeCandidate,
  imageLinks: string[],
  options: DownloadPreferredScrapeImagesOptions
): Promise<string[]> =>
  (imageLinks.length > 0 ? imageLinks : await resolveFallbackImageLinks(candidate, options)).slice(
    0,
    DEFAULT_IMAGE_SLOT_COUNT
  );

const downloadPreferredScrapeImages = async (
  candidate: ProductScrapeCandidate,
  imageLinks: string[],
  options: DownloadPreferredScrapeImagesOptions
): Promise<ScrapeImageUploadResult> => {
  const initialImageLinks = await resolveInitialFileModeImageLinks(candidate, imageLinks, options);
  const initialUploadedImages = await downloadAndUploadScrapeImages(candidate, initialImageLinks);
  const initialUploadCount = countUploadedImages(initialUploadedImages);
  const allInitialImagesUploaded = initialUploadCount === initialImageLinks.length;
  if (allInitialImagesUploaded || !options.allowProductGalleryFallback || imageLinks.length === 0) {
    return {
      imageLinks: initialImageLinks,
      uploadedImages: initialUploadedImages,
    };
  }

  const fallbackImageLinks = (await fetchSourcePageImageLinks(candidate)).slice(
    0,
    DEFAULT_IMAGE_SLOT_COUNT
  );
  if (fallbackImageLinks.length === 0) {
    return {
      imageLinks: initialImageLinks,
      uploadedImages: initialUploadedImages,
    };
  }

  const fallbackUploadedImages = await downloadAndUploadScrapeImages(candidate, fallbackImageLinks);
  if (countUploadedImages(fallbackUploadedImages) <= initialUploadCount) {
    return {
      imageLinks: initialImageLinks,
      uploadedImages: initialUploadedImages,
    };
  }

  return {
    imageLinks: fallbackImageLinks,
    uploadedImages: fallbackUploadedImages,
  };
};

const toImageFileIds = (uploadedImages: Array<UploadedScrapeImage | null>): string[] =>
  uploadedImages
    .map((uploaded) => uploaded?.id ?? null)
    .filter((id): id is string => id !== null);

const toStoredImageLinks = (
  imageLinks: string[],
  uploadedImages: Array<UploadedScrapeImage | null>
): string[] => imageLinks.map((imageUrl, index) => uploadedImages[index]?.filepath ?? imageUrl);

const buildFileModeImagePayload = (result: ScrapeImageUploadResult): ProductScrapeImagePayload => {
  const imageFileIds = toImageFileIds(result.uploadedImages);
  const sourceImageLinks = result.imageLinks;
  if (imageFileIds.length === 0) return { imageLinks: sourceImageLinks };
  return {
    imageFileIds,
    imageLinks: toStoredImageLinks(sourceImageLinks, result.uploadedImages),
  };
};

export const resolveScrapeImagePayload = async ({
  candidate,
  dryRun,
  imageImportMode,
  imageStepControls,
}: ScrapeImageImportContext): Promise<ProductScrapeImagePayload> => {
  const controls = normalizeProductScrapeImageStepControls(imageStepControls);
  const imageLinks = controls.collectScrapedImageLinks
    ? candidate.imageLinks.slice(0, DEFAULT_IMAGE_SLOT_COUNT)
    : [];
  if (!controls.applyImagePayload) return { imageLinks: [] };
  if (dryRun || imageImportMode === 'links') return { imageLinks };
  if (!controls.uploadProductImages) return { imageLinks };

  return buildFileModeImagePayload(
    await downloadPreferredScrapeImages(
      candidate,
      controls.downloadScrapedImages ? imageLinks : [],
      {
        allowProductGalleryFallback:
          controls.collectProductGalleryImages && controls.downloadProductGalleryImages,
      }
    )
  );
};
