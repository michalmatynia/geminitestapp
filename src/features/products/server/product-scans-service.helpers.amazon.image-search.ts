import 'server-only';

import type { createDefaultProductScannerSettings } from '@/features/products/scanner-settings';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import type {
  ProductScannerAmazonImageSearchProvider,
} from '@/shared/contracts/products/scanner-settings';

import {
  PRODUCT_SCAN_URL_MAX_LENGTH,
} from './product-scans-service.constants';
import { readOptionalString, toRecord } from './product-scans-service.helpers.base';
import {
  AMAZON_IMAGE_SEARCH_PROVIDER_FALLBACK_ORDER,
} from './product-scans-service.helpers.amazon.constants';

type ScannerSettings = ReturnType<typeof createDefaultProductScannerSettings>;
type AmazonImageSearchProvider = ScannerSettings['amazonImageSearchProvider'];

export const normalizeAmazonImageSearchProvider = (
  value: unknown
): AmazonImageSearchProvider | null => {
  if (
    value === 'google_images_upload' ||
    value === 'google_images_url' ||
    value === 'google_lens_upload'
  ) {
    return value;
  }
  return null;
};

export const resolveAmazonImageSearchProvider = (
  rawResult: unknown,
  scannerSettings: ScannerSettings
): AmazonImageSearchProvider => {
  const rawRecord = toRecord(rawResult);
  const rawProvider = normalizeAmazonImageSearchProvider(rawRecord?.['imageSearchProvider']);
  return rawProvider ?? scannerSettings.amazonImageSearchProvider;
};

export const normalizeAmazonImageSearchPageUrl = (value: unknown): string | null => {
  const rawUrl = readOptionalString(value, PRODUCT_SCAN_URL_MAX_LENGTH);
  if (rawUrl === null) return null;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString().slice(0, PRODUCT_SCAN_URL_MAX_LENGTH);
  } catch {
    return null;
  }
};

export const resolveAmazonImageSearchPageUrl = (
  rawResult: unknown,
  scannerSettings: ScannerSettings
): string | null => {
  const rawRecord = toRecord(rawResult);
  return (
    normalizeAmazonImageSearchPageUrl(rawRecord?.['imageSearchPageUrl']) ??
    normalizeAmazonImageSearchPageUrl(scannerSettings.amazonImageSearchPageUrl)
  );
};

export const resolveAmazonImageSearchProviderHistory = (
  rawResult: unknown,
  currentProvider: AmazonImageSearchProvider
): AmazonImageSearchProvider[] => {
  const rawRecord = toRecord(rawResult);
  const imageSearchProviderHistory = rawRecord?.['imageSearchProviderHistory'];
  const history = Array.isArray(imageSearchProviderHistory)
    ? imageSearchProviderHistory
        .map((value) => normalizeAmazonImageSearchProvider(value))
        .filter((value): value is AmazonImageSearchProvider => value !== null)
    : [];
  const current = normalizeAmazonImageSearchProvider(rawRecord?.['imageSearchProvider']);
  return Array.from(new Set([...history, current ?? currentProvider, currentProvider]));
};

const isHttpCandidateUrl = (value: unknown): boolean => {
  const candidateUrl = readOptionalString(value, PRODUCT_SCAN_URL_MAX_LENGTH);
  if (candidateUrl === null) return false;
  try {
    const parsed = new URL(candidateUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const canUseAmazonImageSearchProvider = (input: {
  provider: ProductScannerAmazonImageSearchProvider;
  imageCandidates: ProductScanRecord['imageCandidates'] | null | undefined;
}): boolean => {
  if (input.provider !== 'google_images_url') return true;
  return (input.imageCandidates ?? []).some((candidate) => isHttpCandidateUrl(candidate.url));
};

const resolveAmazonImageSearchFallbackCandidates = (
  scannerSettings: ScannerSettings
): ProductScannerAmazonImageSearchProvider[] => {
  const configuredFallback = normalizeAmazonImageSearchProvider(
    scannerSettings.amazonImageSearchFallbackProvider
  );
  return Array.from(
    new Set(
      [configuredFallback, ...AMAZON_IMAGE_SEARCH_PROVIDER_FALLBACK_ORDER].filter(
        (value): value is ProductScannerAmazonImageSearchProvider => value !== null
      )
    )
  );
};

export const resolveAmazonImageSearchFallbackProvider = (input: {
  rawResult: unknown;
  scannerSettings: ScannerSettings;
  currentProvider: AmazonImageSearchProvider;
  imageCandidates?: ProductScanRecord['imageCandidates'] | null;
}): AmazonImageSearchProvider | null => {
  const history = resolveAmazonImageSearchProviderHistory(input.rawResult, input.currentProvider);
  for (const provider of resolveAmazonImageSearchFallbackCandidates(input.scannerSettings)) {
    if (provider === input.currentProvider) continue;
    if (history.includes(provider)) continue;
    if (!canUseAmazonImageSearchProvider({ provider, imageCandidates: input.imageCandidates })) continue;
    return provider;
  }
  return null;
};
