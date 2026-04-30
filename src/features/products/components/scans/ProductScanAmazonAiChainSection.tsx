import React from 'react';

import {
  formatAmazonAiStage,
  formatAmazonAiStageLanguage,
  formatAmazonAiStageStatus,
  formatAmazonAiThreshold,
  formatAmazonImageSearchProvider,
  formatLabel,
  formatTimestamp,
  hasText,
} from './ProductScanDiagnostics.format';
import type { AmazonAiStageEvidence } from './ProductScanDiagnostics.types';

function AmazonAiStageBadges(props: {
  stage: AmazonAiStageEvidence;
}): React.JSX.Element {
  const stageStatus = formatAmazonAiStageStatus(props.stage.status);
  const threshold = formatAmazonAiThreshold(props.stage.threshold);
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <span className='text-sm font-medium'>{formatAmazonAiStage(props.stage.stage)}</span>
      {stageStatus !== null ? <AmazonAiBadge>{stageStatus}</AmazonAiBadge> : null}
      {props.stage.model !== null ? <AmazonAiBadge>{props.stage.model}</AmazonAiBadge> : null}
      {threshold !== null ? <AmazonAiBadge>Threshold {threshold}</AmazonAiBadge> : null}
      {props.stage.candidateRankBefore !== null ? (
        <AmazonAiBadge>Rank before #{props.stage.candidateRankBefore}</AmazonAiBadge>
      ) : null}
      {props.stage.candidateRankAfter !== null ? (
        <AmazonAiBadge>Rank after #{props.stage.candidateRankAfter}</AmazonAiBadge>
      ) : null}
    </div>
  );
}

function AmazonAiBadge(props: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
      {props.children}
    </span>
  );
}

const buildStageDetails = (
  stage: AmazonAiStageEvidence
): Array<{ label: string; value: string | null }> => [
  { label: 'Recommended action', value: formatLabel(stage.recommendedAction) },
  { label: 'Rejection category', value: formatLabel(stage.rejectionCategory) },
  { label: 'Language', value: formatAmazonAiStageLanguage(stage.pageLanguage) },
  {
    label: 'Language accepted',
    value: typeof stage.languageAccepted === 'boolean' ? String(stage.languageAccepted) : null,
  },
  { label: 'Image search provider', value: formatAmazonImageSearchProvider(stage.provider) },
  { label: 'Evaluated at', value: formatTimestamp(stage.evaluatedAt) },
];

function AmazonAiStageDetails(props: {
  stage: AmazonAiStageEvidence;
}): React.JSX.Element {
  return (
    <div className='grid gap-2 sm:grid-cols-2'>
      {buildStageDetails(props.stage)
        .filter((entry): entry is { label: string; value: string } => hasText(entry.value))
        .map((entry) => (
          <div
            key={`${props.stage.stage}-${entry.label}`}
            className='space-y-1 rounded-md border border-border/40 bg-muted/20 px-3 py-2'
          >
            <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
              {entry.label}
            </p>
            <p className='break-words text-sm'>{entry.value}</p>
          </div>
        ))}
    </div>
  );
}

function AmazonAiTopReasons(props: {
  stage: AmazonAiStageEvidence;
}): React.JSX.Element | null {
  if (props.stage.topReasons.length === 0) return null;
  return (
    <div className='space-y-1'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        Top reasons
      </p>
      <ul className='space-y-1 text-sm text-muted-foreground'>
        {props.stage.topReasons.map((reason) => (
          <li key={`${props.stage.stage}-${reason}`}>{reason}</li>
        ))}
      </ul>
    </div>
  );
}

function AmazonAiStageRow(props: {
  index: number;
  stage: AmazonAiStageEvidence;
}): React.JSX.Element {
  return (
    <li className='space-y-2 rounded-md border border-border/40 bg-background/70 px-3 py-2'>
      <AmazonAiStageBadges stage={props.stage} />
      <AmazonAiStageDetails stage={props.stage} />
      <AmazonAiTopReasons stage={props.stage} />
      <span className='sr-only'>AI stage {props.index + 1}</span>
    </li>
  );
}

export function ProductScanAmazonAiChainSection(props: {
  stages: AmazonAiStageEvidence[];
}): React.JSX.Element | null {
  if (props.stages.length === 0) return null;
  return (
    <div className='space-y-2'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        Amazon AI Chain
      </p>
      <ul className='space-y-2'>
        {props.stages.map((stage, index) => (
          <AmazonAiStageRow
            key={`${stage.stage}-${stage.evaluatedAt ?? 'na'}-${index}`}
            stage={stage}
            index={index}
          />
        ))}
      </ul>
    </div>
  );
}
