'use client';

import React from 'react';
import {
  evaluateDataContractPreflight,
  evaluateAiPathsValidationPreflight,
  normalizeAiPathsValidationConfig,
  runsApi,
} from '../../lib';
import { buildSwitchPathOptions, sortPathMetas } from './ai-paths-settings-view-utils';
import { useAiPathsDocsTooltips } from '@/features/ai/ai-paths/hooks/useAiPathsDocsTooltips';
import type { AiPathsSettingsPageContextValue } from './AiPathsSettingsPageContext';
import type { AiPathsSettingsProps } from '../AiPathsSettings';
import type { UseAiPathsSettingsStateReturn } from './useAiPathsSettingsState';

export function useAiPathsSettingsPageValue(
  props: AiPathsSettingsProps,
  state: UseAiPathsSettingsStateReturn
): AiPathsSettingsPageContextValue {
  const [pathSettingsModalOpen, setPathSettingsModalOpen] = React.useState(false);
  const [simulationModalOpen, setSimulationModalOpen] = React.useState(false);
  const [selectionScopeMode, setSelectionScopeMode] = React.useState<'portion' | 'wiring'>(
    'portion'
  );
  const [, setDataContractInspectorNodeId] = React.useState<string | null>(null);
  const [isPathNameEditing, setIsPathNameEditing] = React.useState(false);
  const [renameDraft, setRenameDraft] = React.useState('');
  const { docsTooltipsEnabled, setDocsTooltipsEnabled } = useAiPathsDocsTooltips();

  const normalizedAiPathsValidation = React.useMemo(
    () => normalizeAiPathsValidationConfig(state.aiPathsValidation),
    [state.aiPathsValidation]
  );
  const effectiveAiPathsValidation = React.useMemo(
    () =>
      normalizedAiPathsValidation && typeof normalizedAiPathsValidation === 'object'
        ? normalizedAiPathsValidation
        : normalizeAiPathsValidationConfig(undefined),
    [normalizedAiPathsValidation]
  );
  const isNodeValidationEnabled = effectiveAiPathsValidation.enabled !== false;

  const validationPreflightReport = React.useMemo(
    () =>
      evaluateAiPathsValidationPreflight({
        nodes: state.nodes,
        edges: state.edges,
        config: effectiveAiPathsValidation,
      }),
    [state.nodes, state.edges, effectiveAiPathsValidation]
  );

  const dataContractReport = React.useMemo(
    () =>
      evaluateDataContractPreflight({
        nodes: state.nodes,
        edges: state.edges,
        runtimeState: state.runtimeState,
        mode: 'light',
        scopeMode: isNodeValidationEnabled ? 'full' : 'reachable_from_roots',
      }),
    [state.nodes, state.edges, state.runtimeState, isNodeValidationEnabled]
  );

  const pathSwitchOptions = React.useMemo(
    () => buildSwitchPathOptions(sortPathMetas(state.paths)),
    [state.paths]
  );

  const autoSaveVariant = React.useMemo(() => {
    switch (state.autoSaveStatus) {
      case 'saved':
        return 'success';
      case 'saving':
        return 'processing';
      case 'error':
        return 'error';
      default:
        return 'neutral';
    }
  }, [state.autoSaveStatus]);

  const handleInspectTraceNode = React.useCallback(
    async (nodeId: string, focus: 'all' | 'failed'): Promise<void> => {
      const targetNodeId = nodeId.trim();
      if (!targetNodeId) return;

      const baseOptions = {
        ...(state.activePathId ? { pathId: state.activePathId } : {}),
        nodeId: targetNodeId,
        limit: 1,
        offset: 0,
      };

      const readFirstRunId = (result: Awaited<ReturnType<typeof runsApi.list>>): string | null => {
        if (!result.ok) return null;
        const payload = result.data as { runs?: Array<{ id?: unknown }> } | undefined;
        if (!Array.isArray(payload?.runs)) return null;
        const firstRunId = payload.runs[0]?.id;
        return typeof firstRunId === 'string' && firstRunId.trim().length > 0 ? firstRunId : null;
      };

      let runId: string | null = null;
      if (focus === 'failed') {
        const result = await runsApi.list({ ...baseOptions, status: 'failed' });
        runId = readFirstRunId(result);
      }

      if (!runId) {
        const result = await runsApi.list(baseOptions);
        runId = readFirstRunId(result);
      }

      if (runId) {
        state.setRunHistoryNodeId(targetNodeId);
        state.setRunFilter(focus);
        void state.handleOpenRunDetail(runId);
      }
    },
    [state]
  );

  const handleOpenNodeValidator = React.useCallback((): void => {
    if (typeof window !== 'undefined') {
      window.location.assign('/admin/ai-paths/validation');
    }
  }, []);

  const handleRunNodeValidationCheck = React.useCallback((): void => {
    if (validationPreflightReport.blocked) {
      state.toast(`Node validation blocked (score ${validationPreflightReport.score}).`, {
        variant: 'error',
      });
      return;
    }
    if (validationPreflightReport.shouldWarn) {
      state.toast(
        `Node validation warning (score ${validationPreflightReport.score}, failed rules ${validationPreflightReport.failedRules}).`,
        { variant: 'warning' }
      );
      return;
    }
    state.toast('Node validation passed.', { variant: 'success' });
  }, [state, validationPreflightReport]);

  return React.useMemo<AiPathsSettingsPageContextValue>(
    () => ({
      ...props,
      ...state,
      pathSettingsModalOpen,
      setPathSettingsModalOpen,
      simulationModalOpen,
      setSimulationModalOpen,
      savePathConfig: state.handleSave,
      normalizedAiPathsValidation: effectiveAiPathsValidation,
      nodeValidationEnabled: isNodeValidationEnabled,
      validationPreflightReport,
      handleOpenNodeValidator,
      handleRunNodeValidationCheck,
      docsTooltipsEnabled,
      setDocsTooltipsEnabled,
      nodeConfigDirty: state.nodeConfigDirty,
      selectedNodeIds: state.selectedNodeId ? [state.selectedNodeId] : [],
      selectionScopeMode,
      setSelectionScopeMode,
      dataContractReport,
      setDataContractInspectorNodeId,
      autoSaveVariant,
      isPathNameEditing,
      renameDraft,
      setRenameDraft,
      commitPathNameEdit: () => {
        if (!state.activePathId) return;
        state.setPathName(renameDraft);
        void state.handleSave({ pathNameOverride: renameDraft });
        setIsPathNameEditing(false);
      },
      cancelPathNameEdit: () => {
        setRenameDraft(state.pathName);
        setIsPathNameEditing(false);
      },
      startPathNameEdit: () => {
        setRenameDraft(state.pathName);
        setIsPathNameEditing(true);
      },
      pathSwitchOptions,
      hasHistory: state.runtimeEvents.length > 0,
      handleInspectTraceNode,
      incrementLoadNonce: () => {
        state.setLoadNonce((previous: number): number => previous + 1);
      },
    }),
    [
      props,
      state,
      pathSettingsModalOpen,
      simulationModalOpen,
      selectionScopeMode,
      effectiveAiPathsValidation,
      validationPreflightReport,
      handleOpenNodeValidator,
      handleRunNodeValidationCheck,
      docsTooltipsEnabled,
      setDocsTooltipsEnabled,
      dataContractReport,
      autoSaveVariant,
      isPathNameEditing,
      renameDraft,
      pathSwitchOptions,
      handleInspectTraceNode,
    ]
  );
}
