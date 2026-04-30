import type {
  AmazonAiStageEvidence,
  RecordedDiagnosticClassification,
  RecordedDiagnosticResponse,
  ScanFailureArtifact,
  ScanRuntimePosture,
} from './ProductScanDiagnostics.types';
import { readOptionalText, readStringifiedText } from './ProductScanDiagnostics.format';

export const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && value !== undefined && typeof value === 'object' && Array.isArray(value) === false;

const readOptionalBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const readOptionalNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const normalizeFailureArtifact = (entry: unknown): ScanFailureArtifact | null => {
  if (isObjectRecord(entry) === false) return null;
  const name = readStringifiedText(entry['name']);
  const path = readStringifiedText(entry['path']);
  if (name === null || path === null) return null;
  return {
    name,
    path,
    kind: readStringifiedText(entry['kind']),
    mimeType: readStringifiedText(entry['mimeType']),
  };
};

export const normalizeFailureArtifacts = (value: unknown): ScanFailureArtifact[] => {
  if (Array.isArray(value) === false) return [];
  return value
    .map((entry) => normalizeFailureArtifact(entry))
    .filter((entry): entry is ScanFailureArtifact => entry !== null);
};

const isAmazonAiStage = (value: string | null): value is AmazonAiStageEvidence['stage'] =>
  value === 'candidate_triage' || value === 'probe_evaluate' || value === 'extraction_evaluate';

const normalizeAmazonAiStage = (entry: unknown): AmazonAiStageEvidence | null => {
  if (isObjectRecord(entry) === false) return null;
  const stage = readStringifiedText(entry['stage']);
  if (isAmazonAiStage(stage) === false) return null;

  return {
    stage,
    status: readStringifiedText(entry['status']),
    model: readStringifiedText(entry['model']),
    threshold: readOptionalNumber(entry['threshold']),
    candidateRankBefore: readOptionalNumber(entry['candidateRankBefore']),
    candidateRankAfter: readOptionalNumber(entry['candidateRankAfter']),
    recommendedAction: readStringifiedText(entry['recommendedAction']),
    rejectionCategory: readStringifiedText(entry['rejectionCategory']),
    pageLanguage: readStringifiedText(entry['pageLanguage']),
    languageAccepted: readOptionalBoolean(entry['languageAccepted']),
    topReasons: normalizeTopReasons(entry['topReasons']),
    provider: readStringifiedText(entry['provider']),
    evaluatedAt: readStringifiedText(entry['evaluatedAt']),
  };
};

const normalizeTopReasons = (value: unknown): string[] => {
  if (Array.isArray(value) === false) return [];
  return value
    .map((reason) => readOptionalText(typeof reason === 'string' ? reason : null))
    .filter((reason): reason is string => reason !== null)
    .slice(0, 3);
};

export const normalizeAmazonAiStages = (value: unknown): AmazonAiStageEvidence[] => {
  if (Array.isArray(value) === false) return [];
  return value
    .map((entry) => normalizeAmazonAiStage(entry))
    .filter((entry): entry is AmazonAiStageEvidence => entry !== null);
};

export const normalizeLogTail = (value: unknown): string[] => {
  if (Array.isArray(value) === false) return [];
  return value
    .map((entry) => readOptionalText(typeof entry === 'string' ? entry : null))
    .filter((entry): entry is string => entry !== null)
    .slice(-12);
};

const readNestedRecord = (
  record: Record<string, unknown> | null,
  key: string
): Record<string, unknown> | null => {
  const value = record?.[key];
  return isObjectRecord(value) ? value : null;
};

export const normalizeRuntimePosture = (value: unknown): ScanRuntimePosture | null => {
  const record = isObjectRecord(value) ? value : null;
  if (record === null) return null;

  const browser = readNestedRecord(record, 'browser');
  const antiDetection = readNestedRecord(record, 'antiDetection');
  const proxy = readNestedRecord(antiDetection, 'proxy');
  const stickyStorageState = readNestedRecord(antiDetection, 'stickyStorageState');
  const runtimePosture = buildRuntimePosture({
    antiDetection,
    browser,
    proxy,
    stickyStorageState,
  });

  return Object.values(runtimePosture).some((entry) => entry !== null) ? runtimePosture : null;
};

const buildRuntimePosture = (input: {
  antiDetection: Record<string, unknown> | null;
  browser: Record<string, unknown> | null;
  proxy: Record<string, unknown> | null;
  stickyStorageState: Record<string, unknown> | null;
}): ScanRuntimePosture => ({
  ...buildBrowserRuntimePosture(input.browser),
  ...buildAntiDetectionRuntimePosture(input.antiDetection),
  ...buildProxyRuntimePosture(input.proxy),
  ...buildStickyStorageRuntimePosture(input.stickyStorageState),
});

const buildBrowserRuntimePosture = (
  browser: Record<string, unknown> | null
): Pick<ScanRuntimePosture, 'browserLabel' | 'browserEngine' | 'headless'> => ({
  browserLabel: readStringifiedText(browser?.['label']),
  browserEngine: readStringifiedText(browser?.['engine']),
  headless: readOptionalBoolean(browser?.['headless']),
});

const buildAntiDetectionRuntimePosture = (
  antiDetection: Record<string, unknown> | null
): Pick<ScanRuntimePosture, 'identityProfile' | 'locale' | 'timezoneId'> => ({
  identityProfile: readStringifiedText(antiDetection?.['identityProfile']),
  locale: readStringifiedText(antiDetection?.['locale']),
  timezoneId: readStringifiedText(antiDetection?.['timezoneId']),
});

const buildProxyRuntimePosture = (
  proxy: Record<string, unknown> | null
): Pick<
  ScanRuntimePosture,
  | 'proxyEnabled'
  | 'proxyProviderPreset'
  | 'proxyReason'
  | 'proxyServerHost'
  | 'proxySessionMode'
> => ({
  proxyEnabled: readOptionalBoolean(proxy?.['enabled']),
  proxyProviderPreset: readStringifiedText(proxy?.['providerPreset']),
  proxySessionMode: readStringifiedText(proxy?.['sessionMode']),
  proxyReason: readStringifiedText(proxy?.['reason']),
  proxyServerHost: readStringifiedText(proxy?.['serverHost']),
});

const buildStickyStorageRuntimePosture = (
  stickyStorageState: Record<string, unknown> | null
): Pick<ScanRuntimePosture, 'stickyStorageEnabled' | 'stickyStorageLoaded'> => ({
  stickyStorageEnabled: readOptionalBoolean(stickyStorageState?.['enabled']),
  stickyStorageLoaded: readOptionalBoolean(stickyStorageState?.['loaded']),
});

const readRecordText = (record: Record<string, unknown>, key: string): string | null =>
  readOptionalText(record[key]);

export const isAmazonRecordedDiagnosticsResponse = (
  value: unknown
): value is RecordedDiagnosticResponse => {
  if (isObjectRecord(value) === false) return false;
  const classification = value['classification'];
  return (
    typeof value['scanId'] === 'string' &&
    typeof value['provider'] === 'string' &&
    typeof value['status'] === 'string' &&
    Array.isArray(value['artifacts']) &&
    isObjectRecord(classification) &&
    typeof classification['kind'] === 'string' &&
    hasRecordedDiagnosticDetails(classification['details'])
  );
};

const hasRecordedDiagnosticDetails = (value: unknown): boolean =>
  isObjectRecord(value) && typeof value['reason'] === 'string';

const readRecoveryBoolean = (record: Record<string, unknown>, key: string): boolean =>
  record[key] === true;

export const normalizeRecordedDiagnosticRecovery = (
  value: RecordedDiagnosticClassification['details']['recovery']
): NonNullable<RecordedDiagnosticClassification['details']['recovery']> | null => {
  if (isObjectRecord(value) === false) return null;
  const recovery = {
    automaticRetryAttempted: readRecoveryBoolean(value, 'automaticRetryAttempted'),
    automaticRetrySkipped: readRecoveryBoolean(value, 'automaticRetrySkipped'),
    manualFallbackOpened: readRecoveryBoolean(value, 'manualFallbackOpened'),
    recoveryPath: readRecordText(value, 'recoveryPath'),
    latestCaptchaStage: readRecordText(value, 'latestCaptchaStage'),
  };
  return hasRecordedDiagnosticRecovery(recovery) ? recovery : null;
};

const hasRecordedDiagnosticRecovery = (
  recovery: NonNullable<RecordedDiagnosticClassification['details']['recovery']>
): boolean =>
  recovery.automaticRetryAttempted === true ||
  recovery.automaticRetrySkipped === true ||
  recovery.manualFallbackOpened === true ||
  recovery.recoveryPath !== null ||
  recovery.latestCaptchaStage !== null;
