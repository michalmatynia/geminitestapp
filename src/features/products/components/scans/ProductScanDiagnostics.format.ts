import type {
  AmazonAiStageEvidence,
  ScanFailureArtifact,
  ScanRuntimePosture,
} from './ProductScanDiagnostics.types';

export const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const readOptionalText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const readStringifiedText = (value: unknown): string | null =>
  readOptionalText(String(value ?? ''));

export const formatLabel = (value: string | null | undefined): string | null => {
  if (hasText(value) === false) return null;
  return value
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const formatTimestamp = (value: string | null | undefined): string | null => {
  if (hasText(value) === false) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

export const formatAmazonImageSearchProvider = (
  value: string | null | undefined
): string | null => {
  if (hasText(value) === false) return null;
  if (value === 'google_images_upload') return 'Google Images Upload';
  if (value === 'google_images_url') return 'Google Images URL';
  if (value === 'google_lens_upload') return 'Google Lens Upload';
  return formatLabel(value);
};

export const formatAmazonAiStage = (value: AmazonAiStageEvidence['stage']): string => {
  if (value === 'candidate_triage') return 'Candidate triage';
  if (value === 'probe_evaluate') return 'Probe evaluator';
  return 'Extraction evaluator';
};

export const formatAmazonAiStageStatus = (
  value: string | null | undefined
): string | null => {
  if (hasText(value) === false) return null;
  if (value === 'approved') return 'Approved';
  if (value === 'rejected') return 'Rejected';
  if (value === 'skipped') return 'Skipped';
  if (value === 'failed') return 'Failed';
  return formatLabel(value);
};

export const formatAmazonAiThreshold = (value: number | null | undefined): string | null =>
  typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value * 100)}%` : null;

const LANGUAGE_LABELS: Record<string, string> = {
  de: 'German',
  en: 'English',
  'en-gb': 'English (UK)',
  'en-us': 'English (US)',
  es: 'Spanish',
  fr: 'French',
  it: 'Italian',
  pl: 'Polish',
};

export const formatAmazonAiStageLanguage = (
  value: string | null | undefined
): string | null => {
  if (hasText(value) === false) return null;
  const normalized = value.trim().toLowerCase();
  return LANGUAGE_LABELS[normalized] ?? normalized.toUpperCase();
};

export const formatFileSize = (sizeBytes: number): string | null => {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) return null;
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const isRuntimePostureArtifact = (artifact: ScanFailureArtifact): boolean => {
  const normalizedName = artifact.name.trim().toLowerCase();
  const normalizedPath = artifact.path.trim().toLowerCase();
  return normalizedName === 'runtime-posture' || normalizedPath.includes('runtime-posture');
};

export const resolveArtifactActionLabel = (artifact: ScanFailureArtifact): string => {
  if (artifact.mimeType?.startsWith('image/') === true) return 'View screenshot';
  if (artifact.mimeType === 'text/html') return 'View page HTML';
  if (artifact.mimeType === 'application/json') {
    return isRuntimePostureArtifact(artifact) ? 'View runtime posture JSON' : 'View JSON';
  }
  return 'Open artifact';
};

export const resolveArtifactDisplayName = (artifact: ScanFailureArtifact): string =>
  isRuntimePostureArtifact(artifact) ? 'Runtime posture' : artifact.name;

export const resolveRecordedDiagnosticActionLabel = (artifact: {
  mimeType: string;
}): string => {
  if (artifact.mimeType.startsWith('image/')) return 'View recorded screenshot';
  if (artifact.mimeType === 'application/zip') return 'Open trace ZIP';
  if (artifact.mimeType.includes('html')) return 'Open HTML snapshot';
  if (artifact.mimeType === 'application/json') return 'Open JSON snapshot';
  return 'Open diagnostic artifact';
};

export const resolveDiagnosticPhaseLabel = (latestStage: string | null): string => {
  if (latestStage === null) return 'Diagnostics';
  if (latestStage === 'validate' || latestStage === 'prepare_scan' || latestStage === 'queue_scan') {
    return 'Input';
  }
  if (latestStage.startsWith('google_')) return 'Google Lens';
  if (latestStage.startsWith('amazon_')) return 'Amazon';
  return 'Product Update';
};

export const formatRuntimePostureBrowser = (
  runtimePosture: ScanRuntimePosture
): string | null => {
  const mode = formatHeadlessMode(runtimePosture.headless);
  const parts = [
    runtimePosture.browserLabel ?? formatLabel(runtimePosture.browserEngine),
    mode,
  ].filter((value): value is string => hasText(value));
  return parts.length > 0 ? parts.join(' · ') : null;
};

const formatHeadlessMode = (headless: boolean | null): string | null => {
  if (headless === null) return null;
  return headless ? 'Headless' : 'Headed';
};

export const formatRuntimePostureIdentity = (
  runtimePosture: ScanRuntimePosture
): string | null => {
  const parts = [
    hasText(runtimePosture.identityProfile)
      ? `${formatLabel(runtimePosture.identityProfile)} profile`
      : null,
    runtimePosture.locale,
    runtimePosture.timezoneId,
  ].filter((value): value is string => hasText(value));
  return parts.length > 0 ? parts.join(' · ') : null;
};

export const formatRuntimePostureProxy = (
  runtimePosture: ScanRuntimePosture
): string | null => {
  if (runtimePosture.proxyEnabled === false) return 'Disabled';
  const parts = [
    formatLabel(runtimePosture.proxyProviderPreset),
    formatLabel(runtimePosture.proxySessionMode),
    formatLabel(runtimePosture.proxyReason),
    runtimePosture.proxyServerHost,
  ].filter((value): value is string => hasText(value));
  if (parts.length > 0) return parts.join(' · ');
  if (runtimePosture.proxyEnabled === true) return 'Enabled';
  return null;
};

export const formatRuntimePostureStorage = (
  runtimePosture: ScanRuntimePosture
): string | null => {
  if (runtimePosture.stickyStorageEnabled === false) return 'Disabled';
  if (runtimePosture.stickyStorageEnabled !== true) return null;
  return runtimePosture.stickyStorageLoaded === true ? 'Loaded sticky state' : 'Cold sticky state';
};
