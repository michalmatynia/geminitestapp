'use client';

import React from 'react';

import { LoadingState } from '@/shared/ui';
import { getRuntimeString, hasText } from './SocialPost.VisualsRuntime';
import type {
  SocialVisualAnalysisModalContext,
  VisualAnalysisModalMetadata,
} from './SocialPost.VisualAnalysisModalState';

type VisualAnalysisResult = NonNullable<SocialVisualAnalysisModalContext['visualAnalysisResult']>;

const hasResult = (context: SocialVisualAnalysisModalContext): boolean =>
  context.visualAnalysisResult !== null;

const effectiveErrorMessage = (
  context: SocialVisualAnalysisModalContext,
  metadata: VisualAnalysisModalMetadata
): string => {
  const explicitError = getRuntimeString(context.visualAnalysisErrorMessage);
  if (explicitError.length > 0) return explicitError;
  return metadata.errorMessage;
};

const metadataPanelClass = (metadata: VisualAnalysisModalMetadata): string => {
  if (metadata.hasFailedStatus) {
    return 'rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive';
  }
  return 'rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground';
};

const guidanceText = (
  context: SocialVisualAnalysisModalContext,
  metadata: VisualAnalysisModalMetadata
): string => {
  if (context.isSavedVisualAnalysisStale && context.hasSavedVisualAnalysis) {
    return 'Rerun image analysis first. After reviewing the refreshed visual description, use Generate post with analysis to create the published update in the next AI pass.';
  }
  if (metadata.hasFailedStatus) {
    return 'Rerun image analysis first. The latest saved run failed, so there is no usable visual description to generate from yet.';
  }
  return 'Run image analysis first. After reviewing the visual description, use Generate post with analysis to create the published update in the next AI pass.';
};

function VisualAnalysisPendingLoader({
  context,
}: {
  context: SocialVisualAnalysisModalContext;
}): React.JSX.Element | null {
  if (context.visualAnalysisPending !== true) return null;
  return (
    <LoadingState
      message='Running image analysis on the selected visuals...'
      size='sm'
      className='rounded-xl border border-border/60 bg-background/40 py-6'
    />
  );
}

function VisualAnalysisErrorAlert({
  context,
  metadata,
}: {
  context: SocialVisualAnalysisModalContext;
  metadata: VisualAnalysisModalMetadata;
}): React.JSX.Element | null {
  const message = effectiveErrorMessage(context, metadata);
  if (message.length === 0) return null;
  return (
    <div className='rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
      {message}
    </div>
  );
}

function VisualAnalysisMetadataPanel({
  metadata,
}: {
  metadata: VisualAnalysisModalMetadata;
}): React.JSX.Element | null {
  if (!metadata.hasMetadata) return null;
  return (
    <div className={metadataPanelClass(metadata)}>
      {hasText(metadata.statusLabel) ? <div>Status: {metadata.statusLabel}</div> : null}
      {metadata.updatedAt !== null ? (
        <div>Analyzed: {new Date(metadata.updatedAt).toLocaleString()}</div>
      ) : null}
      {metadata.modelId.length > 0 ? <div>Model: {metadata.modelId}</div> : null}
      {metadata.jobId.length > 0 ? <div>Queue job: {metadata.jobId}</div> : null}
      {metadata.hasFailedStatus && metadata.savedError.length > 0 ? (
        <div>Failure: {metadata.savedError}</div>
      ) : null}
    </div>
  );
}

function StaleAnalysisWarning({
  context,
}: {
  context: SocialVisualAnalysisModalContext;
}): React.JSX.Element | null {
  if (!context.isSavedVisualAnalysisStale || !context.hasSavedVisualAnalysis || hasResult(context)) {
    return null;
  }
  return (
    <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200'>
      Saved image analysis exists for this draft, but the selected visuals changed. Rerun image analysis to refresh it before generating copy.
    </div>
  );
}

function FailedAnalysisWarning({
  context,
  metadata,
}: {
  context: SocialVisualAnalysisModalContext;
  metadata: VisualAnalysisModalMetadata;
}): React.JSX.Element | null {
  if (!metadata.hasFailedStatus || hasResult(context) || context.visualAnalysisPending === true) return null;
  return (
    <div className='rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
      The latest saved image-analysis run failed. Review the status above, then rerun image analysis before generating copy from visuals.
    </div>
  );
}

function ResultSummary({ result }: { result: VisualAnalysisResult }): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <div className='text-sm font-semibold text-foreground'>Analysis summary</div>
      <div className='text-sm text-muted-foreground'>
        {result.summary.length > 0 ? result.summary : 'No summary returned.'}
      </div>
    </div>
  );
}

function ResultHighlights({ result }: { result: VisualAnalysisResult }): React.JSX.Element {
  if (result.highlights.length === 0) {
    return (
      <div className='space-y-2'>
        <div className='text-sm font-semibold text-foreground'>Highlights</div>
        <div className='text-sm text-muted-foreground'>No highlight bullets returned.</div>
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      <div className='text-sm font-semibold text-foreground'>Highlights</div>
      <ul className='space-y-1 text-sm text-muted-foreground'>
        {result.highlights.map((highlight) => (
          <li key={highlight}>- {highlight}</li>
        ))}
      </ul>
    </div>
  );
}

function VisualAnalysisResultPanel({
  context,
}: {
  context: SocialVisualAnalysisModalContext;
}): React.JSX.Element | null {
  const result = context.visualAnalysisResult;
  if (result === null) return null;
  return (
    <div className='space-y-4 rounded-xl border border-border/60 bg-background/40 p-4'>
      <ResultSummary result={result} />
      <ResultHighlights result={result} />
    </div>
  );
}

function VisualAnalysisGuidance({
  context,
  metadata,
}: {
  context: SocialVisualAnalysisModalContext;
  metadata: VisualAnalysisModalMetadata;
}): React.JSX.Element | null {
  if (hasResult(context)) return null;
  return (
    <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground'>
      {guidanceText(context, metadata)}
    </div>
  );
}

export function SocialVisualAnalysisModalResult({
  context,
  metadata,
}: {
  context: SocialVisualAnalysisModalContext;
  metadata: VisualAnalysisModalMetadata;
}): React.JSX.Element {
  return (
    <>
      <VisualAnalysisPendingLoader context={context} />
      <VisualAnalysisErrorAlert context={context} metadata={metadata} />
      <VisualAnalysisMetadataPanel metadata={metadata} />
      <StaleAnalysisWarning context={context} />
      <FailedAnalysisWarning context={context} metadata={metadata} />
      <VisualAnalysisResultPanel context={context} />
      <VisualAnalysisGuidance context={context} metadata={metadata} />
    </>
  );
}
