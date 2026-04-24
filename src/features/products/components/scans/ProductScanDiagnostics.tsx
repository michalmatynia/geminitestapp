'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { api } from '@/shared/lib/api-client';
import { CopyButton } from '@/shared/ui/copy-button';
import {
  resolveProductScanEvaluationPolicySummary,
  resolveProductScanFailureSourceLabel,
} from './ProductScanSteps';

type ScanFailureArtifact = {
  name: string;
  path: string;
  kind: string | null;
  mimeType: string | null;
};

type ScanRuntimePosture = {
  browserLabel: string | null;
  browserEngine: string | null;
  headless: boolean | null;
  identityProfile: string | null;
  locale: string | null;
  timezoneId: string | null;
  proxyEnabled: boolean | null;
  proxyProviderPreset: string | null;
  proxySessionMode: string | null;
  proxyReason: string | null;
  proxyServerHost: string | null;
  stickyStorageEnabled: boolean | null;
  stickyStorageLoaded: boolean | null;
};

type ScanDiagnostics = {
  runId: string | null;
  runStatus: string | null;
  imageSearchProvider: string | null;
  imageSearchPageUrl: string | null;
  latestStage: string | null;
  latestStageUrl: string | null;
  amazonAiStages: AmazonAiStageEvidence[];
  failureArtifacts: ScanFailureArtifact[];
  runtimePosture: ScanRuntimePosture | null;
  logTail: string[];
};

type RecordedDiagnosticArtifact = {
  filename: string;
  sizeBytes: number;
  mtime: string;
  mimeType: string;
};

type RecordedDiagnosticClassification = {
  kind: string;
  details: {
    reason: string;
  };
};

type RecordedDiagnosticResponse = {
  scanId: string;
  provider: string;
  status: string;
  classification: RecordedDiagnosticClassification;
  artifacts: RecordedDiagnosticArtifact[];
};

type AmazonAiStageEvidence = {
  stage: 'candidate_triage' | 'probe_evaluate' | 'extraction_evaluate';
  status: string | null;
  model: string | null;
  threshold: number | null;
  candidateRankBefore: number | null;
  candidateRankAfter: number | null;
  recommendedAction: string | null;
  rejectionCategory: string | null;
  pageLanguage: string | null;
  languageAccepted: boolean | null;
  topReasons: string[];
  provider: string | null;
  evaluatedAt: string | null;
};

export type ProductScanDiagnosticFailureSummary = {
  phaseLabel: string;
  sourceLabel: string | null;
  stepLabel: string;
  message: string | null;
  resultCodeLabel: string | null;
  url: string | null;
  timingLabel: string | null;
};

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const formatLabel = (value: string | null | undefined): string | null => {
  if (hasText(value) === false) {
    return null;
  }

  return value
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatTimestamp = (value: string | null | undefined): string | null => {
  if (hasText(value) === false) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && value !== undefined && typeof value === 'object' && Array.isArray(value) === false;

const readOptionalBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const normalizeFailureArtifacts = (value: unknown): ScanFailureArtifact[] => {
  if (Array.isArray(value) === false) {
    return [];
  }

  return (value as unknown[])
    .map((entry) => {
      if (isObjectRecord(entry) === false) {
        return null;
      }

      const entryRecord = entry;
      const rawName = entryRecord['name'];
      const rawPath = entryRecord['path'];
      const name = hasText(String(rawName ?? '')) ? String(rawName).trim() : null;
      const path = hasText(String(rawPath ?? '')) ? String(rawPath).trim() : null;
      if (name === null || path === null) {
        return null;
      }

      const rawKind = entryRecord['kind'];
      const rawMimeType = entryRecord['mimeType'];
      return {
        name,
        path,
        kind: hasText(String(rawKind ?? '')) ? String(rawKind).trim() : null,
        mimeType: hasText(String(rawMimeType ?? ''))
          ? String(rawMimeType).trim()
          : null,
      };
    })
    .filter((entry): entry is ScanFailureArtifact => entry !== null);
};

const normalizeAmazonAiStages = (value: unknown): AmazonAiStageEvidence[] => {
  if (Array.isArray(value) === false) {
    return [];
  }

  return (value as unknown[])
    .map((entry) => {
      if (isObjectRecord(entry) === false) {
        return null;
      }

      const entryRecord = entry;
      const rawStage = entryRecord['stage'];
      const stage = hasText(String(rawStage ?? ''))
        ? String(rawStage).trim()
        : null;
      if (
        stage !== 'candidate_triage' &&
        stage !== 'probe_evaluate' &&
        stage !== 'extraction_evaluate'
      ) {
        return null;
      }

      const thresholdValue = entryRecord['threshold'];
      const candidateRankBeforeValue = entryRecord['candidateRankBefore'];
      const candidateRankAfterValue = entryRecord['candidateRankAfter'];
      const languageAcceptedValue = entryRecord['languageAccepted'];
      const statusValue = entryRecord['status'];
      const modelValue = entryRecord['model'];
      const recommendedActionValue = entryRecord['recommendedAction'];
      const rejectionCategoryValue = entryRecord['rejectionCategory'];
      const pageLanguageValue = entryRecord['pageLanguage'];
      const topReasonsValue = entryRecord['topReasons'];
      const providerValue = entryRecord['provider'];
      const evaluatedAtValue = entryRecord['evaluatedAt'];

      return {
        stage,
        status: hasText(String(statusValue ?? '')) ? String(statusValue).trim() : null,
        model: hasText(String(modelValue ?? '')) ? String(modelValue).trim() : null,
        threshold:
          typeof thresholdValue === 'number' && Number.isFinite(thresholdValue)
            ? thresholdValue
            : null,
        candidateRankBefore:
          typeof candidateRankBeforeValue === 'number' && Number.isFinite(candidateRankBeforeValue)
            ? candidateRankBeforeValue
            : null,
        candidateRankAfter:
          typeof candidateRankAfterValue === 'number' && Number.isFinite(candidateRankAfterValue)
            ? candidateRankAfterValue
            : null,
        recommendedAction: hasText(String(recommendedActionValue ?? ''))
          ? String(recommendedActionValue).trim()
          : null,
        rejectionCategory: hasText(String(rejectionCategoryValue ?? ''))
          ? String(rejectionCategoryValue).trim()
          : null,
        pageLanguage: hasText(String(pageLanguageValue ?? ''))
          ? String(pageLanguageValue).trim()
          : null,
        languageAccepted:
          typeof languageAcceptedValue === 'boolean' ? languageAcceptedValue : null,
        topReasons: Array.isArray(topReasonsValue)
          ? (topReasonsValue as unknown[])
              .map((reason) => (typeof reason === 'string' ? reason.trim() : ''))
              .filter((reason) => reason.length > 0)
              .slice(0, 3)
          : [],
        provider: hasText(String(providerValue ?? ''))
          ? String(providerValue).trim()
          : null,
        evaluatedAt: hasText(String(evaluatedAtValue ?? ''))
          ? String(evaluatedAtValue).trim()
          : null,
      } satisfies AmazonAiStageEvidence;
    })
    .filter((entry): entry is AmazonAiStageEvidence => entry !== null);
};

const normalizeLogTail = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0)
    .slice(-12);
};

const formatAmazonImageSearchProvider = (value: string | null | undefined): string | null => {
  if (!hasText(value)) {
    return null;
  }

  if (value === 'google_images_upload') {
    return 'Google Images Upload';
  }
  if (value === 'google_images_url') {
    return 'Google Images URL';
  }
  if (value === 'google_lens_upload') {
    return 'Google Lens Upload';
  }

  return formatLabel(value);
};

const formatAmazonAiStage = (value: AmazonAiStageEvidence['stage']): string => {
  if (value === 'candidate_triage') {
    return 'Candidate triage';
  }
  if (value === 'probe_evaluate') {
    return 'Probe evaluator';
  }
  return 'Extraction evaluator';
};

const formatAmazonAiStageStatus = (value: string | null | undefined): string | null => {
  if (!hasText(value)) {
    return null;
  }

  if (value === 'approved') return 'Approved';
  if (value === 'rejected') return 'Rejected';
  if (value === 'skipped') return 'Skipped';
  if (value === 'failed') return 'Failed';
  return formatLabel(value);
};

const formatAmazonAiThreshold = (value: number | null | undefined): string | null =>
  typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value * 100)}%` : null;

const formatAmazonAiStageLanguage = (value: string | null | undefined): string | null => {
  if (!hasText(value)) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'en') return 'English';
  if (normalized === 'en-us') return 'English (US)';
  if (normalized === 'en-gb') return 'English (UK)';
  if (normalized === 'de') return 'German';
  if (normalized === 'fr') return 'French';
  if (normalized === 'es') return 'Spanish';
  if (normalized === 'it') return 'Italian';
  if (normalized === 'pl') return 'Polish';
  return normalized.toUpperCase();
};

const resolveArtifactFileName = (artifact: ScanFailureArtifact): string | null => {
  const segments = artifact.path.split('/').filter((segment) => segment.trim().length > 0);
  const fileName = segments.at(-1)?.trim() ?? '';
  return fileName.length > 0 ? fileName : null;
};

export const buildProductScanArtifactHref = (scanId: string, artifact: ScanFailureArtifact): string | null => {
  const normalizedScanId = scanId.trim();
  const fileName = resolveArtifactFileName(artifact);
  if (normalizedScanId.length === 0 || !fileName) {
    return null;
  }

  return `/api/v2/products/scans/${encodeURIComponent(normalizedScanId)}/artifacts/${encodeURIComponent(fileName)}`;
};

export const buildProductScanRecordedDiagnosticArtifactHref = (
  scanId: string,
  filename: string
): string | null => {
  const normalizedScanId = scanId.trim();
  const normalizedFilename = filename.trim();
  if (normalizedScanId.length === 0 || normalizedFilename.length === 0) {
    return null;
  }

  return `/api/v2/products/scans/${encodeURIComponent(normalizedScanId)}/diagnostics/${encodeURIComponent(normalizedFilename)}`;
};

const formatFileSize = (sizeBytes: number): string | null => {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return null;
  }
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
};

const resolveRecordedDiagnosticActionLabel = (artifact: RecordedDiagnosticArtifact): string => {
  if (artifact.mimeType.startsWith('image/')) {
    return 'View recorded screenshot';
  }
  if (artifact.mimeType === 'application/zip') {
    return 'Open trace ZIP';
  }
  if (artifact.mimeType.includes('html')) {
    return 'Open HTML snapshot';
  }
  if (artifact.mimeType === 'application/json') {
    return 'Open JSON snapshot';
  }
  return 'Open diagnostic artifact';
};

const isRuntimePostureArtifact = (artifact: ScanFailureArtifact): boolean => {
  const normalizedName = artifact.name.trim().toLowerCase();
  const normalizedPath = artifact.path.trim().toLowerCase();
  return normalizedName === 'runtime-posture' || normalizedPath.includes('runtime-posture');
};

const resolveArtifactActionLabel = (artifact: ScanFailureArtifact): string => {
  if (artifact.mimeType?.startsWith('image/')) {
    return 'View screenshot';
  }
  if (artifact.mimeType === 'text/html') {
    return 'View page HTML';
  }
  if (artifact.mimeType === 'application/json') {
    return isRuntimePostureArtifact(artifact) ? 'View runtime posture JSON' : 'View JSON';
  }
  return 'Open artifact';
};

const resolveArtifactDisplayName = (artifact: ScanFailureArtifact): string =>
  isRuntimePostureArtifact(artifact) ? 'Runtime posture' : artifact.name;

const resolveDiagnosticPhaseLabel = (latestStage: string | null): string => {
  if (!latestStage) {
    return 'Diagnostics';
  }

  if (latestStage === 'validate' || latestStage === 'prepare_scan' || latestStage === 'queue_scan') {
    return 'Input';
  }

  if (latestStage.startsWith('google_')) {
    return 'Google Lens';
  }

  if (latestStage.startsWith('amazon_')) {
    return 'Amazon';
  }

  return 'Product Update';
};

const normalizeRuntimePosture = (value: unknown): ScanRuntimePosture | null => {
  const record = isObjectRecord(value) ? value : null;
  if (!record) {
    return null;
  }

  const browser = isObjectRecord(record['browser']) ? record['browser'] : null;
  const antiDetection = isObjectRecord(record['antiDetection']) ? record['antiDetection'] : null;
  const proxy = antiDetection && isObjectRecord(antiDetection['proxy']) ? antiDetection['proxy'] : null;
  const stickyStorageState =
    antiDetection && isObjectRecord(antiDetection['stickyStorageState'])
      ? antiDetection['stickyStorageState']
      : null;

  const runtimePosture: ScanRuntimePosture = {
    browserLabel: hasText(String(browser?.['label'] ?? '')) ? String(browser?.['label']).trim() : null,
    browserEngine: hasText(String(browser?.['engine'] ?? '')) ? String(browser?.['engine']).trim() : null,
    headless: readOptionalBoolean(browser?.['headless']),
    identityProfile: hasText(String(antiDetection?.['identityProfile'] ?? ''))
      ? String(antiDetection?.['identityProfile']).trim()
      : null,
    locale: hasText(String(antiDetection?.['locale'] ?? '')) ? String(antiDetection?.['locale']).trim() : null,
    timezoneId: hasText(String(antiDetection?.['timezoneId'] ?? ''))
      ? String(antiDetection?.['timezoneId']).trim()
      : null,
    proxyEnabled: readOptionalBoolean(proxy?.['enabled']),
    proxyProviderPreset: hasText(String(proxy?.['providerPreset'] ?? ''))
      ? String(proxy?.['providerPreset']).trim()
      : null,
    proxySessionMode: hasText(String(proxy?.['sessionMode'] ?? ''))
      ? String(proxy?.['sessionMode']).trim()
      : null,
    proxyReason: hasText(String(proxy?.['reason'] ?? '')) ? String(proxy?.['reason']).trim() : null,
    proxyServerHost: hasText(String(proxy?.['serverHost'] ?? ''))
      ? String(proxy?.['serverHost']).trim()
      : null,
    stickyStorageEnabled: readOptionalBoolean(stickyStorageState?.['enabled']),
    stickyStorageLoaded: readOptionalBoolean(stickyStorageState?.['loaded']),
  };

  return Object.values(runtimePosture).some((value) => value !== null) ? runtimePosture : null;
};

const formatRuntimePostureBrowser = (runtimePosture: ScanRuntimePosture): string | null => {
  const parts = [
    runtimePosture.browserLabel ?? formatLabel(runtimePosture.browserEngine) ?? null,
    runtimePosture.headless === null ? null : runtimePosture.headless ? 'Headless' : 'Headed',
  ].filter((value): value is string => hasText(value));

  return parts.length > 0 ? parts.join(' · ') : null;
};

const formatRuntimePostureIdentity = (runtimePosture: ScanRuntimePosture): string | null => {
  const parts = [
    runtimePosture.identityProfile ? `${formatLabel(runtimePosture.identityProfile)} profile` : null,
    runtimePosture.locale,
    runtimePosture.timezoneId,
  ].filter((value): value is string => hasText(value));

  return parts.length > 0 ? parts.join(' · ') : null;
};

const formatRuntimePostureProxy = (runtimePosture: ScanRuntimePosture): string | null => {
  if (runtimePosture.proxyEnabled === false) {
    return 'Disabled';
  }

  const parts = [
    formatLabel(runtimePosture.proxyProviderPreset),
    formatLabel(runtimePosture.proxySessionMode),
    formatLabel(runtimePosture.proxyReason),
    runtimePosture.proxyServerHost,
  ].filter((value): value is string => hasText(value));

  if (parts.length === 0) {
    return runtimePosture.proxyEnabled === true ? 'Enabled' : null;
  }

  return parts.join(' · ');
};

const formatRuntimePostureStorage = (runtimePosture: ScanRuntimePosture): string | null => {
  if (runtimePosture.stickyStorageEnabled === false) {
    return 'Disabled';
  }
  if (runtimePosture.stickyStorageEnabled !== true) {
    return null;
  }
  return runtimePosture.stickyStorageLoaded ? 'Loaded sticky state' : 'Cold sticky state';
};

export const resolveProductScanDiagnostics = (
  scan: Pick<ProductScanRecord, 'rawResult'>
): ScanDiagnostics | null => {
  if (!isObjectRecord(scan.rawResult)) {
    return null;
  }

  const runId = hasText(String(scan.rawResult['runId'] ?? ''))
    ? String(scan.rawResult['runId']).trim()
    : null;
  const runStatus = hasText(String(scan.rawResult['runStatus'] ?? ''))
    ? String(scan.rawResult['runStatus']).trim()
    : null;
  const imageSearchProvider = hasText(String(scan.rawResult['imageSearchProvider'] ?? ''))
    ? String(scan.rawResult['imageSearchProvider']).trim()
    : null;
  const imageSearchPageUrl = hasText(String(scan.rawResult['imageSearchPageUrl'] ?? ''))
    ? String(scan.rawResult['imageSearchPageUrl']).trim()
    : null;
  const latestStage = hasText(String(scan.rawResult['latestStage'] ?? ''))
    ? String(scan.rawResult['latestStage']).trim()
    : null;
  const latestStageUrl = hasText(String(scan.rawResult['latestStageUrl'] ?? ''))
    ? String(scan.rawResult['latestStageUrl']).trim()
    : null;
  const amazonAiEvidence = isObjectRecord(scan.rawResult['amazonAiEvidence'])
    ? scan.rawResult['amazonAiEvidence']
    : null;
  const amazonAiStages = normalizeAmazonAiStages(amazonAiEvidence?.['stages']);
  const failureArtifacts = normalizeFailureArtifacts(scan.rawResult['failureArtifacts']);
  const runtimePosture = normalizeRuntimePosture(scan.rawResult['runtimePosture']);
  const logTail = normalizeLogTail(scan.rawResult['logTail']);

  if (
    !runId &&
    !runStatus &&
    !imageSearchProvider &&
    !imageSearchPageUrl &&
    !latestStage &&
    !latestStageUrl &&
    amazonAiStages.length === 0 &&
    failureArtifacts.length === 0 &&
    !runtimePosture &&
    logTail.length === 0
  ) {
    return null;
  }

  return {
    runId,
    runStatus,
    imageSearchProvider,
    imageSearchPageUrl,
    latestStage,
    latestStageUrl,
    amazonAiStages,
    failureArtifacts,
    runtimePosture,
    logTail,
  };
};

export const resolveProductScanDiagnosticFailureSummary = (
  scan: Pick<ProductScanRecord, 'rawResult' | 'completedAt' | 'updatedAt'>
): ProductScanDiagnosticFailureSummary | null => {
  const diagnostics = resolveProductScanDiagnostics(scan);
  if (!diagnostics) {
    return null;
  }

  const stepLabel = formatLabel(diagnostics.latestStage) ?? 'Runtime Diagnostics';
  const message = diagnostics.logTail.at(-1) ?? null;
  const resultCodeLabel = formatLabel(diagnostics.runStatus);
  const latestTimestamp = formatTimestamp(scan.completedAt ?? scan.updatedAt ?? null);
  const timingLabel = latestTimestamp ? `Updated ${latestTimestamp}` : null;

  if (!stepLabel && !message && !resultCodeLabel && !timingLabel) {
    return null;
  }

  return {
    phaseLabel: resolveDiagnosticPhaseLabel(diagnostics.latestStage),
    sourceLabel: diagnostics.latestStage
      ? resolveProductScanFailureSourceLabel({ key: diagnostics.latestStage, group: null })
      : null,
    stepLabel,
    message,
    resultCodeLabel,
    url: diagnostics.latestStageUrl,
    timingLabel,
  };
};

const isAmazonRecordedDiagnosticsResponse = (
  value: unknown
): value is RecordedDiagnosticResponse => {
  if (!isObjectRecord(value)) {
    return false;
  }

  const artifacts = value['artifacts'];
  const classification = value['classification'];
  return (
    typeof value['scanId'] === 'string' &&
    typeof value['provider'] === 'string' &&
    typeof value['status'] === 'string' &&
    Array.isArray(artifacts) &&
    isObjectRecord(classification) &&
    typeof classification['kind'] === 'string' &&
    isObjectRecord(classification['details']) &&
    typeof classification['details']['reason'] === 'string'
  );
};

export function ProductScanDiagnostics(props: {
  scan: Pick<ProductScanRecord, 'id' | 'rawResult' | 'steps'> &
    Partial<Pick<ProductScanRecord, 'provider'>>;
}): React.JSX.Element | null {
  const diagnostics = resolveProductScanDiagnostics(props.scan);
  const shouldLoadRecordedDiagnostics =
    props.scan.provider === 'amazon' && props.scan.id.trim().length > 0;
  const evaluationPolicySummary = resolveProductScanEvaluationPolicySummary(props.scan.steps ?? []);
  const [recordedDiagnostics, setRecordedDiagnostics] =
    React.useState<RecordedDiagnosticResponse | null>(null);
  const [recordedDiagnosticsStatus, setRecordedDiagnosticsStatus] = React.useState<
    'idle' | 'loading' | 'loaded' | 'error'
  >(shouldLoadRecordedDiagnostics ? 'loading' : 'idle');

  React.useEffect(() => {
    if (!shouldLoadRecordedDiagnostics) {
      setRecordedDiagnostics(null);
      setRecordedDiagnosticsStatus('idle');
      return;
    }

    const abortController = new AbortController();
    setRecordedDiagnosticsStatus('loading');
    void api
      .get<RecordedDiagnosticResponse>(
        `/api/v2/products/scans/${encodeURIComponent(props.scan.id)}/diagnostics`,
        {
          cache: 'no-store',
          signal: abortController.signal,
        }
      )
      .then((response) => {
        if (!isAmazonRecordedDiagnosticsResponse(response)) {
          setRecordedDiagnostics(null);
          setRecordedDiagnosticsStatus('error');
          return;
        }
        setRecordedDiagnostics(response);
        setRecordedDiagnosticsStatus('loaded');
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return;
        }
        setRecordedDiagnostics(null);
        setRecordedDiagnosticsStatus(
          error instanceof Error && error.name === 'AbortError' ? 'idle' : 'error'
        );
      });

    return () => {
      abortController.abort();
    };
  }, [props.scan.id, shouldLoadRecordedDiagnostics]);

  const recordedArtifacts = recordedDiagnostics?.artifacts ?? [];
  const recordedClassification = recordedDiagnostics?.classification ?? null;

  if (
    !diagnostics &&
    recordedClassification === null &&
    recordedArtifacts.length === 0 &&
    recordedDiagnosticsStatus !== 'loading'
  ) {
    return null;
  }

  return (
    <div className='space-y-3 rounded-md border border-border/60 bg-muted/20 px-3 py-3'>
      <div className='flex flex-wrap gap-2'>
        {diagnostics?.runId ? (
          <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
            Run {diagnostics.runId}
          </span>
        ) : null}
        {diagnostics?.runStatus ? (
          <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
            {formatLabel(diagnostics.runStatus)}
          </span>
        ) : null}
        {diagnostics?.imageSearchProvider ? (
          <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
            {formatAmazonImageSearchProvider(diagnostics.imageSearchProvider)}
          </span>
        ) : null}
        {diagnostics?.latestStage ? (
          <span className='inline-flex items-center rounded-md border border-amber-500/40 bg-background/70 px-2.5 py-1 text-xs font-medium text-amber-300'>
            Stage: {formatLabel(diagnostics.latestStage)}
          </span>
        ) : null}
        {diagnostics && diagnostics.failureArtifacts.length > 0 ? (
          <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
            {diagnostics.failureArtifacts.length} artifact
            {diagnostics.failureArtifacts.length === 1 ? '' : 's'}
          </span>
        ) : null}
        {recordedClassification ? (
          <span className='inline-flex items-center rounded-md border border-sky-500/40 bg-background/70 px-2.5 py-1 text-xs font-medium text-sky-300'>
            Signature: {formatLabel(recordedClassification.kind)}
          </span>
        ) : null}
        {recordedArtifacts.length > 0 ? (
          <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
            {recordedArtifacts.length} recorded artifact
            {recordedArtifacts.length === 1 ? '' : 's'}
          </span>
        ) : null}
        {recordedDiagnosticsStatus === 'loading' && !diagnostics ? (
          <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium text-muted-foreground'>
            Loading recorded diagnostics
          </span>
        ) : null}
      </div>

      {recordedClassification || recordedArtifacts.length > 0 ? (
        <div className='space-y-2'>
          <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
            Recorded Diagnostics
          </p>
          {recordedClassification ? (
            <div className='rounded-md border border-border/40 bg-background/70 px-3 py-2'>
              <p className='text-sm font-medium'>
                Failure signature: {formatLabel(recordedClassification.kind)}
              </p>
              <p className='mt-1 text-xs text-muted-foreground'>
                {recordedClassification.details.reason}
              </p>
            </div>
          ) : null}
          {recordedArtifacts.length > 0 ? (
            <ul className='space-y-2'>
              {recordedArtifacts.map((artifact) => {
                const artifactHref = buildProductScanRecordedDiagnosticArtifactHref(
                  props.scan.id,
                  artifact.filename
                );

                return (
                  <li
                    key={artifact.filename}
                    className='space-y-2 rounded-md border border-border/40 bg-background/70 px-3 py-2'
                  >
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='text-sm font-medium'>{artifact.filename}</span>
                      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                        {artifact.mimeType}
                      </span>
                      {formatFileSize(artifact.sizeBytes) ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                          {formatFileSize(artifact.sizeBytes)}
                        </span>
                      ) : null}
                    </div>
                    {formatTimestamp(artifact.mtime) ? (
                      <p className='text-xs text-muted-foreground'>
                        Updated {formatTimestamp(artifact.mtime)}
                      </p>
                    ) : null}
                    <div className='flex flex-wrap items-center gap-2'>
                      {artifactHref ? (
                        <a
                          href={artifactHref}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'
                        >
                          {resolveRecordedDiagnosticActionLabel(artifact)}
                          <ExternalLink className='h-3.5 w-3.5' />
                        </a>
                      ) : null}
                      <CopyButton
                        value={artifact.filename}
                        variant='outline'
                        size='sm'
                        showText
                        className='h-7 px-2 text-xs'
                        ariaLabel={`Copy diagnostic filename for ${artifact.filename}`}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}

      {diagnostics !== null ? (
        <>
          {(diagnostics.latestStageUrl ?? null) !== null ? (
            <div className='space-y-1'>
              <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                Latest Stage URL
              </p>
              <div className='flex flex-wrap items-center gap-2'>
                <a
                  href={diagnostics.latestStageUrl!}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'
                >
                  Open URL
                  <ExternalLink className='h-3.5 w-3.5' />
                </a>
                <CopyButton
                  value={diagnostics.latestStageUrl!}
                  variant='outline'
                  size='sm'
                  showText
                  className='h-7 px-2 text-xs'
                  ariaLabel='Copy latest stage URL'
                />
              </div>
            </div>
          ) : null}

          {(diagnostics.imageSearchPageUrl ?? null) !== null ? (
            <div className='space-y-1'>
              <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                Image Search Page URL
              </p>
              <div className='flex flex-wrap items-center gap-2'>
                <a
                  href={diagnostics.imageSearchPageUrl!}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'
                >
                  Open search page
                  <ExternalLink className='h-3.5 w-3.5' />
                </a>
                <CopyButton
                  value={diagnostics.imageSearchPageUrl!}
                  variant='outline'
                  size='sm'
                  showText
                  className='h-7 px-2 text-xs'
                  ariaLabel='Copy image search page URL'
                />
              </div>
            </div>
          ) : null}

          {diagnostics.runtimePosture !== null ? (
            <div className='space-y-2'>
              <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                Runtime Posture
              </p>
              <div className='grid gap-2 sm:grid-cols-2'>
                {[
                  { label: 'Browser', content: formatRuntimePostureBrowser(diagnostics.runtimePosture) },
                  { label: 'Identity', content: formatRuntimePostureIdentity(diagnostics.runtimePosture) },
                  { label: 'Proxy', content: formatRuntimePostureProxy(diagnostics.runtimePosture) },
                  { label: 'Sticky state', content: formatRuntimePostureStorage(diagnostics.runtimePosture) },
                ]
                  .filter((entry): entry is { label: string; content: string } => hasText(entry.content))
                  .map((entry) => (
                    <div
                      key={entry.label}
                      className='space-y-1 rounded-md border border-border/40 bg-background/70 px-3 py-2'
                    >
                      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                        {entry.label}
                      </p>
                      <p className='break-words text-sm'>{entry.content}</p>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}

          {evaluationPolicySummary !== null ? (
            <div className='space-y-2'>
              <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                AI Evaluator Policy
              </p>
              <div className='grid gap-2 sm:grid-cols-2'>
                {[
                  { label: 'Execution', content: evaluationPolicySummary.executionLabel },
                  { label: 'Model source', content: evaluationPolicySummary.modelSource },
                  { label: 'Model', content: evaluationPolicySummary.modelLabel },
                  { label: 'Threshold', content: evaluationPolicySummary.thresholdLabel },
                  { label: 'Evaluation scope', content: evaluationPolicySummary.scopeLabel },
                  {
                    label: 'Similarity decision',
                    content: evaluationPolicySummary.similarityDecisionLabel,
                  },
                  { label: 'Language gate', content: evaluationPolicySummary.languageGateLabel },
                  {
                    label: 'Language detection',
                    content: evaluationPolicySummary.languageDetectionLabel,
                  },
                ]
                  .filter((entry): entry is { label: string; content: string } => hasText(entry.content))
                  .map((entry) => (
                    <div
                      key={entry.label}
                      className='space-y-1 rounded-md border border-border/40 bg-background/70 px-3 py-2'
                    >
                      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                        {entry.label}
                      </p>
                      <p className='break-words text-sm'>{entry.content}</p>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}

          {diagnostics.amazonAiStages.length > 0 ? (
            <div className='space-y-2'>
              <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                Amazon AI Chain
              </p>
              <ul className='space-y-2'>
                {diagnostics.amazonAiStages.map((stage, index) => (
                  <li
                    key={`${stage.stage}-${stage.evaluatedAt ?? 'na'}-${index}`}
                    className='space-y-2 rounded-md border border-border/40 bg-background/70 px-3 py-2'
                  >
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='text-sm font-medium'>{formatAmazonAiStage(stage.stage)}</span>
                      {formatAmazonAiStageStatus(stage.status) ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                          {formatAmazonAiStageStatus(stage.status)}
                        </span>
                      ) : null}
                      {stage.model ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                          {stage.model}
                        </span>
                      ) : null}
                      {formatAmazonAiThreshold(stage.threshold) ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                          Threshold {formatAmazonAiThreshold(stage.threshold)}
                        </span>
                      ) : null}
                      {stage.candidateRankBefore != null ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                          Rank before #{stage.candidateRankBefore}
                        </span>
                      ) : null}
                      {stage.candidateRankAfter != null ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                          Rank after #{stage.candidateRankAfter}
                        </span>
                      ) : null}
                    </div>
                    <div className='grid gap-2 sm:grid-cols-2'>
                      {[
                        { label: 'Recommended action', value: formatLabel(stage.recommendedAction) },
                        { label: 'Rejection category', value: formatLabel(stage.rejectionCategory) },
                        { label: 'Language', value: formatAmazonAiStageLanguage(stage.pageLanguage) },
                        {
                          label: 'Language accepted',
                          value:
                            typeof stage.languageAccepted === 'boolean'
                              ? String(stage.languageAccepted)
                              : null,
                        },
                        {
                          label: 'Image search provider',
                          value: formatAmazonImageSearchProvider(stage.provider),
                        },
                        { label: 'Evaluated at', value: formatTimestamp(stage.evaluatedAt) },
                      ]
                        .filter((entry): entry is { label: string; value: string } => hasText(entry.value))
                        .map((entry) => (
                          <div
                            key={`${stage.stage}-${entry.label}`}
                            className='space-y-1 rounded-md border border-border/40 bg-muted/20 px-3 py-2'
                          >
                            <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                              {entry.label}
                            </p>
                            <p className='break-words text-sm'>{entry.value}</p>
                          </div>
                        ))}
                    </div>
                    {stage.topReasons.length > 0 ? (
                      <div className='space-y-1'>
                        <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                          Top reasons
                        </p>
                        <ul className='space-y-1 text-sm text-muted-foreground'>
                          {stage.topReasons.map((reason) => (
                            <li key={`${stage.stage}-${reason}`}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {diagnostics.failureArtifacts.length > 0 ? (
            <div className='space-y-2'>
              <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                Artifacts
              </p>
              <ul className='space-y-2'>
                {diagnostics.failureArtifacts.map((artifact) => {
                  const artifactHref = buildProductScanArtifactHref(props.scan.id, artifact);

                  return (
                    <li
                      key={`${artifact.name}-${artifact.path}`}
                      className='space-y-2 rounded-md border border-border/40 bg-background/70 px-3 py-2'
                    >
                      <div className='flex flex-wrap items-center gap-2'>
                        <span className='text-sm font-medium'>{resolveArtifactDisplayName(artifact)}</span>
                        {artifact.kind ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                            {formatLabel(artifact.kind)}
                          </span>
                        ) : null}
                        {artifact.mimeType ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                            {artifact.mimeType}
                          </span>
                        ) : null}
                      </div>
                      <p className='break-all text-xs text-muted-foreground'>{artifact.path}</p>
                      <div className='flex flex-wrap items-center gap-2'>
                        {artifactHref ? (
                          <a
                            href={artifactHref}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'
                          >
                            {resolveArtifactActionLabel(artifact)}
                            <ExternalLink className='h-3.5 w-3.5' />
                          </a>
                        ) : null}
                        <CopyButton
                          value={artifact.path}
                          variant='outline'
                          size='sm'
                          showText
                          className='h-7 px-2 text-xs'
                          ariaLabel={`Copy artifact path for ${artifact.name}`}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {diagnostics.logTail.length > 0 ? (
            <div className='space-y-2'>
              <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                Log Tail
              </p>
              <pre className='max-h-52 overflow-auto rounded-md border border-border/40 bg-background/70 px-3 py-2 text-[11px] text-muted-foreground'>
                {diagnostics.logTail.join('\n')}
              </pre>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
