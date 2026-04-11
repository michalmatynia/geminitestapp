import type { ProductScanAsinUpdateStatus, ProductScanImageCandidate, ProductScanStatus } from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products/product';

export const PRODUCT_SCAN_IMAGE_CANDIDATE_LIMIT = 3;
const PRODUCT_SCAN_DISPLAY_NAME_MAX_LENGTH = 300;

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeAmazonAsin = (value: unknown): string | null => {
  const normalized = normalizeOptionalString(value)?.toUpperCase() ?? null;
  if (!normalized) return null;
  return /^[A-Z0-9]{10}$/.test(normalized) ? normalized : null;
};

export const resolveProductScanDisplayName = (product: Pick<
  ProductWithImages,
  'id' | 'name_en' | 'name_pl' | 'name_de' | 'sku'
>): string => {
  const rawName =
    product.name_en?.trim() ||
    product.name_pl?.trim() ||
    product.name_de?.trim() ||
    product.sku?.trim() ||
    product.id;

  return rawName.slice(0, PRODUCT_SCAN_DISPLAY_NAME_MAX_LENGTH);
};

export const resolveProductScanImageCandidates = (
  product: Pick<ProductWithImages, 'images' | 'imageLinks'>,
  limit = PRODUCT_SCAN_IMAGE_CANDIDATE_LIMIT
): ProductScanImageCandidate[] => {
  const seen = new Set<string>();
  const candidates: ProductScanImageCandidate[] = [];

  for (const image of Array.isArray(product.images) ? product.images : []) {
    const imageFile = image.imageFile;
    const url =
      normalizeOptionalString(imageFile?.publicUrl) ?? normalizeOptionalString(imageFile?.url);
    const filepath = normalizeOptionalString(imageFile?.filepath);
    const id = normalizeOptionalString(imageFile?.id) ?? normalizeOptionalString(image.imageFileId);

    if (!filepath && !url) {
      continue;
    }

    const key = filepath ?? url ?? id;

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    candidates.push({
      id,
      url,
      filepath,
      filename: normalizeOptionalString(imageFile?.filename),
    });

    if (candidates.length >= limit) {
      break;
    }
  }

  for (const imageLink of Array.isArray(product.imageLinks) ? product.imageLinks : []) {
    const normalizedUrl = normalizeOptionalString(imageLink);
    if (!normalizedUrl || seen.has(normalizedUrl)) {
      continue;
    }

    seen.add(normalizedUrl);
    candidates.push({
      id: null,
      url: normalizedUrl,
      filepath: null,
      filename: null,
    });

    if (candidates.length >= limit) {
      break;
    }
  }

  return candidates;
};

export type AmazonAsinResolution = {
  scanStatus: ProductScanStatus;
  asinUpdateStatus: ProductScanAsinUpdateStatus;
  normalizedDetectedAsin: string | null;
  message: string | null;
};

export const resolveDetectedAmazonAsinOutcome = (input: {
  existingAsin: string | null | undefined;
  detectedAsin: string | null | undefined;
}): AmazonAsinResolution => {
  const detectedAsin = normalizeAmazonAsin(input.detectedAsin);
  if (!detectedAsin) {
    return {
      scanStatus: 'failed',
      asinUpdateStatus: 'failed',
      normalizedDetectedAsin: null,
      message: 'Detected Amazon result did not include a valid ASIN.',
    };
  }

  const existingAsin = normalizeAmazonAsin(input.existingAsin);
  if (!existingAsin) {
    return {
      scanStatus: 'completed',
      asinUpdateStatus: 'updated',
      normalizedDetectedAsin: detectedAsin,
      message: 'Product ASIN filled from Amazon scan.',
    };
  }

  if (existingAsin === detectedAsin) {
    return {
      scanStatus: 'completed',
      asinUpdateStatus: 'unchanged',
      normalizedDetectedAsin: detectedAsin,
      message: 'Product already had the detected ASIN.',
    };
  }

  return {
    scanStatus: 'conflict',
    asinUpdateStatus: 'conflict',
    normalizedDetectedAsin: detectedAsin,
    message: `Detected ASIN ${detectedAsin} differs from existing ASIN ${existingAsin}.`,
  };
};
