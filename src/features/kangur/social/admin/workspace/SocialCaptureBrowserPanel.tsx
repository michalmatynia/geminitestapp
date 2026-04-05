'use client';

import React from 'react';

import { useSocialCaptureBrowserState } from './hooks/useSocialCaptureBrowserState';
import { SocialCaptureBrowserTreePanel } from './SocialCaptureBrowserTreePanel';
import { SocialCaptureSectionSelector } from './SocialCaptureSectionSelector';

export function SocialCaptureBrowserPanel(): React.JSX.Element {
  const state = useSocialCaptureBrowserState();

  return (
    <div className='grid grid-cols-1 sm:grid-cols-[1fr_240px] gap-4 h-[420px] min-h-0'>
      <SocialCaptureBrowserTreePanel state={state} />
      <div className='border-l border-border/40 pl-4 overflow-y-auto'>
        <SocialCaptureSectionSelector
          slideKey={state.selectedSlideKey}
          selectedSections={state.selectedSlideSections}
          disabled={state.selectedSlideDisabled}
          isSaving={state.isSaving}
          onToggleSection={state.toggleSection}
          onToggleDisabled={state.toggleSlideDisabled}
        />
      </div>
    </div>
  );
}
