'use client';

import React from 'react';

import { AppErrorBoundary } from '@/shared/ui/AppErrorBoundary';

import { AiPathsProvider } from '../context';
import { AiPathsSettingsOrchestratorProvider } from './ai-paths-settings/AiPathsSettingsOrchestratorContext';
import { AiPathsSettingsPageProvider } from './ai-paths-settings/AiPathsSettingsPageContext';
import { AiPathsSettingsView } from './ai-paths-settings/AiPathsSettingsView';
import { useAiPathsSettingsState } from './ai-paths-settings/useAiPathsSettingsState';
import { useAiPathsSettingsPageValue } from './ai-paths-settings/useAiPathsSettingsPageValue';
import { AiPathsStateBridger } from './ai-paths-settings/AiPathsStateBridger';

export type AiPathsSettingsProps = {
  activeTab: 'canvas' | 'paths' | 'docs';
  renderActions?: ((actions: React.ReactNode) => React.ReactNode) | undefined;
  onTabChange?: ((tab: 'canvas' | 'paths' | 'docs') => void) | undefined;
  isFocusMode?: boolean | undefined;
  onFocusModeChange?: ((next: boolean) => void) | undefined;
};

export function AiPathsSettings(props: AiPathsSettingsProps): React.JSX.Element {
  return (
    <AppErrorBoundary source='AiPathsSettings'>
      <AiPathsProvider>
        <AiPathsSettingsInnerOrchestrator {...props} />
      </AiPathsProvider>
    </AppErrorBoundary>
  );
}

function AiPathsSettingsInnerOrchestrator(props: AiPathsSettingsProps): React.JSX.Element {
  const state = useAiPathsSettingsState({ activeTab: props.activeTab });
  const pageContextValue = useAiPathsSettingsPageValue(props, state);

  return (
    <AiPathsSettingsPageProvider value={pageContextValue}>
      <AiPathsSettingsOrchestratorProvider value={state}>
        <AiPathsStateBridger state={state} />
        <AiPathsSettingsView />
      </AiPathsSettingsOrchestratorProvider>
    </AiPathsSettingsPageProvider>
  );
}
