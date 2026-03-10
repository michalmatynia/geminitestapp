'use client';

import React from 'react';

import { useRegisterContextRegistryPageSource } from '@/features/ai/ai-context-registry/context/page-context';
import { AppErrorBoundary } from '@/shared/ui/AppErrorBoundary';

import { AiPathsProvider } from '../context';
import { buildAiPathsWorkspaceContextBundle } from '../context-registry/workspace';
import { AiPathsSettingsPageProvider } from './ai-paths-settings/AiPathsSettingsPageContext';
import { AiPathsSettingsView } from './ai-paths-settings/AiPathsSettingsView';
import { useAiPathsSettingsPageValue } from './ai-paths-settings/useAiPathsSettingsPageValue';
import { useAiPathsSettingsState } from './ai-paths-settings/useAiPathsSettingsState';

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
  const registrySource = React.useMemo(
    () => ({
      label: 'AI Paths workspace state',
      resolved: buildAiPathsWorkspaceContextBundle({
        activeTab: props.activeTab,
        activePathId: state.activePathId,
        pathName: state.pathName,
        pathDescription: state.pathDescription,
        paths: state.paths,
        nodes: state.nodes,
        edges: state.edges,
        selectedNodeId: state.selectedNodeId,
        selectedNode: state.selectedNode,
        activeTrigger: state.activeTrigger,
        executionMode: state.executionMode,
        runMode: state.runMode,
        strictFlowMode: state.strictFlowMode,
        blockedRunPolicy: state.blockedRunPolicy,
        aiPathsValidation: state.aiPathsValidation,
        historyRetentionPasses: state.historyRetentionPasses,
        runtimeState: state.runtimeState,
        runtimeRunStatus: state.runtimeRunStatus,
        runtimeEvents: state.runtimeEvents,
        isPathLocked: state.isPathLocked,
        isPathActive: state.isPathActive,
        sendingToAi: state.sendingToAi,
        saving: state.saving,
        lastRunAt: state.lastRunAt,
        lastError: state.lastError,
        parserSamples: state.parserSamples,
        updaterSamples: state.updaterSamples,
      }),
    }),
    [
      props.activeTab,
      state.activePathId,
      state.activeTrigger,
      state.aiPathsValidation,
      state.blockedRunPolicy,
      state.edges,
      state.executionMode,
      state.historyRetentionPasses,
      state.isPathActive,
      state.isPathLocked,
      state.lastError,
      state.lastRunAt,
      state.nodes,
      state.parserSamples,
      state.pathDescription,
      state.pathName,
      state.paths,
      state.runMode,
      state.runtimeEvents,
      state.runtimeRunStatus,
      state.runtimeState,
      state.saving,
      state.selectedNode,
      state.selectedNodeId,
      state.sendingToAi,
      state.strictFlowMode,
      state.updaterSamples,
    ]
  );

  useRegisterContextRegistryPageSource('ai-paths-workspace-state', registrySource);

  return (
    <AiPathsSettingsPageProvider value={pageContextValue}>
      <AiPathsSettingsView />
      <ConfirmationModal />
    </AiPathsSettingsPageProvider>
  );
}
