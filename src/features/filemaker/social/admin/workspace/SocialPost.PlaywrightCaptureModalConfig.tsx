'use client';

import React from 'react';

import { FormField, Input, SelectSimple, Textarea } from '@/shared/ui';

import type {
  SocialPostPlaywrightCaptureContext,
  SocialPostPlaywrightCaptureModalState,
} from './SocialPost.PlaywrightCaptureModal.runtime';

export function SocialPostPlaywrightConfigFields({
  context,
  state,
}: {
  context: SocialPostPlaywrightCaptureContext;
  state: SocialPostPlaywrightCaptureModalState;
}): React.JSX.Element {
  return (
    <div className='grid gap-3 md:grid-cols-2'>
      <FormField
        label='Base URL'
        description='The modal routes are resolved against this URL unless you provide full absolute URLs.'
      >
        <Input
          type='url'
          value={context.programmableCaptureBaseUrl}
          onChange={(event) => context.setProgrammableCaptureBaseUrl(event.target.value)}
          placeholder='https://example.com'
          aria-label='Programmable capture base URL'
          disabled={state.isConfigEditingLocked}
          title={state.configLockTitle}
        />
      </FormField>

      <FormField
        label='Playwright persona'
        description='Use an existing persona to control browser behavior and fidelity.'
      >
        <SelectSimple
          value={context.programmableCapturePersonaId}
          onValueChange={context.setProgrammableCapturePersonaId}
          options={state.personaOptions}
          placeholder='Default runtime persona'
          ariaLabel='Playwright persona'
          disabled={state.isConfigEditingLocked}
          title={state.configLockTitle}
        />
      </FormField>
    </div>
  );
}

export function SocialPostPlaywrightScriptField({
  context,
  state,
}: {
  context: SocialPostPlaywrightCaptureContext;
  state: SocialPostPlaywrightCaptureModalState;
}): React.JSX.Element {
  return (
    <FormField
      label='Playwright script'
      description='This script is fully editable and runs in the existing Playwright node runtime.'
    >
      <Textarea
        value={context.programmableCaptureScript}
        onChange={(event) => context.setProgrammableCaptureScript(event.target.value)}
        rows={18}
        className='font-mono text-xs'
        aria-label='Programmable Playwright capture script'
        disabled={state.isConfigEditingLocked}
        title={state.configLockTitle}
      />
    </FormField>
  );
}
