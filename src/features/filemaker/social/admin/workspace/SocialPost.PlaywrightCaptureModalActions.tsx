'use client';

import React from 'react';

import { Button } from '@/shared/ui';

import type {
  SocialPostPlaywrightCaptureContext,
  SocialPostPlaywrightCaptureModalState,
} from './SocialPost.PlaywrightCaptureModal.runtime';

export function SocialPostPlaywrightCaptureModalActions({
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
        variant='outline'
        size='sm'
        onClick={context.handleAddProgrammableCaptureRoute}
        disabled={state.isConfigEditingLocked}
        title={state.configLockTitle}
      >
        Add route
      </Button>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={context.handleSeedProgrammableCaptureRoutesFromPresets}
        disabled={state.isConfigEditingLocked}
        title={state.configLockTitle}
      >
        Seed from presets
      </Button>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        onClick={context.handleResetProgrammableCaptureScript}
        disabled={state.isConfigEditingLocked}
        title={state.configLockTitle}
      >
        Reset script
      </Button>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        onClick={() => {
          void context.handleSaveProgrammableCaptureDefaults();
        }}
        disabled={state.isConfigEditingLocked}
        title={state.configLockTitle}
      >
        Save as defaults
      </Button>
    </div>
  );
}
