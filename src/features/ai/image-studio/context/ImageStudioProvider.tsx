'use client';

import React from 'react';

import { GenerationProvider } from './GenerationContext';
import { MaskingProvider } from './MaskingContext';
import { ProjectsProvider } from './ProjectsContext';
import { PromptProvider } from './PromptContext';
import { SettingsProvider } from './SettingsContext';
import { SlotsProvider } from './SlotsContext';
import { UiProvider } from './UiContext';

export function ImageStudioProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <SettingsProvider>
      <UiProvider>
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
      </UiProvider>
    </SettingsProvider>
  );
}
