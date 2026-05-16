import type {
  ProductScanAmazonDetails as ProductScanAmazonDetailsValue,
  ProductScanRecord,
} from '@/shared/contracts/product-scans';
import { hasText } from './ProductScanAmazonDetails.format';
import {
  resolveAmazonExtractionProvenance,
  resolveRejectedAmazonCandidateBreakdown,
  resolveRejectedAmazonCandidateCount,
} from './ProductScanAmazonDetails.provenance';
import type {
  AmazonScanQualitySummary,
  ProductScanAmazonQualityScan,
} from './ProductScanAmazonDetails.types';

type KnownProductScanAmazonDetails = NonNullable<ProductScanAmazonDetailsValue>;

export const hasProductScanAmazonDetails = (
  details: ProductScanAmazonDetailsValue | null | undefined
): boolean => {
  if (details === null || details === undefined) return false;
  return hasAmazonDetailText(details) || hasAmazonDetailCollections(details);
};

const hasAmazonDetailText = (details: KnownProductScanAmazonDetails): boolean =>
  [
    details.brand,
    details.manufacturer,
    details.modelNumber,
    details.partNumber,
    details.color,
    details.style,
    details.material,
    details.size,
    details.pattern,
    details.finish,
    details.itemDimensions,
    details.packageDimensions,
    details.itemWeight,
    details.packageWeight,
    details.bestSellersRank,
    details.ean,
    details.gtin,
    details.upc,
    details.isbn,
  ].some((value) => hasText(value));

const hasAmazonDetailCollections = (details: KnownProductScanAmazonDetails): boolean =>
  details.bulletPoints.length > 0 || details.attributes.length > 0 || details.rankings.length > 0;

export const resolveAmazonScanQualitySummary = (
  scan: ProductScanAmazonQualityScan
): AmazonScanQualitySummary | null => {
  const provenance = resolveAmazonExtractionProvenance(scan.steps);
  const usedCaptcha = (scan.steps ?? []).some((step) => step.key === 'google_captcha');
  const flags = {
    hasAsin: hasText(scan.asin),
    hasExtractedDetails: hasProductScanAmazonDetails(scan.amazonDetails),
    hasListingText: hasText(scan.title) || hasText(scan.description),
    hasRetryPath: provenance?.retryOf !== null && provenance?.retryOf !== undefined,
    usedCaptcha,
  };
  if (hasQualityContent(flags) === false) return null;

  return {
    primaryLabel: resolveQualityPrimaryLabel(flags),
    usedCaptcha,
    usedFallback: flags.hasRetryPath,
  };
};

const hasQualityContent = (flags: {
  hasAsin: boolean;
  hasExtractedDetails: boolean;
  hasListingText: boolean;
  hasRetryPath: boolean;
  usedCaptcha: boolean;
}): boolean =>
  flags.hasAsin ||
  flags.hasExtractedDetails ||
  flags.hasListingText ||
  flags.hasRetryPath ||
  flags.usedCaptcha;

const resolveQualityPrimaryLabel = (flags: {
  hasAsin: boolean;
  hasExtractedDetails: boolean;
  hasListingText: boolean;
}): AmazonScanQualitySummary['primaryLabel'] => {
  if (flags.hasAsin) return 'Strong match';
  if (flags.hasExtractedDetails || flags.hasListingText) return 'Partial extraction';
  return 'Scraped info';
};

export const resolveAmazonScanQualityModifierLabel = (
  scan: ProductScanAmazonQualityScan
): string | null => {
  const quality = resolveAmazonScanQualitySummary(scan);
  if (quality === null) return null;

  const rejectedCandidateBreakdown = resolveRejectedAmazonCandidateBreakdown(scan.steps);
  if (rejectedCandidateBreakdown.totalCount > 0) {
    return formatRejectedCandidateLabel(rejectedCandidateBreakdown);
  }
  if (quality.usedFallback === false && quality.usedCaptcha === false) return 'Clean path';
  if (quality.usedFallback || quality.usedCaptcha) return 'Recovered path';
  return null;
};

const formatRejectedCandidateLabel = (breakdown: {
  languageRejectedCount: number;
  totalCount: number;
}): string =>
  `After ${breakdown.totalCount} rejected candidate${formatPluralSuffix(
    breakdown.totalCount
  )}${formatRejectedLanguageSuffix(breakdown.languageRejectedCount)}`;

const formatRejectedLanguageSuffix = (languageRejectedCount: number): string =>
  languageRejectedCount > 0 ? ` (${languageRejectedCount} non-English)` : '';

const formatPluralSuffix = (count: number): string => (count === 1 ? '' : 's');

export const resolveAmazonScanRecommendationReason = (
  scan: Pick<ProductScanRecord, 'amazonDetails' | 'asin' | 'description' | 'steps' | 'title'>
): string | null => {
  const quality = resolveAmazonScanQualitySummary(scan);
  const breakdown = resolveRejectedAmazonCandidateBreakdown(scan.steps);
  if (quality === null) return resolveFallbackRecommendationReason(breakdown.totalCount);
  if (quality.primaryLabel === 'Strong match') return resolveStrongMatchReason(quality, breakdown);
  if (quality.primaryLabel === 'Partial extraction') {
    return resolvePartialExtractionReason(quality, breakdown);
  }
  return resolveScrapedResultReason(breakdown);
};

const resolveFallbackRecommendationReason = (rejectedCandidateCount: number): string =>
  rejectedCandidateCount > 0
    ? `Best available result after ${rejectedCandidateCount} rejected candidate${formatPluralSuffix(
        rejectedCandidateCount
      )}`
    : 'Best available result';

const resolveStrongMatchReason = (
  quality: AmazonScanQualitySummary,
  breakdown: { languageRejectedCount: number; totalCount: number }
): string => {
  if (breakdown.totalCount > 0) {
    return `Strong match after ${breakdown.totalCount} rejected candidate${formatPluralSuffix(
      breakdown.totalCount
    )}${formatRejectedLanguageSuffix(breakdown.languageRejectedCount)}`;
  }
  return quality.usedFallback === false && quality.usedCaptcha === false
    ? 'Strongest clean match'
    : 'Strongest recovered match';
};

const resolvePartialExtractionReason = (
  quality: AmazonScanQualitySummary,
  breakdown: { languageRejectedCount: number; totalCount: number }
): string => {
  if (breakdown.totalCount > 0) {
    return `Partial extraction after ${breakdown.totalCount} rejected candidate${formatPluralSuffix(
      breakdown.totalCount
    )}${formatRejectedLanguageSuffix(breakdown.languageRejectedCount)}`;
  }
  return quality.usedFallback === false && quality.usedCaptcha === false
    ? 'Clean partial extraction'
    : 'Best partial extraction';
};

const resolveScrapedResultReason = (breakdown: {
  languageRejectedCount: number;
  totalCount: number;
}): string =>
  breakdown.totalCount > 0
    ? `Best scraped result after ${breakdown.totalCount} rejected candidate${formatPluralSuffix(
        breakdown.totalCount
      )}${formatRejectedLanguageSuffix(breakdown.languageRejectedCount)}`
    : 'Best scraped result';

export const resolvePreferredAmazonExtractedScans = (
  scans: ProductScanRecord[]
): ProductScanRecord[] => {
  const extractedScans = scans.filter(hasAmazonExtractedScanContent);
  return [...extractedScans].sort(comparePreferredAmazonScans);
};

const hasAmazonExtractedScanContent = (scan: ProductScanRecord): boolean =>
  hasProductScanAmazonDetails(scan.amazonDetails) || hasText(scan.asin);

const comparePreferredAmazonScans = (
  left: ProductScanRecord,
  right: ProductScanRecord
): number => {
  const qualityDifference = resolveQualityPriority(right) - resolveQualityPriority(left);
  if (qualityDifference !== 0) return qualityDifference;

  const rejectionDifference =
    resolveRejectedAmazonCandidateCount(left.steps) -
    resolveRejectedAmazonCandidateCount(right.steps);
  if (rejectionDifference !== 0) return rejectionDifference;

  const timestampDifference = resolveSortTimestamp(right) - resolveSortTimestamp(left);
  if (timestampDifference !== 0) return timestampDifference;

  return left.id.localeCompare(right.id);
};

const resolveQualityPriority = (scan: ProductScanRecord): number => {
  const quality = resolveAmazonScanQualitySummary(scan);
  if (quality === null) return 0;
  return (
    resolvePrimaryQualityScore(quality.primaryLabel) +
    (quality.usedFallback === false ? 5 : 0) +
    (quality.usedCaptcha === false ? 2 : 0)
  );
};

const resolvePrimaryQualityScore = (
  primaryLabel: AmazonScanQualitySummary['primaryLabel']
): number => {
  if (primaryLabel === 'Strong match') return 300;
  if (primaryLabel === 'Partial extraction') return 200;
  return 100;
};

const resolveSortTimestamp = (scan: ProductScanRecord): number => {
  const parsed = new Date(scan.updatedAt ?? scan.createdAt ?? 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};
