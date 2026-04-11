'use client';

import { ExternalLink } from 'lucide-react';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { CopyButton } from '@/shared/ui/copy-button';
import { resolveProductScanFailureSourceLabel } from './ProductScanSteps';

type ScanFailureArtifact = {
  name: string;
  path: string;
  kind: string | null;
  mimeType: string | null;
};

type ScanDiagnostics = {
  runId: string | null;
  runStatus: string | null;
  latestStage: string | null;
  latestStageUrl: string | null;
  failureArtifacts: ScanFailureArtifact[];
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

const resolveArtifactActionLabel = (artifact: ScanFailureArtifact): string => {
  if (artifact.mimeType?.startsWith('image/')) {
    return 'View screenshot';
  }
  if (artifact.mimeType === 'text/html') {
    return 'View page HTML';
  }
  return 'Open artifact';
};

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
  const latestStage = hasText(String(scan.rawResult['latestStage'] ?? ''))
    ? String(scan.rawResult['latestStage']).trim()
    : null;
  const latestStageUrl = hasText(String(scan.rawResult['latestStageUrl'] ?? ''))
    ? String(scan.rawResult['latestStageUrl']).trim()
    : null;
  const failureArtifacts = normalizeFailureArtifacts(scan.rawResult['failureArtifacts']);
  const logTail = normalizeLogTail(scan.rawResult['logTail']);

  if (!runId && !runStatus && !latestStage && !latestStageUrl && failureArtifacts.length === 0 && logTail.length === 0) {
    return null;
  }

  return {
    runId,
    runStatus,
    latestStage,
    latestStageUrl,
    failureArtifacts,
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
  scan: Pick<ProductScanRecord, 'id' | 'rawResult'>;
}): React.JSX.Element | null {
  const diagnostics = resolveProductScanDiagnostics(props.scan);
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
                    <span className='text-sm font-medium'>{artifact.name}</span>
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
