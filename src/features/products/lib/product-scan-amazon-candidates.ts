import type { ProductScanRecord } from '@/shared/contracts/product-scans';

export type ProductScanAmazonCandidatePreview = {
  id: string | null;
  matchedImageId: string | null;
  url: string;
  asin: string | null;
  marketplaceDomain: string | null;
  title: string | null;
  snippet: string | null;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  heroImageArtifactName: string | null;
  artifactKey: string | null;
  rank: number | null;
};

type ProductScanAmazonCandidateSelectionScan =
  | Partial<Pick<ProductScanRecord, 'provider' | 'rawResult' | 'amazonDetails' | 'asin'>>
  | null
  | undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && Array.isArray(value) === false;

const readText = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const readPositiveInt = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.trunc(value) : null;

const normalizePreview = (
  value: unknown,
  index: number
): ProductScanAmazonCandidatePreview | null => {
  if (isRecord(value) === false) {
    return null;
  }

  const url = readText(value['url']);
  if (url === null) {
    return null;
  }

  return {
    id: readText(value['id']),
    matchedImageId: readText(value['matchedImageId']),
    url,
    asin: readText(value['asin']),
    marketplaceDomain: readText(value['marketplaceDomain']),
    title: readText(value['title']),
    snippet: readText(value['snippet']),
    heroImageUrl: readText(value['heroImageUrl']),
    heroImageAlt: readText(value['heroImageAlt']),
    heroImageArtifactName: readText(value['heroImageArtifactName']),
    artifactKey: readText(value['artifactKey']),
    rank: readPositiveInt(value['rank']) ?? index + 1,
  };
};

const normalizeCandidateResultsFallback = (value: unknown): ProductScanAmazonCandidatePreview[] => {
  if (Array.isArray(value) === false) {
    return [];
  }

  const previews: ProductScanAmazonCandidatePreview[] = [];
  value.forEach((entry, index) => {
    if (isRecord(entry) === false) {
      return;
    }
    const url = readText(entry['url']);
    if (url === null) {
      return;
    }
    previews.push({
      id: readText(entry['asin']) ?? url,
      matchedImageId: null,
      url,
      asin: readText(entry['asin']),
      marketplaceDomain: readText(entry['marketplaceDomain']),
      title: readText(entry['title']),
      snippet: readText(entry['snippet']),
      heroImageUrl: null,
      heroImageAlt: null,
      heroImageArtifactName: null,
      artifactKey: null,
      rank: readPositiveInt(entry['rank']) ?? index + 1,
    });
  });

  return previews;
};

export const resolveProductScanAmazonCandidatePreviews = (
  scan: { rawResult?: ProductScanRecord['rawResult'] } | null | undefined
): ProductScanAmazonCandidatePreview[] => {
  const rawResult = scan?.rawResult;
  if (isRecord(rawResult) === false) {
    return [];
  }

  if (Array.isArray(rawResult['candidatePreviews'])) {
    return (rawResult['candidatePreviews'] as unknown[])
      .map((entry, index) => normalizePreview(entry, index))
      .filter((entry): entry is ProductScanAmazonCandidatePreview => entry !== null);
  }

  return normalizeCandidateResultsFallback(rawResult['candidateResults']);
};

export const resolveProductScanAmazonCandidateUrls = (
  scan: { rawResult?: ProductScanRecord['rawResult'] } | null | undefined
): string[] => {
  const rawResult = scan?.rawResult;
  if (isRecord(rawResult) === false || Array.isArray(rawResult['candidateUrls']) === false) {
    return resolveProductScanAmazonCandidatePreviews(scan).map((candidate) => candidate.url);
  }

  const urls = (rawResult['candidateUrls'] as unknown[])
    .map((entry) => readText(entry))
    .filter((entry): entry is string => entry !== null);

  return urls.length > 0 ? urls : resolveProductScanAmazonCandidatePreviews(scan).map((candidate) => candidate.url);
};

export const isProductScanAmazonCandidateSelectionReady = (
  scan: ProductScanAmazonCandidateSelectionScan
): boolean => {
  if (scan?.provider !== 'amazon') {
    return false;
  }

  const rawResult = scan.rawResult;
  if (isRecord(rawResult) === false || rawResult['candidateSelectionRequired'] !== true) {
    return false;
  }

  return (
    resolveProductScanAmazonCandidatePreviews(scan).length > 0 &&
    (scan.amazonDetails === null || scan.amazonDetails === undefined) &&
    (typeof scan.asin !== 'string' || scan.asin.trim().length === 0)
  );
};
