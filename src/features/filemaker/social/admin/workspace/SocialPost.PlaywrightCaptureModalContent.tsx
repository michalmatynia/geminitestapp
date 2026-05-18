'use client';

import React from 'react';

import { SocialCaptureBatchHistory } from './SocialCaptureBatchHistory';
import { SocialPostPlaywrightConfigFields, SocialPostPlaywrightScriptField } from './SocialPost.PlaywrightCaptureModalConfig';
import {
  SocialPostPlaywrightFeedback,
  SocialPostPlaywrightFooterAction,
} from './SocialPost.PlaywrightCaptureModalFeedback';
import { SocialPostPlaywrightRequestPreview } from './SocialPost.PlaywrightCaptureModalPreview';
import { SocialPostPlaywrightCaptureRoutes } from './SocialPost.PlaywrightCaptureModalRoutes';
import {
  SocialPostPlaywrightCaptureAlerts,
  SocialPostPlaywrightCaptureProgress,
  SocialPostPlaywrightPersonaAlerts,
  SocialPostPlaywrightRuntimeJobs,
} from './SocialPost.PlaywrightCaptureModalStatus';
import type {
  SocialPostPlaywrightCaptureContext,
  SocialPostPlaywrightCaptureModalState,
} from './SocialPost.PlaywrightCaptureModal.runtime';

export function SocialPostPlaywrightCaptureModalContent({
  context,
  personasError,
  personasLoading,
  state,
}: {
  context: SocialPostPlaywrightCaptureContext;
  personasError: unknown;
  personasLoading: boolean;
  state: SocialPostPlaywrightCaptureModalState;
}): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <SocialPostPlaywrightConfigFields context={context} state={state} />
      <SocialPostPlaywrightPersonaAlerts
        personasError={personasError}
        personasLoading={personasLoading}
      />
      <SocialPostPlaywrightRuntimeJobs context={context} state={state} />
      <SocialPostPlaywrightCaptureAlerts context={context} state={state} />
      <SocialPostPlaywrightCaptureProgress state={state} />
      <SocialPostPlaywrightCaptureRoutes context={context} state={state} />
      <SocialPostPlaywrightScriptField context={context} state={state} />
      <SocialPostPlaywrightRequestPreview context={context} state={state} />
      <SocialPostPlaywrightFooterAction context={context} state={state} />
      <SocialPostPlaywrightFeedback context={context} state={state} />
      <SocialPostPlaywrightHistory context={context} state={state} />
    </div>
  );
}

function SocialPostPlaywrightHistory({
  context,
  state,
}: {
  context: SocialPostPlaywrightCaptureContext;
  state: SocialPostPlaywrightCaptureModalState;
}): React.JSX.Element {
  return (
    <SocialCaptureBatchHistory
      config={{
        title: 'Recent programmable runs',
        description: 'Durable programmable capture history with retry for failed routes.',
        emptyMessage: 'No recent programmable capture runs yet.',
        retryKind: 'programmable',
        retryDisabled: state.isConfigEditingLocked,
        retryTitle: state.configLockTitle,
      }}
      jobs={state.recentProgrammableCaptureJobs}
      routes={context.programmableCaptureRoutes}
      actions={{
        onRetryFailed: (job) => {
          void context.handleRetryFailedProgrammableCaptureJob(job);
        },
      }}
    />
  );
}
