'use client';

import React, { startTransition } from 'react';
import { useRouter } from 'nextjs-toploader/app';
import { Button } from '@/shared/ui/primitives.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { useSelectionState, useSelectionActions } from '@/features/ai/ai-paths/context';
import { useAiPathsSettingsPageContext } from '../AiPathsSettingsPageContext';

import { AiPathsRuntimeKernelSettings } from './AiPathsRuntimeKernelSettings';

export function AiPathsCanvasToolbar(): React.JSX.Element | null {
  const router = useRouter();
  const {
    activePathId,
    savePathConfig,
    saving,
    setPathSettingsModalOpen,
    diagnosticsReady,
    nodeValidationEnabled: nodeValidationEnabledFromContext,
    updateAiPathsValidation,
    validationPreflightReport,
    handleOpenNodeValidator,
    docsTooltipsEnabled,
    setDocsTooltipsEnabled,
    handleTogglePathLock,
    isPathLocked,
    handleRunNodeValidationCheck,
    toast,
    isPathSwitching,
    persistLastError,
    incrementLoadNonce,
    handleClearConnectorData,
    handleClearHistory,
    handleDeleteSelectedNode,
    isPathActive,
    handleTogglePathActive,
    hasHistory,
    selectionScopeMode,
    setSelectionScopeMode,
    lastError,
  } = useAiPathsSettingsPageContext();

  const {
    selectionToolMode,
    nodeConfigDirty: nodeConfigDirtySelection,
    selectedNodeIds: selectedNodeIdsCtx,
    selectedEdgeId: selectedEdgeIdCtx,
  } = useSelectionState();
  const { setSelectionToolMode } = useSelectionActions();

  const notify = toast ?? (() => undefined);
  const savePath = savePathConfig ?? (async (): Promise<boolean> => false);
  const openPathSettings = setPathSettingsModalOpen ?? (() => undefined);
  const toggleDocsTooltips = setDocsTooltipsEnabled ?? (() => undefined);
  const togglePathLock = handleTogglePathLock ?? (() => undefined);
  const runNodeValidationCheck = handleRunNodeValidationCheck ?? (() => undefined);
  const openNodeValidator = handleOpenNodeValidator ?? (() => undefined);
  const patchAiPathsValidation = updateAiPathsValidation ?? (() => undefined);
  const clearConnectorData = handleClearConnectorData ?? (async (): Promise<void> => undefined);
  const clearHistory = handleClearHistory ?? (async (): Promise<void> => undefined);
  const togglePathActive = handleTogglePathActive ?? (() => undefined);
  const persistLastErrorSafe = persistLastError ?? (async (): Promise<void> => undefined);
  const bumpLoadNonce = incrementLoadNonce ?? (() => undefined);
  const validationDiagnosticsReady = diagnosticsReady !== false;
  const nodeValidationEnabled = nodeValidationEnabledFromContext !== false;
  const validationBlocked =
    validationDiagnosticsReady && Boolean(validationPreflightReport?.blocked);
  const validationWarn =
    validationDiagnosticsReady && Boolean(validationPreflightReport?.shouldWarn);
  const validationScore = validationDiagnosticsReady
    ? (validationPreflightReport?.score ?? 0)
    : null;
  const validationFailedRules = validationDiagnosticsReady
    ? (validationPreflightReport?.failedRules ?? 0)
    : null;
  const selectedCount = selectedNodeIdsCtx.length;
  const removeSelection = handleDeleteSelectedNode ?? (() => undefined);
  const canDeleteSelection = !isPathSwitching && (selectedCount > 0 || Boolean(selectedEdgeIdCtx));
  const scopeMode = selectionScopeMode === 'wiring' ? 'wiring' : 'portion';
  const setScopeMode = setSelectionScopeMode ?? (() => undefined);
  const docsTooltipsOn = Boolean(docsTooltipsEnabled);
  const activePath = activePathId ?? null;

  // I need to decide if I move Runtime Kernel settings here too.
  // For now let's just move the basic actions.
  
  return (
    <div className='flex flex-col items-start gap-2'>
      <div className='flex flex-wrap items-center gap-3'>
        <Button
          data-doc-id='canvas_save_path'
          className='rounded-md border text-sm text-white hover:bg-muted/60'
          onClick={() => {
            if (nodeConfigDirtySelection) {
              notify(
                'Unsaved node-config dialog changes are not included. Click "Update Node" first, then "Save Path".',
                { variant: 'info' }
              );
            }
            void savePath();
          }}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Path'}
        </Button>
        <Button
          data-doc-id='canvas_paths_settings'
          type='button'
          className='rounded-md border border-border text-sm text-gray-200 hover:bg-card/60'
          onClick={() => {
            openPathSettings(true);
          }}
          disabled={!activePath}
        >
            Paths Settings
        </Button>
        <Button
          data-doc-id='canvas_enable_node_validation'
          type='button'
          variant={!nodeValidationEnabled ? 'warning' : 'success'}
          className='rounded-md text-sm'
          onClick={() => {
            const nextEnabled = !nodeValidationEnabled;
            patchAiPathsValidation({ enabled: nextEnabled });
            notify(
              nextEnabled
                ? 'AI Paths node validation enabled.'
                : 'AI Paths node validation disabled.',
              {
                variant: nextEnabled ? 'success' : 'info',
              }
            );
          }}
          disabled={!activePath || isPathLocked}
          title={
            !nodeValidationEnabled
              ? 'Enable AI Paths node validation'
              : 'Disable AI Paths node validation'
          }
        >
          {!nodeValidationEnabled
            ? 'Enable Node Validation'
            : 'Disable Node Validation'}
        </Button>
        <Button
          data-doc-id='canvas_validate_nodes'
          type='button'
          variant='info'
          className='rounded-md text-sm'
          onClick={runNodeValidationCheck}
          disabled={!activePath || !nodeValidationEnabled}
          title='Run node validation check now'
        >
            Validate Nodes
        </Button>
        <Button
          data-doc-id='canvas_open_node_validator'
          type='button'
          variant='secondary'
          className='rounded-md text-sm border-indigo-500/40 text-indigo-200 hover:bg-indigo-500/10'
          onClick={openNodeValidator}
          disabled={!activePath}
          title='Open AI-Paths Node Validator patterns and sequences'
        >
            Node Validator
        </Button>
        <StatusBadge
          status={
            !nodeValidationEnabled
              ? 'Validation: off'
              : !validationDiagnosticsReady
                ? 'Validation: loading'
              : validationBlocked
                ? 'Validation: blocked'
                : validationWarn
                  ? 'Validation: warning'
                  : 'Validation: ready'
          }
          variant={
            !nodeValidationEnabled
              ? 'neutral'
              : !validationDiagnosticsReady
                ? 'neutral'
              : validationBlocked
                ? 'error'
                : validationWarn
                  ? 'warning'
                  : 'success'
          }
          size='sm'
          className='font-medium'
        />
        <StatusBadge
          status={
            validationDiagnosticsReady
              ? `Validation score: ${validationScore}`
              : 'Validation score: loading'
          }
          variant='neutral'
          size='sm'
          className='font-medium'
        />
        <StatusBadge
          status={
            validationDiagnosticsReady
              ? `Failed rules: ${validationFailedRules}`
              : 'Failed rules: loading'
          }
          variant={
            !validationDiagnosticsReady
              ? 'neutral'
              : (validationFailedRules ?? 0) > 0
                ? 'warning'
                : 'success'
          }
          size='sm'
          className='font-medium'
        />
        <Button
          data-doc-id='docs_tooltips_toggle'
          type='button'
          className='rounded-md border border-violet-500/40 text-sm text-violet-200 hover:bg-violet-500/10'
          onClick={() => toggleDocsTooltips(!docsTooltipsOn)}
        >
          {docsTooltipsOn ? 'Docs Tooltips: On' : 'Docs Tooltips: Off'}
        </Button>
        <Button
          data-doc-id='canvas_toggle_path_lock'
          type='button'
          className='rounded-md border border-border text-sm text-gray-300 hover:bg-card/60'
          onClick={togglePathLock}
          disabled={!activePath}
          title={
            isPathLocked
              ? 'Unlock to edit nodes and connections'
              : 'Lock to prevent edits'
          }
        >
          {isPathLocked ? 'Unlock Path' : 'Lock Path'}
        </Button>

        <AiPathsRuntimeKernelSettings />

        <div className='flex items-center rounded-md border border-border/60 bg-card/40 p-0.5'>
          <Button
            type='button'
            className={`h-8 rounded-md px-2 text-xs ${
              selectionToolMode === 'pan'
                ? 'bg-sky-500/20 text-sky-200'
                : 'text-gray-300 hover:bg-card/60'
            }`}
            onClick={() => setSelectionToolMode('pan')}
            title='Pan canvas'
          >
              Pan
          </Button>
          <Button
            type='button'
            className={`h-8 rounded-md px-2 text-xs ${
              selectionToolMode === 'select'
                ? 'bg-sky-500/20 text-sky-200'
                : 'text-gray-300 hover:bg-card/60'
            }`}
            onClick={() => setSelectionToolMode('select')}
            title='Rectangle selection tool'
          >
              Select
          </Button>
        </div>
        {selectionToolMode === 'select' ? (
          <div className='flex items-center rounded-md border border-border/60 bg-card/40 p-0.5'>
            <Button
              type='button'
              className={`h-8 rounded-md px-2 text-xs ${
                scopeMode === 'portion'
                  ? 'bg-sky-500/20 text-sky-200'
                  : 'text-gray-300 hover:bg-card/60'
              }`}
              onClick={() => setScopeMode('portion')}
              title='Select only nodes inside the rectangle'
            >
                Portion
            </Button>
            <Button
              type='button'
              className={`h-8 rounded-md px-2 text-xs ${
                scopeMode === 'wiring'
                  ? 'bg-sky-500/20 text-sky-200'
                  : 'text-gray-300 hover:bg-card/60'
              }`}
              onClick={() => setScopeMode('wiring')}
              title='Expand marquee selection to connected wiring'
            >
                With Wiring
            </Button>
          </div>
        ) : null}
        <StatusBadge
          status={`Selected: ${selectedCount}`}
          variant='neutral'
          size='sm'
          className='font-medium'
          title='Selected nodes count'
        />
        {isPathSwitching ? (
          <StatusBadge
            status='Switching path...'
            variant='processing'
            size='sm'
            className='font-medium'
          />
        ) : null}
        <Button
          data-doc-id='canvas_remove_selected'
          type='button'
          variant='destructive'
          className='rounded-md text-sm'
          onClick={removeSelection}
          disabled={!canDeleteSelection}
          title={
            isPathSwitching
              ? 'Delete is temporarily disabled while switching paths'
              : canDeleteSelection
                ? 'Delete selected nodes or selected edge'
                : 'Select at least one node or edge to delete'
          }
        >
            Remove Selected
        </Button>
        {selectionToolMode === 'select' ? (
          <div className='text-[11px] text-gray-400'>
            {scopeMode === 'wiring'
              ? 'Drag to select connected subgraphs. Shift add, Alt subtract.'
              : 'Drag to select node portions only. Shift add, Alt subtract.'}
          </div>
        ) : null}
        <Button
          data-doc-id='canvas_clear_connector_data'
          className='rounded-md border border-amber-500/40 text-sm text-amber-200 hover:bg-amber-500/10'
          onClick={() => {
            void clearConnectorData();
          }}
          type='button'
          disabled={!activePath}
        >
            Clear Connector Data
        </Button>
        <Button
          data-doc-id='canvas_toggle_path_active'
          type='button'
          className={`rounded-md border text-sm ${isPathActive ? 'border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10' : 'border-rose-500/40 text-rose-200 hover:bg-rose-500/10'}`}
          onClick={togglePathActive}
          disabled={!activePath}
          title={isPathActive ? 'Deactivate to stop runs' : 'Activate to allow runs'}
        >
          {isPathActive ? 'Deactivate' : 'Activate'}
        </Button>
        <Button
          data-doc-id='canvas_clear_history'
          className='rounded-md border border-sky-500/40 text-sm text-sky-200 hover:bg-sky-500/10'
          onClick={() => {
            void clearHistory();
          }}
          type='button'
          disabled={!activePath}
          title={
            hasHistory
              ? 'Clear history for all nodes in this path'
              : 'No history recorded yet'
          }
        >
            Clear History
        </Button>
      </div>
      {lastError && (
        <div className='flex items-center gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-200'>
          <span className='max-w-[220px] truncate'>
              Last error: {lastError.message}
          </span>
          <Button
            type='button'
            className='rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20'
            onClick={() => {
              void persistLastErrorSafe(null);
            }}
          >
              Clear
          </Button>
          {lastError.message.startsWith('Failed to load AI Paths settings') && (
            <Button
              type='button'
              className='rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20'
              onClick={() => {
                void persistLastErrorSafe(null);
                bumpLoadNonce();
              }}
            >
                Retry
            </Button>
          )}
          <Button
            type='button'
            className='rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20'
            onClick={(): void => {
              startTransition(() => { router.push(
                                `/admin/system/logs?level=error&source=client&query=${encodeURIComponent(
                                  'AI Paths'
                                )}`
                              ); });
            }}
          >
              View logs
          </Button>
        </div>
      )}
    </div>
  );
}
