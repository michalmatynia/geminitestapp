import { ExternalLink } from 'lucide-react';
import React from 'react';

import { CopyButton } from '@/shared/ui/copy-button';

import {
  formatRuntimePostureBrowser,
  formatRuntimePostureIdentity,
  formatRuntimePostureProxy,
  formatRuntimePostureStorage,
  hasText,
} from './ProductScanDiagnostics.format';
import type { ProductScanEvaluationPolicySummary } from './ProductScanSteps.types';
import type { ScanDiagnostics, ScanRuntimePosture } from './ProductScanDiagnostics.types';

type DetailGridEntry = {
  label: string;
  content: string | null;
};

function SectionUrlBlock(props: {
  ariaLabel: string;
  copyLabel: string;
  label: string;
  linkLabel: string;
  url: string;
}): React.JSX.Element {
  return (
    <div className='space-y-1'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        {props.label}
      </p>
      <div className='flex flex-wrap items-center gap-2'>
        <a
          href={props.url}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'
        >
          {props.linkLabel}
          <ExternalLink className='h-3.5 w-3.5' />
        </a>
        <CopyButton
          value={props.url}
          variant='outline'
          size='sm'
          showText
          className='h-7 px-2 text-xs'
          ariaLabel={props.ariaLabel}
        />
      </div>
    </div>
  );
}

export function ProductScanDiagnosticLinks(props: {
  diagnostics: ScanDiagnostics;
}): React.JSX.Element {
  return (
    <>
      {props.diagnostics.latestStageUrl !== null ? (
        <SectionUrlBlock
          ariaLabel='Copy latest stage URL'
          copyLabel='Copy latest stage URL'
          label='Latest Stage URL'
          linkLabel='Open URL'
          url={props.diagnostics.latestStageUrl}
        />
      ) : null}
      {props.diagnostics.imageSearchPageUrl !== null ? (
        <SectionUrlBlock
          ariaLabel='Copy image search page URL'
          copyLabel='Copy image search page URL'
          label='Image Search Page URL'
          linkLabel='Open search page'
          url={props.diagnostics.imageSearchPageUrl}
        />
      ) : null}
    </>
  );
}

function DetailGrid(props: {
  entries: DetailGridEntry[];
}): React.JSX.Element {
  return (
    <div className='grid gap-2 sm:grid-cols-2'>
      {props.entries
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
  );
}

const buildRuntimePostureEntries = (
  runtimePosture: ScanRuntimePosture
): DetailGridEntry[] => [
  { label: 'Browser', content: formatRuntimePostureBrowser(runtimePosture) },
  { label: 'Identity', content: formatRuntimePostureIdentity(runtimePosture) },
  { label: 'Proxy', content: formatRuntimePostureProxy(runtimePosture) },
  { label: 'Sticky state', content: formatRuntimePostureStorage(runtimePosture) },
];

export function ProductScanRuntimePostureSection(props: {
  runtimePosture: ScanRuntimePosture | null;
}): React.JSX.Element | null {
  if (props.runtimePosture === null) return null;
  return (
    <div className='space-y-2'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        Runtime Posture
      </p>
      <DetailGrid entries={buildRuntimePostureEntries(props.runtimePosture)} />
    </div>
  );
}

const buildEvaluationPolicyEntries = (
  summary: ProductScanEvaluationPolicySummary
): DetailGridEntry[] => [
  { label: 'Execution', content: summary.executionLabel },
  { label: 'Model source', content: summary.modelSource },
  { label: 'Model', content: summary.modelLabel },
  { label: 'Threshold', content: summary.thresholdLabel },
  { label: 'Evaluation scope', content: summary.scopeLabel },
  { label: 'Similarity decision', content: summary.similarityDecisionLabel },
  { label: 'Language gate', content: summary.languageGateLabel },
  { label: 'Language detection', content: summary.languageDetectionLabel },
];

export function ProductScanEvaluationPolicySection(props: {
  evaluationPolicySummary: ProductScanEvaluationPolicySummary | null;
}): React.JSX.Element | null {
  if (props.evaluationPolicySummary === null) return null;
  return (
    <div className='space-y-2'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        AI Evaluator Policy
      </p>
      <DetailGrid entries={buildEvaluationPolicyEntries(props.evaluationPolicySummary)} />
    </div>
  );
}

export function ProductScanLogTailSection(props: {
  logTail: string[];
}): React.JSX.Element | null {
  if (props.logTail.length === 0) return null;
  return (
    <div className='space-y-2'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        Log Tail
      </p>
      <pre className='max-h-52 overflow-auto rounded-md border border-border/40 bg-background/70 px-3 py-2 text-[11px] text-muted-foreground'>
        {props.logTail.join('\n')}
      </pre>
    </div>
  );
}
