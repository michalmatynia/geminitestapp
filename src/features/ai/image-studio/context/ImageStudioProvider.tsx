'use client';

import React from 'react';

import { GenerationProvider } from './GenerationContext';
import { MaskingProvider } from './MaskingContext';
import { ProjectsProvider } from './ProjectsContext';
import { PromptProvider } from './PromptContext';
import { SettingsProvider } from './SettingsContext';
import { SlotsProvider } from './SlotsContext';
import { UiProvider } from './UiContext';
import { VersionGraphProvider } from './VersionGraphContext';

export function ImageStudioProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <SettingsProvider>
      <UiProvider>
        <ProjectsProvider>
          <SlotsProvider>
            <VersionGraphProvider>
              <MaskingProvider>
                <PromptProvider>
                  <GenerationProvider>
                    {children}
                  </GenerationProvider>
                </PromptProvider>
              </MaskingProvider>
            </VersionGraphProvider>
          </SlotsProvider>
        </ProjectsProvider>
      </UiProvider>
    </SettingsProvider>
  );
}
