import 'server-only';

import type { ProductScrapeProfileImageImportMode } from '@/shared/contracts/products/scrape-profiles';
import { uploadFile } from '@/shared/lib/files/services/image-file-service';
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

type ScrapeImageImportContext = {
  candidate: ProductScrapeCandidate;
  dryRun: boolean;
  imageImportMode: ProductScrapeProfileImageImportMode;
  imageStepControls?: Partial<ProductScrapeImageStepControls>;
};

type DownloadPreferredScrapeImagesOptions = {
  allowProductGalleryFallback: boolean;
};

const downloadScrapeImage = async (
  candidate: ProductScrapeCandidate,
  imageUrl: string,
  index: number
): Promise<DownloadedScrapeImage | null> => {
  try {
    return await downloadRemoteProductImageFile({
      fallbackFilenamePrefix: candidate.sku.toLowerCase(),
      imageUrl,
      index,
      refererUrl: candidate.sourceUrl,
      sourcePageUrl: candidate.sourceUrl,
    });
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
    return {
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
    imageLinks: [],
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
