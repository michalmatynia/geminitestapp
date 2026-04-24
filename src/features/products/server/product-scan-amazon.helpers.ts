import type { ProductScanAsinUpdateStatus, ProductScanStatus } from '@/shared/contracts/product-scans';
import {
  normalizeOptionalProductScanString,
} from './product-scan-shared.helpers';

export {
  PRODUCT_SCAN_IMAGE_CANDIDATE_LIMIT,
  resolveProductScanDisplayName,
  resolveProductScanImageCandidates,
} from './product-scan-shared.helpers';

export const normalizeAmazonAsin = (value: unknown): string | null => {
  const normalized = normalizeOptionalProductScanString(value)?.toUpperCase() ?? null;
  if (!normalized) return null;
  return /^[A-Z0-9]{10}$/.test(normalized) ? normalized : null;
};

const AMAZON_ASIN_SHORTCUT_MARKETPLACE_ORIGINS = [
  'https://www.amazon.com',
  'https://www.amazon.co.uk',
  'https://www.amazon.de',
  'https://www.amazon.fr',
  'https://www.amazon.nl',
  'https://www.amazon.pl',
] as const;

export const buildAmazonDirectCandidateUrlsFromAsin = (value: unknown): string[] => {
  const normalizedAsin = normalizeAmazonAsin(value);
  if (normalizedAsin === null) {
    return [];
  }

  return AMAZON_ASIN_SHORTCUT_MARKETPLACE_ORIGINS.map(
    (origin) => `${origin}/dp/${normalizedAsin}`
  );
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
