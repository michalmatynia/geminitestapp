'use client';

import React from 'react';

import {
  DragStateProvider,
  PageBuilderPageSkeleton,
  PageBuilderPolicyProvider,
  PageBuilderProvider,
} from '@/features/cms/public';

import { KangurCmsBuilderInner } from './KangurCmsBuilderInner';
import { KangurCmsBuilderRuntimeProvider } from './KangurCmsBuilderRuntimeContext';
import { useKangurCmsBuilderWorkspaceState } from './useKangurCmsBuilderWorkspaceState';
import {
  renderBuilderThemeSettingsProvider,
  resolveThemePreviewFallback,
} from './workspace-theme-preview';

export function KangurCmsBuilderWorkspace(): React.JSX.Element {
  const {
    activeScreenKey,
    draftProject,
    handleSave,
    handleSwitchScreen,
    initialState,
    isSaving,
    pageBuilderPolicy,
    savedProject,
    setThemePreviewMode,
    settingsReady,
    themePreviewFallbacks,
    themePreviewMode,
  } = useKangurCmsBuilderWorkspaceState();

  if (!settingsReady || !draftProject || !savedProject || !initialState) {
    return <PageBuilderPageSkeleton />;
  }

  return (
    <PageBuilderPolicyProvider value={pageBuilderPolicy}>
      <PageBuilderProvider key={activeScreenKey} initialState={initialState}>
        <DragStateProvider>
          {renderBuilderThemeSettingsProvider(
            themePreviewMode,
            resolveThemePreviewFallback(themePreviewMode, themePreviewFallbacks),
            <KangurCmsBuilderRuntimeProvider
              draftProject={draftProject}
              savedProject={savedProject}
              activeScreenKey={activeScreenKey}
              onSwitchScreen={handleSwitchScreen}
              onSave={handleSave}
              isSaving={isSaving}
              themePreviewMode={themePreviewMode}
              themePreviewFallbacks={themePreviewFallbacks}
              setThemePreviewMode={setThemePreviewMode}
            >
              <KangurCmsBuilderInner />
            </KangurCmsBuilderRuntimeProvider>
          )}
        </DragStateProvider>
      </PageBuilderProvider>
    </PageBuilderPolicyProvider>
  );
}
