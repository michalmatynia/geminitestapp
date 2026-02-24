'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff } from 'lucide-react';

import {
  Button,
  StatusBadge,
} from '@/shared/ui';
import { useAiPathsSettingsPageContext } from '../AiPathsSettingsPageContext';
import { useAiPathsSettingsOrchestrator } from '../AiPathsSettingsOrchestratorContext';
import {
  useSelectionActions,
  useSelectionState,
} from '../../../context';
import { CanvasBoard } from '../../canvas-board';
import { CanvasSidebar } from '../../canvas-sidebar';
import { ClusterPresetsPanel } from '../../cluster-presets-panel';
import { GraphModelDebugPanel } from '../../graph-model-debug-panel';
import { RunHistoryPanel } from '../../run-history-panel';
import { RuntimeEventLogPanel } from '../../runtime-event-log-panel';
import { AiPathsRuntimeAnalysis } from './AiPathsRuntimeAnalysis';
import { AiPathsLiveLog } from './AiPathsLiveLog';

export function AiPathsCanvasView(): React.JSX.Element | null {
  const {
    activeTab,
    isFocusMode,
    renderActions,
    nodeConfigDirty,
    savePathConfig,
    saving,
    setPathSettingsModalOpen,
    activePathId,
    normalizedAiPathsValidation,
    updateAiPathsValidation,
    validationPreflightReport,
    handleOpenNodeValidator,
    docsTooltipsEnabled,
    setDocsTooltipsEnabled,
    handleTogglePathLock,
    isPathLocked,
    handleRunNodeValidationCheck,
    toast,
    autoSaveLabel,
    autoSaveVariant,
    lastRunAt,
    isPathNameEditing,
    renameDraft,
    setRenameDraft,
    commitPathNameEdit,
    cancelPathNameEdit,
    startPathNameEdit,
    pathName,
    pathSwitchOptions,
    handleSwitchPath,
    lastError,
    setLastError,
    persistLastError,
    incrementLoadNonce,
    handleClearConnectorData,
    handleClearHistory,
    isPathActive,
    handleTogglePathActive,
    hasHistory,
    selectedNodeIds,
    selectionScopeMode,
    setSelectionScopeMode,
    dataContractReport,
    setDataContractInspectorNodeId,
    state,
  } = useAiPathsSettingsPageContext();

  const {
    canvasContainerRef,
    isRightSidebarCollapsed,
    setIsFocusMode,
  } = useAiPathsSettingsOrchestrator();

  const { selectionToolMode } = useSelectionState();
  const { setSelectionToolMode } = useSelectionActions();

  if (activeTab !== 'canvas') return null;

  return (
    <div className={isFocusMode ? 'h-full space-y-0' : 'space-y-6'}>
      {!isFocusMode && typeof document !== 'undefined' && renderActions
        ? createPortal(
          renderActions(
            <div className='flex w-full items-start'>
              <div className='flex flex-col items-start gap-2'>
                <div className='flex flex-wrap items-center gap-3'>
                  <Button
                    data-doc-id='canvas_save_path'
                    className='rounded-md border text-sm text-white hover:bg-muted/60'
                    onClick={() => {
                      if (nodeConfigDirty) {
                        toast(
                          'Unsaved node-config dialog changes are not included. Click "Update Node" first, then "Save Path".',
                          { variant: 'info' },
                        );
                      }
                      void savePathConfig();
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
                      setPathSettingsModalOpen(true);
                    }}
                    disabled={!activePathId}
                  >
                    Paths Settings
                  </Button>
                  <Button
                    data-doc-id='canvas_enable_node_validation'
                    type='button'
                    variant={normalizedAiPathsValidation.enabled === false ? 'warning' : 'success'}
                    className='rounded-md text-sm'
                    onClick={() => {
                      const nextEnabled = normalizedAiPathsValidation.enabled === false;
                      updateAiPathsValidation({ enabled: nextEnabled });
                      toast(
                        nextEnabled
                          ? 'AI Paths node validation enabled.'
                          : 'AI Paths node validation disabled.',
                        {
                          variant: nextEnabled ? 'success' : 'info',
                        },
                      );
                    }}
                    disabled={!activePathId || isPathLocked}
                    title={
                      normalizedAiPathsValidation.enabled === false
                        ? 'Enable AI Paths node validation'
                        : 'Disable AI Paths node validation'
                    }
                  >
                    {normalizedAiPathsValidation.enabled === false
                      ? 'Enable Node Validation'
                      : 'Disable Node Validation'}
                  </Button>
                  <Button
                    data-doc-id='canvas_validate_nodes'
                    type='button'
                    variant='info'
                    className='rounded-md text-sm'
                    onClick={handleRunNodeValidationCheck}
                    disabled={
                      !activePathId || normalizedAiPathsValidation.enabled === false
                    }
                    title='Run node validation check now'
                  >
                    Validate Nodes
                  </Button>
                  <Button
                    data-doc-id='canvas_open_node_validator'
                    type='button'
                    variant='secondary'
                    className='rounded-md text-sm border-indigo-500/40 text-indigo-200 hover:bg-indigo-500/10'
                    onClick={handleOpenNodeValidator}
                    disabled={!activePathId}
                    title='Open AI-Paths Node Validator patterns and sequences'
                  >
                    Node Validator
                  </Button>
                  <StatusBadge
                    status={
                      normalizedAiPathsValidation.enabled === false
                        ? 'Validation: off'
                        : validationPreflightReport.blocked
                          ? 'Validation: blocked'
                          : validationPreflightReport.shouldWarn
                            ? 'Validation: warning'
                            : 'Validation: ready'
                    }
                    variant={
                      normalizedAiPathsValidation.enabled === false
                        ? 'neutral'
                        : validationPreflightReport.blocked
                          ? 'error'
                          : validationPreflightReport.shouldWarn
                            ? 'warning'
                            : 'success'
                    }
                    size='sm'
                    className='font-medium'
                  />
                  <StatusBadge
                    status={`Validation score: ${validationPreflightReport.score}`}
                    variant='neutral'
                    size='sm'
                    className='font-medium'
                  />
                  <StatusBadge
                    status={`Failed rules: ${validationPreflightReport.failedRules}`}
                    variant={
                      validationPreflightReport.failedRules > 0
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
                    onClick={() => setDocsTooltipsEnabled(!docsTooltipsEnabled)}
                  >
                    {docsTooltipsEnabled ? 'Docs Tooltips: On' : 'Docs Tooltips: Off'}
                  </Button>
                  <Button
                    data-doc-id='canvas_toggle_path_lock'
                    type='button'
                    className='rounded-md border border-border text-sm text-gray-300 hover:bg-card/60'
                    onClick={handleTogglePathLock}
                    disabled={!activePathId}
                    title={
                      isPathLocked
                        ? 'Unlock to edit nodes and connections'
                        : 'Lock to prevent edits'
                    }
                  >
                    {isPathLocked ? 'Unlock Path' : 'Lock Path'}
                  </Button>
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
                          selectionScopeMode === 'portion'
                            ? 'bg-sky-500/20 text-sky-200'
                            : 'text-gray-300 hover:bg-card/60'
                        }`}
                        onClick={() => setSelectionScopeMode('portion')}
                        title='Select only nodes inside the rectangle'
                      >
                        Portion
                      </Button>
                      <Button
                        type='button'
                        className={`h-8 rounded-md px-2 text-xs ${
                          selectionScopeMode === 'wiring'
                            ? 'bg-sky-500/20 text-sky-200'
                            : 'text-gray-300 hover:bg-card/60'
                        }`}
                        onClick={() => setSelectionScopeMode('wiring')}
                        title='Expand marquee selection to connected wiring'
                      >
                        With Wiring
                      </Button>
                    </div>
                  ) : null}
                  <StatusBadge
                    status={`Selected: ${selectedNodeIds.length}`}
                    variant='neutral'
                    size='sm'
                    className='font-medium'
                    title='Selected nodes count'
                  />
                  {selectionToolMode === 'select' ? (
                    <div className='text-[11px] text-gray-400'>
                      {selectionScopeMode === 'wiring'
                        ? 'Drag to select connected subgraphs. Shift add, Alt subtract.'
                        : 'Drag to select node portions only. Shift add, Alt subtract.'}
                    </div>
                  ) : null}
                  <Button
                    data-doc-id='canvas_clear_connector_data'
                    className='rounded-md border border-amber-500/40 text-sm text-amber-200 hover:bg-amber-500/10'
                    onClick={() => {
                      void handleClearConnectorData();
                    }}
                    type='button'
                    disabled={!activePathId}
                  >
                      Clear Connector Data
                  </Button>
                  <Button
                    data-doc-id='canvas_toggle_path_active'
                    type='button'
                    className={`rounded-md border text-sm ${isPathActive ? 'border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10' : 'border-rose-500/40 text-rose-200 hover:bg-rose-500/10'}`}
                    onClick={handleTogglePathActive}
                    disabled={!activePathId}
                    title={
                      isPathActive
                        ? 'Deactivate to stop runs'
                        : 'Activate to allow runs'
                    }
                  >
                    {isPathActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    data-doc-id='canvas_clear_history'
                    className='rounded-md border border-sky-500/40 text-sm text-sky-200 hover:bg-sky-500/10'
                    onClick={() => {
                      void handleClearHistory();
                    }}
                    type='button'
                    disabled={!activePathId}
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
                        setLastError(null);
                        void persistLastError(null);
                      }}
                    >
                        Clear
                    </Button>
                    {lastError.message ===
                        'Failed to load AI Paths settings' && (
                      <Button
                        type='button'
                        className='rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20'
                        onClick={() => {
                          setLastError(null);
                          void persistLastError(null);
                          incrementLoadNonce();
                        }}
                      >
                          Retry
                      </Button>
                    )}
                    <Button
                      type='button'
                      className='rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20'
                      onClick={(): void =>
                        window.location.assign(
                          `/admin/system/logs?level=error&source=client&query=${encodeURIComponent(
                            'AI Paths',
                          )}`,
                        )
                      }
                    >
                        View logs
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ),
          document.getElementById('ai-paths-actions') ?? document.body,
        )
        : null}

      {!isFocusMode && typeof document !== 'undefined' && activePathId
        ? createPortal(
          <div className='flex items-center justify-end gap-2'>
            {autoSaveLabel ? (
              <StatusBadge
                status={autoSaveLabel}
                variant={autoSaveVariant}
                size='sm'
                className='font-medium'
              />
            ) : null}
            {lastRunAt && (
              <StatusBadge
                status={
                  'Last run: ' + new Date(lastRunAt).toLocaleTimeString()
                }
                variant='active'
                size='sm'
                className='font-medium'
              />
            )}
            <div className='flex items-center gap-2'>
              {isPathNameEditing ? (
                <input
                  data-doc-id='canvas_path_name_field'
                  type='text'
                  value={renameDraft}
                  onChange={(event) => {
                    setRenameDraft(event.target.value);
                  }}
                  onBlur={commitPathNameEdit}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      event.currentTarget.blur();
                      return;
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      cancelPathNameEdit();
                    }
                  }}
                  autoFocus
                  className='h-9 w-[320px] rounded-md border border-border bg-card/60 px-3 text-sm text-white outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  placeholder='Path name'
                  disabled={!activePathId}
                />
              ) : (
                <button
                  data-doc-id='canvas_path_name_field'
                  type='button'
                  className='h-9 w-[320px] rounded-md border border-border bg-card/60 px-3 text-left text-sm text-gray-200 hover:bg-card/70 disabled:cursor-not-allowed disabled:opacity-60'
                  onDoubleClick={startPathNameEdit}
                  disabled={!activePathId}
                  title={
                    activePathId
                      ? 'Double-click to rename this path'
                      : 'No active path selected'
                  }
                >
                  <span className='block truncate'>
                    {pathName || 'Untitled path'}
                  </span>
                </button>
              )}
              {/* Select path dropdown logic would go here if needed in this component */}
            </div>
          </div>,
          document.getElementById('ai-paths-name') ?? document.body,
        )
        : null}

      <div
        className={`flex overflow-hidden rounded-xl border border-border/60 bg-card/25 shadow-2xl ${
          isFocusMode ? 'h-[calc(100vh-140px)]' : 'h-[800px]'
        }`}
      >
        <div className='relative flex flex-1 flex-col overflow-hidden'>
          <div ref={canvasContainerRef} className='flex-1'>
            <CanvasBoard />
          </div>
          {isFocusMode && (
            <div className='absolute bottom-4 right-4 flex items-center gap-2'>
              <Button
                type='button'
                variant='secondary'
                size='sm'
                className='h-8 bg-black/60 text-xs backdrop-blur-md'
                onClick={() => setIsFocusMode(false)}
              >
                Exit Focus Mode
              </Button>
            </div>
          )}
        </div>

        {!isRightSidebarCollapsed && (
          <div className='w-[400px] flex-shrink-0 border-l border-border/60'>
            <div className='h-full space-y-4 overflow-y-auto p-4'>
              <CanvasSidebar />
              <ClusterPresetsPanel />
              <GraphModelDebugPanel />
              <RunHistoryPanel />
            </div>
          </div>
        )}
      </div>

      {!isFocusMode && <RuntimeEventLogPanel />}
      {!isFocusMode && (
        <div className='grid gap-4 lg:grid-cols-2'>
          <AiPathsRuntimeAnalysis />
          <AiPathsLiveLog />
        </div>
      )}
    </div>
  );
}
