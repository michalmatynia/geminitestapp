import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import {
  formatLabel,
  formatTimestamp,
  readStringifiedText,
  resolveDiagnosticPhaseLabel,
} from './ProductScanDiagnostics.format';
import {
  isObjectRecord,
  normalizeAmazonAiStages,
  normalizeFailureArtifacts,
  normalizeLogTail,
  normalizeRuntimePosture,
} from './ProductScanDiagnostics.normalize';
import type {
  ProductScanDiagnosticFailureSummary,
  ScanDiagnostics,
  ScanFailureArtifact,
} from './ProductScanDiagnostics.types';
import { resolveProductScanFailureSourceLabel } from './ProductScanSteps';

const resolveAmazonAiEvidenceStages = (rawResult: Record<string, unknown>): unknown => {
  const amazonAiEvidence = rawResult['amazonAiEvidence'];
  return isObjectRecord(amazonAiEvidence) ? amazonAiEvidence['stages'] : null;
};

const hasDiagnosticsContent = (diagnostics: ScanDiagnostics): boolean =>
  hasDiagnosticsMetadata(diagnostics) || hasDiagnosticsCollections(diagnostics);

const hasDiagnosticsMetadata = (diagnostics: ScanDiagnostics): boolean =>
  diagnostics.runId !== null ||
  diagnostics.runStatus !== null ||
  diagnostics.imageSearchProvider !== null ||
  diagnostics.imageSearchPageUrl !== null ||
  diagnostics.latestStage !== null ||
  diagnostics.latestStageUrl !== null ||
  diagnostics.runtimePosture !== null;

const hasDiagnosticsCollections = (diagnostics: ScanDiagnostics): boolean =>
  diagnostics.amazonAiStages.length > 0 ||
  diagnostics.failureArtifacts.length > 0 ||
  diagnostics.logTail.length > 0;

export const resolveProductScanDiagnostics = (
  scan: Pick<ProductScanRecord, 'rawResult'>
): ScanDiagnostics | null => {
  if (isObjectRecord(scan.rawResult) === false) return null;

  const diagnostics: ScanDiagnostics = {
    runId: readStringifiedText(scan.rawResult['runId']),
    runStatus: readStringifiedText(scan.rawResult['runStatus']),
    imageSearchProvider: readStringifiedText(scan.rawResult['imageSearchProvider']),
    imageSearchPageUrl: readStringifiedText(scan.rawResult['imageSearchPageUrl']),
    latestStage: readStringifiedText(scan.rawResult['latestStage']),
    latestStageUrl: readStringifiedText(scan.rawResult['latestStageUrl']),
    amazonAiStages: normalizeAmazonAiStages(resolveAmazonAiEvidenceStages(scan.rawResult)),
    failureArtifacts: normalizeFailureArtifacts(scan.rawResult['failureArtifacts']),
    runtimePosture: normalizeRuntimePosture(scan.rawResult['runtimePosture']),
    logTail: normalizeLogTail(scan.rawResult['logTail']),
  };

  return hasDiagnosticsContent(diagnostics) ? diagnostics : null;
};

export const resolveProductScanDiagnosticFailureSummary = (
  scan: Pick<ProductScanRecord, 'rawResult' | 'completedAt' | 'updatedAt'>
): ProductScanDiagnosticFailureSummary | null => {
  const diagnostics = resolveProductScanDiagnostics(scan);
  if (diagnostics === null) return null;

  const latestTimestamp = formatTimestamp(scan.completedAt ?? scan.updatedAt ?? null);
  const summary = {
    phaseLabel: resolveDiagnosticPhaseLabel(diagnostics.latestStage),
    sourceLabel: resolveDiagnosticFailureSourceLabel(diagnostics.latestStage),
    stepLabel: formatLabel(diagnostics.latestStage) ?? 'Runtime Diagnostics',
    message: diagnostics.logTail.at(-1) ?? null,
    resultCodeLabel: formatLabel(diagnostics.runStatus),
    url: diagnostics.latestStageUrl,
    timingLabel: latestTimestamp === null ? null : `Updated ${latestTimestamp}`,
  };

  return hasFailureSummaryContent(summary) ? summary : null;
};

const resolveDiagnosticFailureSourceLabel = (latestStage: string | null): string | null =>
  latestStage === null
    ? null
    : resolveProductScanFailureSourceLabel({ key: latestStage, group: null });

const hasFailureSummaryContent = (
  summary: ProductScanDiagnosticFailureSummary
): boolean =>
  summary.stepLabel.length > 0 ||
  summary.message !== null ||
  summary.resultCodeLabel !== null ||
  summary.timingLabel !== null;

const resolveArtifactFileName = (artifact: ScanFailureArtifact): string | null => {
  const segments = artifact.path.split('/').filter((segment) => segment.trim().length > 0);
  const fileName = segments.at(-1)?.trim() ?? '';
  return fileName.length > 0 ? fileName : null;
};

export const buildProductScanArtifactHref = (
  scanId: string,
  artifact: ScanFailureArtifact
): string | null => {
  const normalizedScanId = scanId.trim();
  const fileName = resolveArtifactFileName(artifact);
  if (normalizedScanId.length === 0 || fileName === null) return null;
  return `/api/v2/products/scans/${encodeURIComponent(normalizedScanId)}/artifacts/${encodeURIComponent(fileName)}`;
};

export const buildProductScanRecordedDiagnosticArtifactHref = (
  scanId: string,
  filename: string
): string | null => {
  const normalizedScanId = scanId.trim();
  const normalizedFilename = filename.trim();
  if (normalizedScanId.length === 0 || normalizedFilename.length === 0) return null;
  return `/api/v2/products/scans/${encodeURIComponent(normalizedScanId)}/diagnostics/${encodeURIComponent(normalizedFilename)}`;
};
