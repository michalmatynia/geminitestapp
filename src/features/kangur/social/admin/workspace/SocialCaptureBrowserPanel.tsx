'use client';

import React from 'react';

import { useSocialCaptureBrowserState } from './hooks/useSocialCaptureBrowserState';
import { SocialCaptureBrowserProvider } from './SocialCaptureBrowserContext';
import { SocialCaptureBrowserTreePanel } from './SocialCaptureBrowserTreePanel';
import { SocialCaptureSectionSelector } from './SocialCaptureSectionSelector';

export function SocialCaptureBrowserPanel(): React.JSX.Element {
  const state = useSocialCaptureBrowserState();

  return (
    <SocialCaptureBrowserProvider state={state}>
      <div className='grid grid-cols-1 sm:grid-cols-[1fr_240px] gap-4 h-[420px] min-h-0'>
        <SocialCaptureBrowserTreePanel />
        <div className='border-l border-border/40 pl-4 overflow-y-auto'>
          <SocialCaptureSectionSelector />
        </div>
      </div>
    </SocialCaptureBrowserProvider>
  );
}
