import React from 'react';

import {
  formatAmazonImageSearchProvider,
  formatLabel,
} from './ProductScanDiagnostics.format';
import type {
  RecordedDiagnosticClassification,
  ScanDiagnostics,
} from './ProductScanDiagnostics.types';

type ProductScanDiagnosticsBadgesProps = {
  diagnostics: ScanDiagnostics | null;
  recordedArtifactCount: number;
  recordedClassification: RecordedDiagnosticClassification | null;
  recordedDiagnosticsStatus: 'idle' | 'loading' | 'loaded' | 'error';
};

type DiagnosticBadgeTone = 'default' | 'warning' | 'info' | 'muted';

type DiagnosticBadgeItem = {
  content: React.ReactNode;
  key: string;
  tone?: DiagnosticBadgeTone;
};

function DiagnosticBadge(props: {
  children: React.ReactNode;
  tone?: DiagnosticBadgeTone;
}): React.JSX.Element {
  const toneClass = {
    default: 'border-border/60',
    info: 'border-sky-500/40 text-sky-300',
    muted: 'border-border/60 text-muted-foreground',
    warning: 'border-amber-500/40 text-amber-300',
  }[props.tone ?? 'default'];
  return (
    <span
      className={`inline-flex items-center rounded-md border bg-background/70 px-2.5 py-1 text-xs font-medium ${toneClass}`}
    >
      {props.children}
    </span>
  );
}

export function ProductScanDiagnosticsBadges(
  props: ProductScanDiagnosticsBadgesProps
): React.JSX.Element {
  const badges = buildDiagnosticBadges(props);
  return (
    <div className='flex flex-wrap gap-2'>
      {badges.map((badge) => (
        <DiagnosticBadge key={badge.key} tone={badge.tone}>
          {badge.content}
        </DiagnosticBadge>
      ))}
    </div>
  );
}

const buildDiagnosticBadges = (
  props: ProductScanDiagnosticsBadgesProps
): DiagnosticBadgeItem[] => [
  ...buildRuntimeDiagnosticBadges(props.diagnostics),
  ...buildRecordedDiagnosticBadges(props),
];

const buildRuntimeDiagnosticBadges = (
  diagnostics: ScanDiagnostics | null
): DiagnosticBadgeItem[] => {
  if (diagnostics === null) return [];
  return [
    buildTextBadge('run', diagnostics.runId, (value) => `Run ${value}`),
    buildTextBadge('status', diagnostics.runStatus, (value) => formatLabel(value)),
    buildTextBadge('provider', diagnostics.imageSearchProvider, (value) =>
      formatAmazonImageSearchProvider(value)
    ),
    buildTextBadge('stage', diagnostics.latestStage, (value) => `Stage: ${formatLabel(value)}`, 'warning'),
    buildArtifactBadge(diagnostics.failureArtifacts.length),
  ].filter((badge): badge is DiagnosticBadgeItem => badge !== null);
};

const buildRecordedDiagnosticBadges = (
  props: ProductScanDiagnosticsBadgesProps
): DiagnosticBadgeItem[] => [
  buildRecordedSignatureBadge(props.recordedClassification),
  buildRecordedArtifactBadge(props.recordedArtifactCount),
  buildRecordedLoadingBadge(props),
].filter((badge): badge is DiagnosticBadgeItem => badge !== null);

const buildTextBadge = (
  key: string,
  value: string | null,
  buildContent: (value: string) => React.ReactNode,
  tone?: DiagnosticBadgeTone
): DiagnosticBadgeItem | null => {
  if (value === null) return null;
  const content = buildContent(value);
  if (content === null) return null;
  return { content, key, tone };
};

const buildArtifactBadge = (artifactCount: number): DiagnosticBadgeItem | null => {
  if (artifactCount <= 0) return null;
  return {
    content: `${artifactCount} artifact${artifactCount === 1 ? '' : 's'}`,
    key: 'artifacts',
  };
};

const buildRecordedSignatureBadge = (
  classification: RecordedDiagnosticClassification | null
): DiagnosticBadgeItem | null => {
  if (classification === null) return null;
  return {
    content: `Signature: ${formatLabel(classification.kind)}`,
    key: 'recorded-signature',
    tone: 'info',
  };
};

const buildRecordedArtifactBadge = (
  artifactCount: number
): DiagnosticBadgeItem | null => {
  if (artifactCount <= 0) return null;
  return {
    content: `${artifactCount} recorded artifact${artifactCount === 1 ? '' : 's'}`,
    key: 'recorded-artifacts',
  };
};

const buildRecordedLoadingBadge = (
  props: ProductScanDiagnosticsBadgesProps
): DiagnosticBadgeItem | null => {
  if (props.recordedDiagnosticsStatus !== 'loading' || props.diagnostics !== null) return null;
  return {
    content: 'Loading recorded diagnostics',
    key: 'recorded-loading',
    tone: 'muted',
  };
};
