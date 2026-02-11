'use client';

import React from 'react';

import { SettingsProvider } from './SettingsContext';
import { ProjectsProvider } from './ProjectsContext';
import { SlotsProvider } from './SlotsContext';
import { MaskingProvider } from './MaskingContext';
import { PromptProvider } from './PromptContext';
import { GenerationProvider } from './GenerationContext';

export function ImageStudioProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <SettingsProvider>
      <ProjectsProvider>
        <SlotsProvider>
          <MaskingProvider>
            <PromptProvider>
              <GenerationProvider>
                {children}
              </GenerationProvider>
            </PromptProvider>
          </MaskingProvider>
        </SlotsProvider>
      </ProjectsProvider>
    </SettingsProvider>
  );
}
