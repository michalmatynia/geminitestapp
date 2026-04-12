'use client';

import { ExternalLink } from 'lucide-react';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';
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
  latestStage: string | null;
  latestStageUrl: string | null;
  failureArtifacts: ScanFailureArtifact[];
  runtimePosture: ScanRuntimePosture | null;
  logTail: string[];
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
  if (!hasText(value)) {
    return null;
  }

  return value
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatTimestamp = (value: string | null | undefined): string | null => {
  if (!hasText(value)) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const readOptionalBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const normalizeFailureArtifacts = (value: unknown): ScanFailureArtifact[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!isObjectRecord(entry)) {
        return null;
      }

      const name = hasText(String(entry['name'] ?? '')) ? String(entry['name']).trim() : null;
      const path = hasText(String(entry['path'] ?? '')) ? String(entry['path']).trim() : null;
      if (!name || !path) {
        return null;
      }

      return {
        name,
        path,
        kind: hasText(String(entry['kind'] ?? '')) ? String(entry['kind']).trim() : null,
        mimeType: hasText(String(entry['mimeType'] ?? ''))
          ? String(entry['mimeType']).trim()
          : null,
      };
    })
    .filter((entry): entry is ScanFailureArtifact => Boolean(entry));
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
  const latestStage = hasText(String(scan.rawResult['latestStage'] ?? ''))
    ? String(scan.rawResult['latestStage']).trim()
    : null;
  const latestStageUrl = hasText(String(scan.rawResult['latestStageUrl'] ?? ''))
    ? String(scan.rawResult['latestStageUrl']).trim()
    : null;
  const failureArtifacts = normalizeFailureArtifacts(scan.rawResult['failureArtifacts']);
  const runtimePosture = normalizeRuntimePosture(scan.rawResult['runtimePosture']);
  const logTail = normalizeLogTail(scan.rawResult['logTail']);

  if (
    !runId &&
    !runStatus &&
    !imageSearchProvider &&
    !latestStage &&
    !latestStageUrl &&
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
    latestStage,
    latestStageUrl,
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

export function ProductScanDiagnostics(props: {
  scan: Pick<ProductScanRecord, 'id' | 'rawResult' | 'steps'>;
}): React.JSX.Element | null {
  const diagnostics = resolveProductScanDiagnostics(props.scan);
  const evaluationPolicySummary = resolveProductScanEvaluationPolicySummary(props.scan.steps ?? []);
  if (!diagnostics) {
    return null;
  }

  return (
    <div className='space-y-3 rounded-md border border-border/60 bg-muted/20 px-3 py-3'>
      <div className='flex flex-wrap gap-2'>
        {diagnostics.runId ? (
          <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
            Run {diagnostics.runId}
          </span>
        ) : null}
        {diagnostics.runStatus ? (
          <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
            {formatLabel(diagnostics.runStatus)}
          </span>
        ) : null}
        {diagnostics.imageSearchProvider ? (
          <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
            {formatAmazonImageSearchProvider(diagnostics.imageSearchProvider)}
          </span>
        ) : null}
        {diagnostics.latestStage ? (
          <span className='inline-flex items-center rounded-md border border-amber-500/40 bg-background/70 px-2.5 py-1 text-xs font-medium text-amber-300'>
            Stage: {formatLabel(diagnostics.latestStage)}
          </span>
        ) : null}
        {diagnostics.failureArtifacts.length > 0 ? (
          <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
            {diagnostics.failureArtifacts.length} artifact
            {diagnostics.failureArtifacts.length === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      {diagnostics.latestStageUrl ? (
        <div className='space-y-1'>
          <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
            Latest Stage URL
          </p>
          <div className='flex flex-wrap items-center gap-2'>
            <a
              href={diagnostics.latestStageUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'
            >
              Open URL
              <ExternalLink className='h-3.5 w-3.5' />
            </a>
            <CopyButton
              value={diagnostics.latestStageUrl}
              variant='outline'
              size='sm'
              showText
              className='h-7 px-2 text-xs'
              ariaLabel='Copy latest stage URL'
            />
          </div>
        </div>
      ) : null}

      {diagnostics.runtimePosture ? (
        <div className='space-y-2'>
          <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
            Runtime Posture
          </p>
          <div className='grid gap-2 sm:grid-cols-2'>
            {[
              { label: 'Browser', value: formatRuntimePostureBrowser(diagnostics.runtimePosture) },
              { label: 'Identity', value: formatRuntimePostureIdentity(diagnostics.runtimePosture) },
              { label: 'Proxy', value: formatRuntimePostureProxy(diagnostics.runtimePosture) },
              { label: 'Sticky state', value: formatRuntimePostureStorage(diagnostics.runtimePosture) },
            ]
              .filter((entry): entry is { label: string; value: string } => hasText(entry.value))
              .map((entry) => (
                <div
                  key={entry.label}
                  className='space-y-1 rounded-md border border-border/40 bg-background/70 px-3 py-2'
                >
                  <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                    {entry.label}
                  </p>
                  <p className='break-words text-sm'>{entry.value}</p>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      {evaluationPolicySummary ? (
        <div className='space-y-2'>
          <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
            AI Evaluator Policy
          </p>
          <div className='grid gap-2 sm:grid-cols-2'>
            {[
              { label: 'Execution', value: evaluationPolicySummary.executionLabel },
              { label: 'Model source', value: evaluationPolicySummary.modelSource },
              { label: 'Model', value: evaluationPolicySummary.modelLabel },
              { label: 'Threshold', value: evaluationPolicySummary.thresholdLabel },
              { label: 'Evaluation scope', value: evaluationPolicySummary.scopeLabel },
              {
                label: 'Similarity decision',
                value: evaluationPolicySummary.similarityDecisionLabel,
              },
              { label: 'Language gate', value: evaluationPolicySummary.languageGateLabel },
              {
                label: 'Language detection',
                value: evaluationPolicySummary.languageDetectionLabel,
              },
            ]
              .filter((entry): entry is { label: string; value: string } => hasText(entry.value))
              .map((entry) => (
                <div
                  key={entry.label}
                  className='space-y-1 rounded-md border border-border/40 bg-background/70 px-3 py-2'
                >
                  <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                    {entry.label}
                  </p>
                  <p className='break-words text-sm'>{entry.value}</p>
                </div>
              ))}
          </div>
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
    </div>
  );
}
