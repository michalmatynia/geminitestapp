'use client';

import React from 'react';
import { useAiPathsSettingsPagePathActionsContext, useAiPathsSettingsPagePersistenceContext, useAiPathsSettingsPageWorkspaceContext } from '../AiPathsSettingsPageContext';
import { useGraphActions } from '@/features/ai/ai-paths/context';
import { GlobalKernelSettings } from './GlobalKernelSettings';
import { PathKernelSettings } from './PathKernelSettings';
import { useRuntimeKernelState } from './useRuntimeKernelState';
import { usePathRuntimeKernelState } from './usePathRuntimeKernelState';

export function AiPathsRuntimeKernelSettings(): React.JSX.Element {
  const { activePathId, pathConfigs, paths } = useAiPathsSettingsPagePathActionsContext();
  const { persistPathSettings } = useAiPathsSettingsPagePersistenceContext();
  const { toast: notify } = useAiPathsSettingsPageWorkspaceContext();
  const { setPathConfigs, setPaths } = useGraphActions();
  const activePath = activePathId ?? null;

  const globalState = useRuntimeKernelState(notify);
  const pathState = usePathRuntimeKernelState({
    activePath,
    pathConfigs,
    paths,
    setPaths,
    setPathConfigs,
    persistPathSettings,
    notify,
  });

  return (
    <>
      <GlobalKernelSettings
        loading={globalState.loading}
        saving={globalState.saving}
        draftNodeTypes={globalState.nodeTypesDraft}
        setDraftNodeTypes={globalState.setNodeTypesDraft}
        draftResolverIds={globalState.resolverIdsDraft}
        setDraftResolverIds={globalState.setDraftResolverIds}
        isDirty={globalState.isDirty}
        onSave={globalState.onSave}
      />
      <PathKernelSettings
        activePath={activePath}
        saving={pathState.saving}
        draftNodeTypes={pathState.nodeTypesDraft}
        setDraftNodeTypes={pathState.setNodeTypesDraft}
        draftResolverIds={pathState.resolverIdsDraft}
        setDraftResolverIds={pathState.setResolverIdsDraft}
        isDirty={pathState.isDirty}
        onSave={pathState.onSave}
      />
    </>
  );
}
