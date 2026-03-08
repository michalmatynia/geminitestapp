'use client';

import React from 'react';

import { AppErrorBoundary } from '@/shared/ui/AppErrorBoundary';

import { AiPathsProvider } from '../context';
import { AiPathsSettingsPageProvider } from './ai-paths-settings/AiPathsSettingsPageContext';
import { AiPathsSettingsView } from './ai-paths-settings/AiPathsSettingsView';
import { useAiPathsSettingsState } from './ai-paths-settings/useAiPathsSettingsState';
import { useAiPathsSettingsPageValue } from './ai-paths-settings/useAiPathsSettingsPageValue';

export type AiPathsSettingsProps = {
  activeTab: 'canvas' | 'paths' | 'docs';
  renderActions?: ((actions: React.ReactNode) => React.ReactNode) | undefined;
  onTabChange?: ((tab: 'canvas' | 'paths' | 'docs') => void) | undefined;
  isFocusMode?: boolean | undefined;
  onFocusModeChange?: ((next: boolean) => void) | undefined;
};

export function AiPathsSettings(props: AiPathsSettingsProps): React.JSX.Element {
  const { activeTab, renderActions, onTabChange, isFocusMode, onFocusModeChange } = props;

  return (
    <AppErrorBoundary source='AiPathsSettings'>
      <AiPathsProvider>
        <AiPathsSettingsInnerOrchestrator
          activeTab={activeTab}
          renderActions={renderActions}
          onTabChange={onTabChange}
          isFocusMode={isFocusMode}
          onFocusModeChange={onFocusModeChange}
        />
      </AiPathsProvider>
    </AppErrorBoundary>
  );
}

function AiPathsSettingsInnerOrchestrator(props: AiPathsSettingsProps): React.JSX.Element {
  const state = useAiPathsSettingsState({ activeTab: props.activeTab });
  const pageContextValue = useAiPathsSettingsPageValue(props, state);
  const ConfirmationModal = state.ConfirmationModal;

  return (
    <AiPathsSettingsPageProvider value={pageContextValue}>
      <AiPathsSettingsView />
      <ConfirmationModal />
    </AiPathsSettingsPageProvider>
  );
}
