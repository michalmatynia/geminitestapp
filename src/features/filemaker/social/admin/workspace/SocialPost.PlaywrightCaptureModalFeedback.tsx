'use client';

import React from 'react';

import { Button, LoadingState } from '@/shared/ui';

import type {
  SocialPostPlaywrightCaptureContext,
  SocialPostPlaywrightCaptureModalState,
} from './SocialPost.PlaywrightCaptureModal.runtime';

export function SocialPostPlaywrightFooterAction({
  context,
  state,
}: {
  context: SocialPostPlaywrightCaptureContext;
  state: SocialPostPlaywrightCaptureModalState;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap gap-2'>
      <Button
        type='button'
        variant='secondary'
        size='sm'
        onClick={() => {
          void context.handleRunProgrammablePlaywrightCaptureAndPipeline();
        }}
        disabled={!state.canCaptureAndRunPipeline}
        title={state.captureAndRunPipelineTitle}
      >
        {state.captureAndRunPipelineText}
      </Button>
    </div>
  );
}

export function SocialPostPlaywrightFeedback({
  context,
  state,
}: {
  context: SocialPostPlaywrightCaptureContext;
  state: SocialPostPlaywrightCaptureModalState;
}): React.JSX.Element {
  return (
    <>
      {context.programmableCapturePending ? (
        <LoadingState
          message='Running programmable Playwright capture...'
          size='sm'
          className='rounded-xl border border-border/60 bg-background/40 py-4'
        />
      ) : null}
      {context.programmableCaptureMessage !== null ? (
        <div className='rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-200'>
          {context.programmableCaptureMessage}
        </div>
      ) : null}
      {context.programmableCaptureErrorMessage !== null ? (
        <div className='rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
          {context.programmableCaptureErrorMessage}
        </div>
      ) : null}
      {state.programmableCapturePrimaryIssueSummary !== null ? (
        <div className='rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
          Last failed target: {state.programmableCapturePrimaryIssueSummary}
        </div>
      ) : null}
      <SocialPostPlaywrightFailureSummary state={state} />
    </>
  );
}

function SocialPostPlaywrightFailureSummary({
  state,
}: {
  state: SocialPostPlaywrightCaptureModalState;
}): React.JSX.Element | null {
  if (state.programmableCaptureFailureSummary === null) return null;
  if (!shouldShowFailureSummary(state)) return null;

  return (
    <div className='rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
      Failed targets: {state.programmableCaptureFailureSummary}
    </div>
  );
}

function shouldShowFailureSummary(state: SocialPostPlaywrightCaptureModalState): boolean {
  if (state.programmableCaptureFailureTotal === 0) return false;
  if (state.programmableCapturePrimaryIssueSummary === null) return true;
  return state.programmableCaptureFailureTotal > 1;
}
