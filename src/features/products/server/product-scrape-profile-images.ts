import 'server-only';

import type {
  ProductScrapeProfileImageImportMode,
  ProductScrapeProfileRuntimeProgressUpdate,
} from '@/shared/contracts/products/scrape-profiles';
import { DEFAULT_IMAGE_SLOT_COUNT } from '@/shared/lib/image-slots';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { ProductScrapeCandidate } from './product-scrape-profiles.candidates';
import { fetchSourcePageImageLinks } from './product-scrape-profile-image-download';
import {
  normalizeProductScrapeImageStepControls,
  type ProductScrapeImageStepControls,
} from './product-scrape-profile-image-step-controls';
import {
  downloadRemoteProductImageFile,
  type DownloadedRemoteProductImage,
} from './product-remote-image-download';
import { uploadProductImageFileWithLocalFallback } from './product-local-image-file-fallback';
import { throwIfProductScrapeAborted } from './product-scrape-profile-abort';

export type ProductScrapeImagePayload = {
  imageFileIds?: string[];
  imageLinks: string[];
};

type DownloadedScrapeImage = DownloadedRemoteProductImage;

type UploadedScrapeImage = {
  id: string;
};

type ScrapeImageUploadResult = {
  imageLinks: string[];
  uploadedImages: Array<UploadedScrapeImage | null>;
};

type ScrapeImageUploadBatch = ScrapeImageUploadResult & {
  uploadCount: number;
};

type ScrapeImageImportContext = {
  candidate: ProductScrapeCandidate;
  dryRun: boolean;
  imageImportMode: ProductScrapeProfileImageImportMode;
  imageStepControls?: Partial<ProductScrapeImageStepControls>;
  reportProgress?: ProductScrapeProfileProgressReporter;
  signal?: AbortSignal;
};

type DownloadPreferredScrapeImagesOptions = {
  allowProductGalleryFallback: boolean;
  reportProgress?: ProductScrapeProfileProgressReporter;
  signal?: AbortSignal;
};

type ProductScrapeProfileProgressReporter = (
  progress: ProductScrapeProfileRuntimeProgressUpdate
) => Promise<void>;

const reportImageProgress = async (
  reporter: ProductScrapeProfileProgressReporter | undefined,
  progress: {
    current?: number | null;
    message: string;
    stage: string;
    total?: number | null;
  }
): Promise<void> => {
  await reporter?.({
    current: progress.current ?? null,
    message: progress.message,
    stage: progress.stage,
    total: progress.total ?? null,
  });
};

const downloadScrapeImage = async (
  candidate: ProductScrapeCandidate,
  imageUrl: string,
  index: number,
  signal: AbortSignal | undefined
): Promise<DownloadedScrapeImage | null> => {
  try {
    throwIfProductScrapeAborted(signal);
    return await downloadRemoteProductImageFile({
      fallbackFilenamePrefix: candidate.sku.toLowerCase(),
      imageUrl,
      index,
      refererUrl: candidate.sourceUrl,
      signal,
      sourcePageUrl: candidate.sourceUrl,
    });
  } catch (error) {
    throwIfProductScrapeAborted(signal);
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
  image: DownloadedScrapeImage,
  signal: AbortSignal | undefined
): Promise<UploadedScrapeImage | null> => {
  try {
    throwIfProductScrapeAborted(signal);
    const uploaded = await uploadProductImageFileWithLocalFallback({
      action: 'uploadScrapeImage',
      file: image.file,
      filename: image.filename,
      service: 'product-scrape-profiles',
      sku: candidate.sku,
      sourceUrl: image.sourceUrl,
    });
    throwIfProductScrapeAborted(signal);
    return {
      id: uploaded.id,
    };
  } catch (error) {
    throwIfProductScrapeAborted(signal);
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
  imageLinks: string[],
  signal: AbortSignal | undefined
): Promise<Array<UploadedScrapeImage | null>> =>
  Promise.all(
    imageLinks.map(async (imageUrl, index) => {
      const downloaded = await downloadScrapeImage(candidate, imageUrl, index, signal);
      return downloaded === null ? null : await uploadScrapeImage(candidate, downloaded, signal);
    })
  );

const countUploadedImages = (uploadedImages: Array<UploadedScrapeImage | null>): number =>
  uploadedImages.filter((uploaded) => uploaded !== null).length;

const resolveFallbackImageLinks = async (
  candidate: ProductScrapeCandidate,
  options: DownloadPreferredScrapeImagesOptions
): Promise<string[]> => {
  if (!options.allowProductGalleryFallback) return [];
  await reportImageProgress(options.reportProgress, {
    message: `Collecting product gallery fallback images for ${candidate.sku}.`,
    stage: 'product_gallery_images_collecting',
  });
  return await fetchSourcePageImageLinks(candidate, options.signal);
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

const downloadInitialScrapeImages = async (
  candidate: ProductScrapeCandidate,
  imageLinks: string[],
  options: DownloadPreferredScrapeImagesOptions
): Promise<ScrapeImageUploadBatch> => {
  const initialImageLinks = await resolveInitialFileModeImageLinks(candidate, imageLinks, options);
  throwIfProductScrapeAborted(options.signal);
  await reportImageProgress(options.reportProgress, {
    current: 0,
    message: `Downloading and uploading ${initialImageLinks.length} scraped image(s) for ${candidate.sku}.`,
    stage: 'scrape_images_downloading',
    total: initialImageLinks.length,
  });
  const initialUploadedImages = await downloadAndUploadScrapeImages(
    candidate,
    initialImageLinks,
    options.signal
  );
  throwIfProductScrapeAborted(options.signal);
  const uploadCount = countUploadedImages(initialUploadedImages);
  await reportImageProgress(options.reportProgress, {
    current: uploadCount,
    message: `Uploaded ${uploadCount} of ${initialImageLinks.length} scraped image(s) for ${candidate.sku}.`,
    stage: 'scrape_images_uploaded',
    total: initialImageLinks.length,
  });
  return { imageLinks: initialImageLinks, uploadCount, uploadedImages: initialUploadedImages };
};

const downloadFallbackScrapeImages = async (
  candidate: ProductScrapeCandidate,
  options: DownloadPreferredScrapeImagesOptions
): Promise<ScrapeImageUploadBatch | null> => {
  await reportImageProgress(options.reportProgress, {
    message: `Collecting product gallery fallback images for ${candidate.sku}.`,
    stage: 'product_gallery_images_collecting',
  });
  const fallbackImageLinks = (await fetchSourcePageImageLinks(candidate, options.signal)).slice(
    0,
    DEFAULT_IMAGE_SLOT_COUNT
  );
  if (fallbackImageLinks.length === 0) {
    return null;
  }

  await reportImageProgress(options.reportProgress, {
    current: 0,
    message: `Downloading and uploading ${fallbackImageLinks.length} gallery image(s) for ${candidate.sku}.`,
    stage: 'product_gallery_images_downloading',
    total: fallbackImageLinks.length,
  });
  const fallbackUploadedImages = await downloadAndUploadScrapeImages(
    candidate,
    fallbackImageLinks,
    options.signal
  );
  const uploadCount = countUploadedImages(fallbackUploadedImages);
  return { imageLinks: fallbackImageLinks, uploadCount, uploadedImages: fallbackUploadedImages };
};

const shouldTryFallbackImages = (
  initialBatch: ScrapeImageUploadBatch,
  scrapedImageLinkCount: number,
  options: DownloadPreferredScrapeImagesOptions
): boolean => {
  const allInitialImagesUploaded = initialBatch.uploadCount === initialBatch.imageLinks.length;
  return !allInitialImagesUploaded && options.allowProductGalleryFallback && scrapedImageLinkCount > 0;
};

const downloadPreferredScrapeImages = async (
  candidate: ProductScrapeCandidate,
  imageLinks: string[],
  options: DownloadPreferredScrapeImagesOptions
): Promise<ScrapeImageUploadResult> => {
  const initialBatch = await downloadInitialScrapeImages(candidate, imageLinks, options);
  if (!shouldTryFallbackImages(initialBatch, imageLinks.length, options)) return initialBatch;
  const fallbackBatch = await downloadFallbackScrapeImages(candidate, options);
  if (fallbackBatch === null || fallbackBatch.uploadCount <= initialBatch.uploadCount) {
    return initialBatch;
  }
  return fallbackBatch;
};

const toImageFileIds = (uploadedImages: Array<UploadedScrapeImage | null>): string[] =>
  uploadedImages
    .map((uploaded) => uploaded?.id ?? null)
    .filter((id): id is string => id !== null);

const buildFileModeImagePayload = (result: ScrapeImageUploadResult): ProductScrapeImagePayload => {
  const imageFileIds = toImageFileIds(result.uploadedImages);
  const sourceImageLinks = result.imageLinks;
  if (sourceImageLinks.length === 0) return { imageLinks: [] };
  if (imageFileIds.length !== sourceImageLinks.length) {
    throw new Error(
      `Failed to download ${sourceImageLinks.length - imageFileIds.length} scraped image(s).`
    );
  }
  return {
    imageFileIds,
    imageLinks: sourceImageLinks,
  };
};

export const resolveScrapeImagePayload = async ({
  candidate,
  dryRun,
  imageImportMode,
  imageStepControls,
  reportProgress,
  signal,
}: ScrapeImageImportContext): Promise<ProductScrapeImagePayload> => {
  throwIfProductScrapeAborted(signal);
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
        reportProgress,
        signal,
      }
    )
  );
};
