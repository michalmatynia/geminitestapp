import { ExternalLink } from 'lucide-react';
import React from 'react';

import { CopyButton } from '@/shared/ui/copy-button';

import {
  formatLabel,
  resolveArtifactActionLabel,
  resolveArtifactDisplayName,
} from './ProductScanDiagnostics.format';
import { buildProductScanArtifactHref } from './ProductScanDiagnostics.resolve';
import type { ScanFailureArtifact } from './ProductScanDiagnostics.types';

function ArtifactMetadataBadges(props: {
  artifact: ScanFailureArtifact;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <span className='text-sm font-medium'>{resolveArtifactDisplayName(props.artifact)}</span>
      {props.artifact.kind !== null ? (
        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
          {formatLabel(props.artifact.kind)}
        </span>
      ) : null}
      {props.artifact.mimeType !== null ? (
        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
          {props.artifact.mimeType}
        </span>
      ) : null}
    </div>
  );
}

function ArtifactRow(props: {
  artifact: ScanFailureArtifact;
  scanId: string;
}): React.JSX.Element {
  const artifactHref = buildProductScanArtifactHref(props.scanId, props.artifact);
  return (
    <li className='space-y-2 rounded-md border border-border/40 bg-background/70 px-3 py-2'>
      <ArtifactMetadataBadges artifact={props.artifact} />
      <p className='break-all text-xs text-muted-foreground'>{props.artifact.path}</p>
      <div className='flex flex-wrap items-center gap-2'>
        {artifactHref !== null ? (
          <a
            href={artifactHref}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'
          >
            {resolveArtifactActionLabel(props.artifact)}
            <ExternalLink className='h-3.5 w-3.5' />
          </a>
        ) : null}
        <CopyButton
          value={props.artifact.path}
          variant='outline'
          size='sm'
          showText
          className='h-7 px-2 text-xs'
          ariaLabel={`Copy artifact path for ${props.artifact.name}`}
        />
      </div>
    </li>
  );
}

export function ProductScanFailureArtifactsSection(props: {
  artifacts: ScanFailureArtifact[];
  scanId: string;
}): React.JSX.Element | null {
  if (props.artifacts.length === 0) return null;
  return (
    <div className='space-y-2'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        Artifacts
      </p>
      <ul className='space-y-2'>
        {props.artifacts.map((artifact) => (
          <ArtifactRow
            key={`${artifact.name}-${artifact.path}`}
            artifact={artifact}
            scanId={props.scanId}
          />
        ))}
      </ul>
    </div>
  );
}
