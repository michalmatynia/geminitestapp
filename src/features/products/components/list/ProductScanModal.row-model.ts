import {
  hasProductScanAmazonDetails,
  resolveAmazonScanRecommendationReason,
  resolveRejectedAmazonCandidateBreakdown,
} from '@/features/products/components/scans/ProductScanAmazonDetails';
import {
  buildProductScan1688SectionId,
  resolve1688ScanRecommendationReason,
  resolveProductScan1688ApplyPolicySummary,
} from '@/features/products/components/scans/ProductScan1688Details';
import {
  buildProductScanArtifactHref,
  resolveProductScanDiagnosticFailureSummary,
  resolveProductScanDiagnostics,
  type ProductScanDiagnosticFailureSummary,
} from '@/features/products/components/scans/ProductScanDiagnostics';
import {
  resolveProductScanActiveStepSummary,
  resolveProductScanContinuationSummary,
  resolveProductScanEvaluationPolicySummary,
  resolveProductScanLatestOutcomeSummary,
  resolveProductScanRejectedCandidateSummary,
  type ProductScanActiveStepSummary,
  type ProductScanContinuationSummary,
  type ProductScanEvaluationPolicySummary,
  type ProductScanLatestOutcomeSummary,
  type ProductScanRejectedCandidateSummary,
} from '@/features/products/components/scans/ProductScanSteps';
import type {
  ProductScanProvider,
  ProductScanRecord,
  ProductScanStep,
} from '@/shared/contracts/product-scans';

import { resolveRowDisplayMessages, type ProductScanRowMessages } from './ProductScanModal.row-status';
import type { ProductScanModalProvider, ScanModalRow } from './ProductScanModal.types';

type AmazonRejectedCandidateBreakdown = ReturnType<typeof resolveRejectedAmazonCandidateBreakdown>;
type SupplierApplyPolicySummary = ReturnType<typeof resolveProductScan1688ApplyPolicySummary>;
type ScanDiagnostics = ReturnType<typeof resolveProductScanDiagnostics>;
type ScanFailureArtifact = NonNullable<ScanDiagnostics>['failureArtifacts'][number];

export type ProductScanRowProgressModel = {
  progressSummary: ProductScanActiveStepSummary | null;
  continuationSummary: ProductScanContinuationSummary | null;
  rejectedCandidateSummary: ProductScanRejectedCandidateSummary | null;
  evaluationPolicySummary: ProductScanEvaluationPolicySummary | null;
  latestOutcomeSummary: ProductScanLatestOutcomeSummary | null;
  fallbackFailureSummary: ProductScanDiagnosticFailureSummary | null;
  isActiveDiagnosticSummary: boolean;
  usesFailureSummaryStyling: boolean;
};

export type ProductScanRowDiagnosticsModel = {
  diagnostics: ScanDiagnostics;
  hasDiagnostics: boolean;
  latestFailureArtifact: ScanFailureArtifact | null;
  failureArtifactCount: number;
  latestFailureArtifactHref: string | null;
};

export type ProductScanRowSupplierPolicyModel = {
  summary: SupplierApplyPolicySummary;
  isBlockedResultReviewed: boolean;
  candidateUrlsHref: string | null;
  matchEvaluationHref: string | null;
};

export type ProductScanRowViewModel = ProductScanRowMessages & {
  scanSteps: ProductScanStep[];
  isExpanded: boolean;
  diagnosticsExpanded: boolean;
  extractedFieldsExpanded: boolean;
  effectiveProvider: ProductScanProvider;
  isAmazonScan: boolean;
  resolvedConnectionLabel: string | null;
  supplierSummary: string;
  hasExtractedFields: boolean;
  recommendationReason: string | null;
  recommendationRejectedBreakdown: AmazonRejectedCandidateBreakdown | null;
  supplierPolicy: ProductScanRowSupplierPolicyModel;
  diagnostics: ProductScanRowDiagnosticsModel;
  progress: ProductScanRowProgressModel;
};

type ProductScanRowModelInput = {
  row: ScanModalRow;
  connectionNamesById: Map<string, string>;
  active1688ConnectionName: string | null;
  expandedRowIds: Set<string>;
  expandedDiagnosticRowIds: Set<string>;
  expandedExtractedFieldRowIds: Set<string>;
  isBlockedScanReviewed: (scanId: string | null | undefined) => boolean;
  provider: ProductScanModalProvider;
};

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value !== '';

const isActiveRowStatus = (status: ScanModalRow['status']): boolean =>
  status === 'queued' || status === 'running';

const supportsLatestOutcomeSummary = (status: ScanModalRow['status']): boolean =>
  status === 'failed' || status === 'conflict' || isActiveRowStatus(status);

const resolveScanSteps = (scan: ProductScanRecord | null): ProductScanStep[] => {
  if (scan === null) return [];
  return Array.isArray(scan.steps) ? scan.steps : [];
};

const resolveConnectionLabel = (input: {
  isAmazonScan: boolean;
  row: ScanModalRow;
  connectionNamesById: Map<string, string>;
  active1688ConnectionName: string | null;
}): string | null => {
  if (input.isAmazonScan) return null;
  const connectionId = input.row.scan?.connectionId;
  if (hasText(connectionId)) {
    return input.connectionNamesById.get(connectionId) ?? input.active1688ConnectionName ?? connectionId;
  }
  return input.active1688ConnectionName;
};

const resolveSupplierSummary = (scan: ProductScanRecord | null): string => {
  if (scan?.provider !== '1688') return '';
  const details = scan.supplierDetails;
  return [details?.supplierName, details?.priceText ?? details?.priceRangeText, details?.moqText]
    .filter((value): value is string => typeof value === 'string')
    .join(' · ');
};

const resolveHasExtractedFields = (input: {
  row: ScanModalRow;
  isAmazonScan: boolean;
}): boolean => {
  if (input.isAmazonScan === false || input.row.scan === null) return false;
  return (
    hasProductScanAmazonDetails(input.row.scan.amazonDetails) ||
    hasText(input.row.scan.asin)
  );
};

const resolveRecommendationReason = (input: {
  row: ScanModalRow;
  isAmazonScan: boolean;
  hasExtractedFields: boolean;
}): string | null => {
  if (input.row.scan === null) return null;
  if (input.isAmazonScan === false) return resolve1688ScanRecommendationReason(input.row.scan);
  if (input.hasExtractedFields === false) return null;
  return resolveAmazonScanRecommendationReason(input.row.scan);
};

const resolveRecommendationRejectedBreakdown = (input: {
  row: ScanModalRow;
  isAmazonScan: boolean;
  hasExtractedFields: boolean;
}): AmazonRejectedCandidateBreakdown | null => {
  if (input.row.scan === null || input.isAmazonScan === false) return null;
  if (input.hasExtractedFields === false) return null;
  return resolveRejectedAmazonCandidateBreakdown(input.row.scan.steps);
};

const resolveBlockedSectionHref = (
  row: ScanModalRow,
  summary: SupplierApplyPolicySummary,
  section: 'candidate-urls' | 'match-evaluation'
): string | null => {
  if (row.scan === null || summary?.blockActions !== true) return null;
  return buildProductScan1688SectionId(row.scan.id, section);
};

const buildSupplierPolicyModel = (input: {
  row: ScanModalRow;
  isAmazonScan: boolean;
  isBlockedScanReviewed: (scanId: string | null | undefined) => boolean;
}): ProductScanRowSupplierPolicyModel => {
  const summary =
    input.row.scan !== null && input.isAmazonScan === false
      ? resolveProductScan1688ApplyPolicySummary(input.row.scan)
      : null;

  return {
    summary,
    isBlockedResultReviewed:
      summary?.blockActions === true ? input.isBlockedScanReviewed(input.row.scan?.id) : false,
    candidateUrlsHref: resolveBlockedSectionHref(input.row, summary, 'candidate-urls'),
    matchEvaluationHref: resolveBlockedSectionHref(input.row, summary, 'match-evaluation'),
  };
};

const buildDiagnosticsModel = (row: ScanModalRow): ProductScanRowDiagnosticsModel => {
  const diagnostics = row.scan !== null ? resolveProductScanDiagnostics(row.scan) : null;
  const latestFailureArtifact = diagnostics?.failureArtifacts[0] ?? null;
  const latestFailureArtifactHref =
    row.scan !== null && latestFailureArtifact !== null
      ? buildProductScanArtifactHref(row.scan.id, latestFailureArtifact)
      : null;

  return {
    diagnostics,
    hasDiagnostics: diagnostics !== null,
    latestFailureArtifact,
    failureArtifactCount: diagnostics?.failureArtifacts.length ?? 0,
    latestFailureArtifactHref,
  };
};

const resolveProgressSummary = (
  row: ScanModalRow,
  scanSteps: ProductScanStep[]
): ProductScanActiveStepSummary | null => {
  if (isActiveRowStatus(row.status) === false || scanSteps.length === 0) return null;
  return resolveProductScanActiveStepSummary(scanSteps);
};

const resolveContinuationSummary = (
  row: ScanModalRow,
  scanSteps: ProductScanStep[]
): ProductScanContinuationSummary | null => {
  if (isActiveRowStatus(row.status) === false || scanSteps.length === 0) return null;
  return resolveProductScanContinuationSummary(scanSteps);
};

const resolveLatestOutcome = (input: {
  row: ScanModalRow;
  scanSteps: ProductScanStep[];
  progressSummary: ProductScanActiveStepSummary | null;
}): ProductScanLatestOutcomeSummary | null => {
  if (input.scanSteps.length === 0 || input.progressSummary !== null) return null;
  if (supportsLatestOutcomeSummary(input.row.status) === false) return null;
  return resolveProductScanLatestOutcomeSummary(input.scanSteps, {
    allowStalled: isActiveRowStatus(input.row.status),
  });
};

const resolveFallbackFailureSummary = (
  row: ScanModalRow,
  latestOutcomeSummary: ProductScanLatestOutcomeSummary | null
): ProductScanDiagnosticFailureSummary | null => {
  if (latestOutcomeSummary !== null || row.scan === null) return null;
  return resolveProductScanDiagnosticFailureSummary(row.scan);
};

const resolveFailureSummaryStyling = (input: {
  latestOutcomeSummary: ProductScanLatestOutcomeSummary | null;
  fallbackFailureSummary: ProductScanDiagnosticFailureSummary | null;
  isActiveDiagnosticSummary: boolean;
}): boolean => {
  if (input.latestOutcomeSummary?.kind === 'failed') return true;
  return input.fallbackFailureSummary !== null && input.isActiveDiagnosticSummary === false;
};

const buildProgressModel = (
  row: ScanModalRow,
  scanSteps: ProductScanStep[]
): ProductScanRowProgressModel => {
  const progressSummary = resolveProgressSummary(row, scanSteps);
  const continuationSummary = resolveContinuationSummary(row, scanSteps);
  const canShowHistory = scanSteps.length > 0 && progressSummary === null;
  const rejectedCandidateSummary =
    canShowHistory && continuationSummary === null
      ? resolveProductScanRejectedCandidateSummary(scanSteps)
      : null;
  const evaluationPolicySummary =
    canShowHistory ? resolveProductScanEvaluationPolicySummary(scanSteps) : null;
  const latestOutcomeSummary = resolveLatestOutcome({ row, scanSteps, progressSummary });
  const fallbackFailureSummary = resolveFallbackFailureSummary(row, latestOutcomeSummary);
  const isActiveDiagnosticSummary =
    fallbackFailureSummary !== null && isActiveRowStatus(row.status);

  return {
    progressSummary,
    continuationSummary,
    rejectedCandidateSummary,
    evaluationPolicySummary,
    latestOutcomeSummary,
    fallbackFailureSummary,
    isActiveDiagnosticSummary,
    usesFailureSummaryStyling: resolveFailureSummaryStyling({
      latestOutcomeSummary,
      fallbackFailureSummary,
      isActiveDiagnosticSummary,
    }),
  };
};

export const buildProductScanRowViewModel = (
  input: ProductScanRowModelInput
): ProductScanRowViewModel => {
  const scanSteps = resolveScanSteps(input.row.scan);
  const effectiveProvider = input.row.scan?.provider ?? input.provider;
  const isAmazonScan = effectiveProvider !== '1688';
  const hasExtractedFields = resolveHasExtractedFields({ row: input.row, isAmazonScan });

  return {
    ...resolveRowDisplayMessages(input.row),
    scanSteps,
    isExpanded: input.expandedRowIds.has(input.row.productId),
    diagnosticsExpanded: input.expandedDiagnosticRowIds.has(input.row.productId),
    extractedFieldsExpanded: input.expandedExtractedFieldRowIds.has(input.row.productId),
    effectiveProvider,
    isAmazonScan,
    resolvedConnectionLabel: resolveConnectionLabel({ ...input, isAmazonScan }),
    supplierSummary: resolveSupplierSummary(input.row.scan),
    hasExtractedFields,
    recommendationReason: resolveRecommendationReason({ ...input, isAmazonScan, hasExtractedFields }),
    recommendationRejectedBreakdown: resolveRecommendationRejectedBreakdown({
      ...input,
      isAmazonScan,
      hasExtractedFields,
    }),
    supplierPolicy: buildSupplierPolicyModel({ ...input, isAmazonScan }),
    diagnostics: buildDiagnosticsModel(input.row),
    progress: buildProgressModel(input.row, scanSteps),
  };
};
