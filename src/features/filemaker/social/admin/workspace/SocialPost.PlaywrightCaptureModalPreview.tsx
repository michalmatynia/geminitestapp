'use client';

import React from 'react';

import type {
  SocialPostPlaywrightCaptureContext,
  SocialPostPlaywrightCaptureModalState,
} from './SocialPost.PlaywrightCaptureModal.runtime';

export function SocialPostPlaywrightRequestPreview({
  context,
  state,
}: {
  context: SocialPostPlaywrightCaptureContext;
  state: SocialPostPlaywrightCaptureModalState;
}): React.JSX.Element {
  return (
    <div className='space-y-2 rounded-xl border border-border/60 bg-background/40 p-4'>
      <div className='text-sm font-semibold text-foreground'>Runtime request preview</div>
      <div className='text-xs text-muted-foreground'>
        This mirrors the request sent to the Playwright runtime. Inside the script, use <code>input.appearanceMode</code> and <code>input.captures</code>.
      </div>
      <div className='grid gap-2 text-xs text-muted-foreground md:grid-cols-2'>
        <div>
          <span className='font-medium text-foreground'>Appearance mode:</span>{' '}
          {context.captureAppearanceMode}
        </div>
        <div>
          <span className='font-medium text-foreground'>Persona:</span>{' '}
          {state.selectedPersonaLabel}
        </div>
      </div>
      <pre className='overflow-x-auto rounded-lg border border-border/50 bg-background px-3 py-2 text-[11px] text-muted-foreground'>
        {JSON.stringify(state.runtimeRequestPreview, null, 2)}
      </pre>
    </div>
  );
}
