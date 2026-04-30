import { ExternalLink } from 'lucide-react';
import React from 'react';

import { CopyButton } from '@/shared/ui/copy-button';

import {
  formatFileSize,
  formatLabel,
  formatTimestamp,
  resolveRecordedDiagnosticActionLabel,
} from './ProductScanDiagnostics.format';
import { normalizeRecordedDiagnosticRecovery } from './ProductScanDiagnostics.normalize';
import { buildProductScanRecordedDiagnosticArtifactHref } from './ProductScanDiagnostics.resolve';
import type {
  RecordedDiagnosticArtifact,
  RecordedDiagnosticClassification,
} from './ProductScanDiagnostics.types';

type ProductScanDiagnosticsRecordedSectionProps = {
  artifacts: RecordedDiagnosticArtifact[];
  classification: RecordedDiagnosticClassification | null;
  scanId: string;
};

function RecordedRecoveryBadges(props: {
  recovery: NonNullable<RecordedDiagnosticClassification['details']['recovery']>;
}): React.JSX.Element {
  const { recovery } = props;
  return (
    <div className='mt-2 flex flex-wrap gap-2'>
      {recovery.automaticRetryAttempted === true ? (
        <span className='inline-flex items-center rounded-md border border-amber-500/40 px-2 py-0.5 text-[11px] font-medium text-amber-300'>
          Automatic retry attempted
        </span>
      ) : null}
      {recovery.automaticRetrySkipped === true ? (
        <span className='inline-flex items-center rounded-md border border-orange-500/40 px-2 py-0.5 text-[11px] font-medium text-orange-300'>
          Automatic retry skipped
        </span>
      ) : null}
      {recovery.manualFallbackOpened === true ? (
        <span className='inline-flex items-center rounded-md border border-sky-500/40 px-2 py-0.5 text-[11px] font-medium text-sky-300'>
          Manual fallback opened
        </span>
      ) : null}
      {typeof recovery.latestCaptchaStage === 'string' ? (
        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
          Blocked at {formatLabel(recovery.latestCaptchaStage)}
        </span>
      ) : null}
    </div>
  );
}

function RecordedClassificationCard(props: {
  classification: RecordedDiagnosticClassification;
}): React.JSX.Element {
  const recordedRecovery = normalizeRecordedDiagnosticRecovery(
    props.classification.details.recovery
  );
  return (
    <div className='rounded-md border border-border/40 bg-background/70 px-3 py-2'>
      <p className='text-sm font-medium'>
        Failure signature: {formatLabel(props.classification.kind)}
      </p>
      <p className='mt-1 text-xs text-muted-foreground'>
        {props.classification.details.reason}
      </p>
      {recordedRecovery !== null ? <RecordedRecoveryBadges recovery={recordedRecovery} /> : null}
    </div>
  );
}

function RecordedArtifactRow(props: {
  artifact: RecordedDiagnosticArtifact;
  scanId: string;
}): React.JSX.Element {
  const { artifact, scanId } = props;
  const artifactHref = buildProductScanRecordedDiagnosticArtifactHref(scanId, artifact.filename);
  const formattedSize = formatFileSize(artifact.sizeBytes);
  const formattedTime = formatTimestamp(artifact.mtime);

  return (
    <li className='space-y-2 rounded-md border border-border/40 bg-background/70 px-3 py-2'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-sm font-medium'>{artifact.filename}</span>
        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
          {artifact.mimeType}
        </span>
        {formattedSize !== null ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
            {formattedSize}
          </span>
        ) : null}
      </div>
      {formattedTime !== null ? (
        <p className='text-xs text-muted-foreground'>Updated {formattedTime}</p>
      ) : null}
      <div className='flex flex-wrap items-center gap-2'>
        {artifactHref !== null ? (
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
}

export function ProductScanDiagnosticsRecordedSection(
  props: ProductScanDiagnosticsRecordedSectionProps
): React.JSX.Element | null {
  if (props.classification === null && props.artifacts.length === 0) return null;
  return (
    <div className='space-y-2'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        Recorded Diagnostics
      </p>
      {props.classification !== null ? (
        <RecordedClassificationCard classification={props.classification} />
      ) : null}
      {props.artifacts.length > 0 ? (
        <ul className='space-y-2'>
          {props.artifacts.map((artifact) => (
            <RecordedArtifactRow
              key={artifact.filename}
              artifact={artifact}
              scanId={props.scanId}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
