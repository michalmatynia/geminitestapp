'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { useRunHistoryActions } from '@/features/ai/ai-paths/context';
import { useAiPathsDocsTooltips } from '@/features/ai/ai-paths/hooks/useAiPathsDocsTooltips';
import { evaluateDataContractPreflight } from '@/shared/lib/ai-paths/core/utils/data-contract-preflight';
import { evaluateAiPathsValidationPreflight, listAiPathRuns, normalizeAiPathsValidationConfig } from '@/shared/lib/ai-paths';

import { buildSwitchPathOptions, sortPathMetas } from './ai-paths-settings-view-utils';

import type { AiPathsSettingsPageContextValue } from './AiPathsSettingsPageContext';
import type { AiPathsSettingsProps } from '../AiPathsSettings';
import type { UseAiPathsSettingsStateReturn } from './types';

type DeferredAiPathsDiagnosticsTarget = {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
  setTimeout: (handler: () => void, timeout?: number) => number;
  clearTimeout: (handle: number) => void;
};

const EMPTY_VALIDATION_PREFLIGHT_REPORT: AiPathsSettingsPageContextValue['validationPreflightReport'] =
  {
    score: 0,
    failedRules: 0,
    blocked: false,
    shouldWarn: false,
    findings: [],
    recommendations: [],
    schemaVersion: 1,
    skippedRuleIds: [],
    moduleImpact: {},
  };

const buildEmptyDataContractReport = (
  scopeMode: 'full' | 'reachable_from_roots'
): AiPathsSettingsPageContextValue['dataContractReport'] => ({
  mode: 'light',
  scopeMode,
  scopedNodeIds: [],
  issues: [],
  errors: 0,
  warnings: 0,
  byNodeId: {},
});

function scheduleDeferredAiPathsDiagnostics(
  target: DeferredAiPathsDiagnosticsTarget,
  onReady: () => void
): () => void {
  if (typeof target.requestIdleCallback === 'function') {
    const idleHandle = target.requestIdleCallback(() => {
      onReady();
    });
    return (): void => {
      target.cancelIdleCallback?.(idleHandle);
    };
  }

  const timeoutHandle = target.setTimeout(() => {
    onReady();
  }, 1);
  return (): void => {
    target.clearTimeout(timeoutHandle);
  };
}

export function useAiPathsSettingsPageValue(
  props: AiPathsSettingsProps,
  state: UseAiPathsSettingsStateReturn
): AiPathsSettingsPageContextValue {
  const router = useRouter();
  const { setRunHistoryNodeId, setRunFilter, openRunDetail } = useRunHistoryActions();
  const [pathSettingsModalOpen, setPathSettingsModalOpen] = React.useState(false);
  const [simulationModalOpen, setSimulationModalOpen] = React.useState(false);
  const [selectionScopeMode, setSelectionScopeMode] = React.useState<'portion' | 'wiring'>(
    'portion'
  );
  const [, setDataContractInspectorNodeId] = React.useState<string | null>(null);
  const [isPathNameEditing, setIsPathNameEditing] = React.useState(false);
  const [renameDraft, setRenameDraft] = React.useState('');
  const [diagnosticsReady, setDiagnosticsReady] = React.useState(false);
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
  const dataContractScopeMode = isNodeValidationEnabled ? 'full' : 'reachable_from_roots';
  const emptyDataContractReport = React.useMemo(
    () => buildEmptyDataContractReport(dataContractScopeMode),
    [dataContractScopeMode]
  );

  React.useEffect(() => {
    if (props.activeTab !== 'canvas') {
      setDiagnosticsReady(false);
      return;
    }
    if (diagnosticsReady) return;
    if (typeof window === 'undefined') {
      setDiagnosticsReady(true);
      return;
    }
    return scheduleDeferredAiPathsDiagnostics(window, () => {
      setDiagnosticsReady(true);
    });
  }, [diagnosticsReady, props.activeTab]);

  const computeValidationPreflightReport = React.useCallback(
    () =>
      evaluateAiPathsValidationPreflight({
        nodes: state.nodes,
        edges: state.edges,
        config: effectiveAiPathsValidation,
      }),
    [effectiveAiPathsValidation, state.edges, state.nodes]
  );

  const computeDataContractReport = React.useCallback(
    () =>
      evaluateDataContractPreflight({
        nodes: state.nodes,
        edges: state.edges,
        runtimeState: state.runtimeState,
        mode: 'light',
        scopeMode: dataContractScopeMode,
      }),
    [dataContractScopeMode, state.edges, state.nodes, state.runtimeState]
  );

  const validationPreflightReport = React.useMemo(
    () =>
      props.activeTab === 'canvas' && diagnosticsReady
        ? computeValidationPreflightReport()
        : EMPTY_VALIDATION_PREFLIGHT_REPORT,
    [computeValidationPreflightReport, diagnosticsReady, props.activeTab]
  );

  const dataContractReport = React.useMemo(
    () =>
      props.activeTab === 'canvas' && diagnosticsReady
        ? computeDataContractReport()
        : emptyDataContractReport,
    [computeDataContractReport, diagnosticsReady, emptyDataContractReport, props.activeTab]
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

      const readFirstRunId = (
        result: Awaited<ReturnType<typeof listAiPathRuns>>
      ): string | null => {
        if (!result.ok) return null;
        const payload = result.data as { runs?: Array<{ id?: unknown }> } | undefined;
        if (!Array.isArray(payload?.runs)) return null;
        const firstRunId = payload.runs[0]?.id;
        return typeof firstRunId === 'string' && firstRunId.trim().length > 0 ? firstRunId : null;
      };

      let runId: string | null = null;
      if (focus === 'failed') {
        const result = await listAiPathRuns({ ...baseOptions, status: 'failed' });
        runId = readFirstRunId(result);
      }

      if (!runId) {
        const result = await listAiPathRuns(baseOptions);
        runId = readFirstRunId(result);
      }

      if (runId) {
        setRunHistoryNodeId(targetNodeId);
        setRunFilter(focus);
        openRunDetail(runId);
      }
    },
    [openRunDetail, setRunFilter, setRunHistoryNodeId, state.activePathId]
  );

  const handleOpenNodeValidator = React.useCallback((): void => {
    router.push('/admin/ai-paths/validation');
  }, [router]);

  const handleRunNodeValidationCheck = React.useCallback((): void => {
    const report = diagnosticsReady
      ? validationPreflightReport
      : computeValidationPreflightReport();
    if (report.blocked) {
      state.toast(`Node validation blocked (score ${report.score}).`, {
        variant: 'error',
      });
      return;
    }
    if (report.shouldWarn) {
      state.toast(
        `Node validation warning (score ${report.score}, failed rules ${report.failedRules}).`,
        { variant: 'warning' }
      );
      return;
    }
    state.toast('Node validation passed.', { variant: 'success' });
  }, [
    computeValidationPreflightReport,
    diagnosticsReady,
    state,
    validationPreflightReport,
  ]);

  return React.useMemo<AiPathsSettingsPageContextValue>(
    () => ({
      ...props,
      ...state,
      diagnosticsReady,
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
        state.updateActivePathMeta(renameDraft);
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
        state.incrementLoadNonce();
      },
    }),
    [
      props,
      state,
      diagnosticsReady,
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
