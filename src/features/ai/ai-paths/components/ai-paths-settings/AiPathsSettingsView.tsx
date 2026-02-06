'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { triggers } from '@/features/ai/ai-paths/lib';
import type { AiNode, ClusterPreset, NodeDefinition } from '@/features/ai/ai-paths/lib';
import type { PathConfig, PathMeta } from '@/shared/types/ai-paths';
import { Button, Input, Label, SharedModal, UnifiedSelect, useToast } from '@/shared/ui';

import { useGraphState, usePersistenceActions, usePersistenceState, useRuntimeActions, useRuntimeState, useSelectionState } from '../../context';
import { CanvasBoardMigrated } from '../examples/CanvasBoardMigrated';
import { CanvasSidebarWrapper } from '../examples/CanvasSidebarWrapper';
import { ClusterPresetsPanelMigrated } from '../examples/ClusterPresetsPanelMigrated';
import { NodeConfigDialogMigrated } from '../examples/NodeConfigDialogMigrated';
import { RunHistoryPanelMigrated } from '../examples/RunHistoryPanelMigrated';
import { SimulationDialogMigrated } from '../examples/SimulationDialogMigrated';
import { GraphModelDebugPanel } from '../graph-model-debug-panel';
import { PresetsDialogWithContext } from '../presets-dialog';
import { RunDetailDialogWithContext } from '../run-detail-dialog';
import { DocsTabPanel, PathsTabPanel } from '../ui-panels';
import {
  DOCS_OVERVIEW_SNIPPET,
  DOCS_WIRING_SNIPPET,
  DOCS_DESCRIPTION_SNIPPET,
  DOCS_JOBS_SNIPPET,
} from './docs-snippets';

import type { AiPathsSettingsState } from './useAiPathsSettingsState';

type AiPathsSettingsViewProps = {
  activeTab: 'canvas' | 'paths' | 'docs';
  renderActions?: ((actions: React.ReactNode) => React.ReactNode) | undefined;
  onTabChange?: ((tab: 'canvas' | 'paths' | 'docs') => void) | undefined;
  isFocusMode?: boolean | undefined;
  onFocusModeChange?: ((next: boolean) => void) | undefined;
  state: AiPathsSettingsState;
};

export function AiPathsSettingsView({
  activeTab,
  renderActions,
  onTabChange,
  isFocusMode: isFocusModeProp,
  onFocusModeChange,
  state,
}: AiPathsSettingsViewProps): React.JSX.Element {
  // Domain: Persistence — read from context
  const { loading, saving, autoSaveStatus, autoSaveAt } = usePersistenceState();
  const { incrementLoadNonce } = usePersistenceActions();

  // Domain: Runtime — read from context
  const { runtimeState, lastRunAt, lastError } = useRuntimeState();
  const { setLastError } = useRuntimeActions();

  // Domain: Graph — read from context (synced state only)
  const { activePathId, pathName, isPathLocked, isPathActive, activeTrigger, executionMode, flowIntensity, runMode, paths, pathConfigs } = useGraphState();

  // Domain: Selection — read from context
  const { nodeConfigDirty, nodeConfigDraft } = useSelectionState();

  // Utility — imported directly
  const { toast } = useToast();

  const {
    handleCreatePath,
    handleSave,
    handleDeletePath,
    handleTogglePathLock,
    handleTogglePathActive,
    handleFlowIntensityChange,
    handleExecutionModeChange,
    handleRunModeChange,
    persistLastError,
    setPathName,
    updateActivePathMeta,
    handleSwitchPath,
    savePathIndex,
    nodes,
    setNodes,
    palette,
    handleDragStart,
    handleFireTrigger,
    handleFireTriggerPersistent,
    handlePauseActiveRun,
    handleResumeActiveRun,
    handleStepActiveRun,
    handleCancelActiveRun,
    runtimeRunStatus,
    updateSelectedNode,
    handleDeleteSelectedNode,
    handleRemoveEdge,
    handleClearWires,
    handleClearConnectorData,
    handleClearHistory,
    handleDisconnectPort,
    handleReconnectInput,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleStartConnection,
    handleCompleteConnection,
    handleDrop,
    handleDragOver,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    zoomTo,
    fitToNodes,
    resetView,
    handlePresetFromSelection,
    handleSavePreset,
    handleApplyPreset,
    handleDeletePreset,
    handleExportPresets,
    lastGraphModelPayload,
    runList,
    runsQuery,
    handleOpenRunDetail,
    handleResumeRun,
    handleCancelRun,
    handleRequeueDeadLetter,
    setNodeConfigDirty,
    modelOptions,
    updateSelectedNodeConfig,
    handleFetchParserSample,
    handleFetchUpdaterSample,
    handleRunSimulation,
    handleSendToAi,
    saveDbQueryPresets,
    saveDbNodePresets,
    handleImportPresets,
    reportAiPathsError,
  } = state;

  // Derived from Persistence context
  const autoSaveLabel = loading
    ? 'Loading AI Paths...'
    : saving
      ? 'Saving...'
      : autoSaveStatus === 'saved'
        ? `Saved${autoSaveAt ? ` at ${new Date(autoSaveAt).toLocaleTimeString()}` : ''}`
        : autoSaveStatus === 'error'
          ? 'Save failed'
          : 'Manual save only';
  const autoSaveClasses =
    autoSaveStatus === 'saved'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
      : autoSaveStatus === 'error'
        ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
        : autoSaveStatus === 'saving'
          ? 'border-sky-500/40 bg-sky-500/10 text-sky-200'
          : 'border bg-card/60 text-gray-300';

  // Derived from Graph context
  const pathFlagsById = useMemo((): Record<string, { isLocked: boolean; isActive: boolean }> => {
    const next: Record<string, { isLocked: boolean; isActive: boolean }> = {};
    paths.forEach((meta: PathMeta) => {
      const config = pathConfigs[meta.id];
      next[meta.id] = {
        isLocked: config?.isLocked ?? false,
        isActive: config?.isActive ?? true,
      };
    });
    return next;
  }, [pathConfigs, paths]);

  const hasHistory = Object.keys(runtimeState.history ?? {}).length > 0;

  const [isFocusModeInternal, setIsFocusModeInternal] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const isFocusMode = isFocusModeProp ?? isFocusModeInternal;
  const setIsFocusMode = onFocusModeChange ?? setIsFocusModeInternal;

  const activePathConfig: PathConfig | undefined = activePathId ? pathConfigs?.[activePathId] : undefined;
  const groupKey: string | null =
    (activePathConfig?.trigger && activePathConfig.trigger.trim().length > 0
      ? activePathConfig.trigger
      : activeTrigger?.trim()
        ? activeTrigger
        : triggers?.[0]) ?? null;

  const groupPaths = useMemo(() => {
    if (!groupKey) return paths;
    const filtered = paths.filter((p: PathMeta) => {
      const cfg = pathConfigs?.[p.id];
      const trig = typeof cfg?.trigger === 'string' ? cfg.trigger : '';
      return trig === groupKey;
    });
    return filtered.length > 0 ? filtered : paths;
  }, [groupKey, pathConfigs, paths]);

  const executionOptions = useMemo(
    () => [
      { value: 'server', label: 'Run on Server' },
      { value: 'local', label: 'Run Locally' },
    ],
    []
  );
  const flowOptions = useMemo(
    () => [
      { value: 'off', label: 'Flow: Off' },
      { value: 'low', label: 'Flow: Low' },
      { value: 'medium', label: 'Flow: Medium' },
      { value: 'high', label: 'Flow: High' },
    ],
    []
  );
  const runModeOptions = useMemo(
    () => [
      { value: 'block', label: 'Run: Block' },
      { value: 'queue', label: 'Run: Queue' },
    ],
    []
  );

  const setNodesFromUser: React.Dispatch<React.SetStateAction<AiNode[]>> = (
    next: React.SetStateAction<AiNode[]>
  ): void => {
    if (isPathLocked) {
      toast('This path is locked. Unlock it to edit nodes or connections.', { variant: 'info' });
      return;
    }
    setNodes(next);
  };

  if (loading) {
    return <div className="text-sm text-gray-400">Loading AI Paths...</div>;
  }

  return (
    <div className={isFocusMode ? 'h-full space-y-0' : 'space-y-6'}>
      {activeTab === 'canvas' && (
        <div className={isFocusMode ? 'h-full space-y-0' : 'space-y-6'}>
          {!isFocusMode && typeof document !== 'undefined' && renderActions
            ? createPortal(
              renderActions(
                <div className="grid w-full grid-cols-[1fr_auto_1fr] items-start gap-3">
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        className="rounded-md border border-border text-sm text-gray-300 hover:bg-card/60"
                        onClick={handleTogglePathLock}
                        disabled={!activePathId}
                        title={isPathLocked ? 'Unlock to edit nodes and connections' : 'Lock to prevent edits'}
                      >
                        {isPathLocked ? 'Unlock Path' : 'Lock Path'}
                      </Button>
                      <Button
                        className="rounded-md border border-amber-500/40 text-sm text-amber-200 hover:bg-amber-500/10"
                        onClick={() => {
                          void handleClearConnectorData();
                        }}
                        type="button"
                        disabled={!activePathId}
                      >
                          Clear Connector Data
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        className={`rounded-md border text-sm ${isPathActive ? 'border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10' : 'border-rose-500/40 text-rose-200 hover:bg-rose-500/10'}`}
                        onClick={handleTogglePathActive}
                        disabled={!activePathId}
                        title={isPathActive ? 'Deactivate to stop runs' : 'Activate to allow runs'}
                      >
                        {isPathActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        className="rounded-md border border-sky-500/40 text-sm text-sky-200 hover:bg-sky-500/10"
                        onClick={() => {
                          void handleClearHistory();
                        }}
                        type="button"
                        disabled={!activePathId}
                        title={hasHistory ? 'Clear history for all nodes in this path' : 'No history recorded yet'}
                      >
                          Clear History
                      </Button>
                    </div>
                    {lastError && (
                      <div className="flex items-center gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-200">
                        <span className="max-w-[220px] truncate">
                            Last error: {lastError.message}
                        </span>
                        <Button
                          type="button"
                          className="rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20"
                          onClick={() => {
                            setLastError(null);
                            void persistLastError(null);
                          }}
                        >
                            Clear
                        </Button>
                        {lastError.message === 'Failed to load AI Paths settings' && (
                          <Button
                            type="button"
                            className="rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20"
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
                          type="button"
                          className="rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20"
                          onClick={(): void =>
                            window.location.assign(
                              `/admin/system/logs?level=error&source=client&query=${encodeURIComponent(
                                'AI Paths'
                              )}`
                            )
                          }
                        >
                            View logs
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center">
                    {!isFocusMode && (
                      <Button
                        type="button"
                        className="rounded-md border border-border text-sm text-gray-200 hover:bg-card/60"
                        onClick={() => setIsFocusMode(true)}
                        title="Show canvas only"
                      >
                        Show
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Button
                      className="rounded-md border text-sm text-white hover:bg-muted/60"
                      type="button"
                      onClick={handleCreatePath}
                    >
                        New Path
                    </Button>
                    <Button
                      className="rounded-md border text-sm text-white hover:bg-muted/60"
                      onClick={() => {
                        if (nodeConfigDirty) {
                          if (nodeConfigDraft) {
                            const nextNodes = nodes.map((node: AiNode): AiNode =>
                              node.id === nodeConfigDraft.id ? nodeConfigDraft : node
                            );
                            updateSelectedNode(nodeConfigDraft, { nodeId: nodeConfigDraft.id });
                            void handleSave({
                              includeNodeConfig: true,
                              force: true,
                              nodesOverride: nextNodes,
                            });
                            return;
                          }
                          toast(
                            'Saving path settings only. Unsaved node changes in the config dialog are not included.',
                            { variant: 'info' }
                          );
                        }
                        void handleSave();
                      }}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Path'}
                    </Button>
                  </div>
                </div>
              ),
              document.getElementById('ai-paths-actions') ?? document.body
            )
            : null}
          {isFocusMode && typeof document !== 'undefined'
            ? (() => {
              const headerTarget = document.getElementById('ai-paths-header-actions');
              if (!headerTarget) return null;
              return createPortal(
                <Button
                  type="button"
                  className="rounded-md border border-border text-sm text-gray-200 hover:bg-card/60"
                  onClick={() => setIsFocusMode(false)}
                  title="Show side panels"
                >
                  Edit
                </Button>,
                headerTarget
              );
            })()
            : null}
          {!isFocusMode && typeof document !== 'undefined' && activePathId
            ? createPortal(
              <div className="flex items-center justify-end gap-2">
                <div className={`rounded-md border px-2 py-1 text-[10px] ${autoSaveClasses}`}>
                  {autoSaveLabel}
                </div>
                {lastRunAt && (
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-200">
                      Last run: {new Date(lastRunAt).toLocaleTimeString()}
                  </div>
                )}
                <div className="flex flex-col items-end gap-1">
                  <Label className="text-[10px] uppercase text-gray-500">Execution</Label>
                  <UnifiedSelect
                    value={executionMode}
                    onValueChange={(value: string): void => {
                      if (value !== executionMode) {
                        handleExecutionModeChange(value as 'local' | 'server');
                      }
                    }}
                    options={executionOptions}
                    className="w-[160px]"
                    triggerClassName="h-9 border-border bg-card/60 px-3 text-xs text-white"
                    disabled={isPathLocked}
                  />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Label className="text-[10px] uppercase text-gray-500">Flow</Label>
                  <UnifiedSelect
                    value={flowIntensity}
                    onValueChange={(value: string): void => {
                      if (value !== flowIntensity) {
                        handleFlowIntensityChange(value as 'off' | 'low' | 'medium' | 'high');
                      }
                    }}
                    options={flowOptions}
                    className="w-[160px]"
                    triggerClassName="h-9 border-border bg-card/60 px-3 text-xs text-white"
                    disabled={isPathLocked}
                  />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Label className="text-[10px] uppercase text-gray-500">Run Mode</Label>
                  <UnifiedSelect
                    value={runMode}
                    onValueChange={(value: string): void => {
                      if (value !== runMode) {
                        handleRunModeChange(value as 'block' | 'queue');
                      }
                    }}
                    options={runModeOptions}
                    className="w-[160px]"
                    triggerClassName="h-9 border-border bg-card/60 px-3 text-xs text-white"
                    disabled={isPathLocked}
                  />
                </div>
                <UnifiedSelect
                  value={activePathId}
                  onValueChange={(value: string): void => {
                    if (!value || value === activePathId) return;
                    handleSwitchPath(value);
                  }}
                  options={groupPaths.map((path: PathMeta) => ({
                    value: path.id,
                    label: path.name
                  }))}
                  placeholder="Switch path"
                  className="w-[320px]"
                  triggerClassName="h-9 border-border bg-card/60 px-3 text-sm text-white"
                />
                <Button
                  type="button"
                  className="h-9 rounded-md border border-border text-sm text-gray-200 hover:bg-card/60"
                  onClick={() => {
                    setRenameDraft(pathName);
                    setRenameOpen(true);
                  }}
                  disabled={!activePathId}
                  title="Rename this path"
                >
                    Rename
                </Button>
              </div>,
              document.getElementById('ai-paths-name') ?? document.body
            )
            : null}

          <SharedModal
            open={renameOpen}
            onClose={() => setRenameOpen(false)}
            title="Rename Path"
            size="sm"
            footer={
              <div className="flex w-full justify-end gap-2">
                <Button
                  type="button"
                  className="rounded-md border border-border text-sm text-gray-200 hover:bg-card/60"
                  onClick={() => setRenameOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="rounded-md border text-sm text-white hover:bg-muted/60"
                  onClick={() => {
                    const nextName = renameDraft.trim();
                    if (!nextName) {
                      toast('Path name is required.', { variant: 'error' });
                      return;
                    }
                    setPathName(nextName);
                    updateActivePathMeta(nextName);
                    setRenameOpen(false);
                    void handleSave({ pathNameOverride: nextName });
                  }}
                >
                  Save
                </Button>
              </div>
            }
          >
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">Name</Label>
                <Input
                  className="h-9 w-full rounded-md border border-border bg-card/60 px-3 text-sm text-white"
                  value={renameDraft}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setRenameDraft(event.target.value)}
                  placeholder="Path name"
                  autoFocus
                />
              </div>
            </div>
          </SharedModal>

          {!isFocusMode ? (
            <div className="flex flex-wrap items-start gap-6">
              <div className="min-w-[240px] flex-1 space-y-4" />
              <div className="min-w-[220px] space-y-4" />
            </div>
          ) : null}

          <div
            className={`grid grid-cols-1 min-h-0 transition-[grid-template-columns] duration-300 ease-in-out ${
              isFocusMode ? 'h-full gap-0 xl:grid-cols-[0px_1fr]' : 'gap-6 xl:grid-cols-[280px_1fr]'
            }`}
          >
            <div
              className={`space-y-4 transition-all duration-300 ease-in-out ${
                isFocusMode ? 'pointer-events-none opacity-0 -translate-x-2 max-h-0 overflow-hidden' : 'opacity-100'
              }`}
              aria-hidden={isFocusMode}
            >
              <CanvasSidebarWrapper
                palette={palette}
                onDragStart={(e: React.DragEvent<HTMLDivElement>, node: NodeDefinition) => { void handleDragStart(e, node); }}
                onFireTrigger={(node: AiNode) => void handleFireTrigger(node)}
                onFireTriggerPersistent={(node: AiNode) => void handleFireTriggerPersistent(node)}
                onUpdateSelectedNode={updateSelectedNode}
                onDeleteSelectedNode={handleDeleteSelectedNode}
                onRemoveEdge={handleRemoveEdge}
                onClearWires={() => void handleClearWires()}
                executionMode={executionMode}
                runStatus={runtimeRunStatus}
                onPauseRun={handlePauseActiveRun}
                onResumeRun={handleResumeActiveRun}
                onStepRun={handleStepActiveRun}
                onCancelRun={handleCancelActiveRun}
              />
              <ClusterPresetsPanelMigrated
                onPresetFromSelection={handlePresetFromSelection}
                onSavePreset={() => void handleSavePreset()}
                onApplyPreset={(preset: ClusterPreset) => void handleApplyPreset(preset)}
                onDeletePreset={(presetId: string) => void handleDeletePreset(presetId)}
                onExportPresets={handleExportPresets}
              />
              <GraphModelDebugPanel payload={lastGraphModelPayload} />
              <RunHistoryPanelMigrated
                runs={runList}
                isRefreshing={runsQuery.isFetching}
                onRefresh={() => { void runsQuery.refetch(); }}
                onOpenRunDetail={(runId: string) => { void handleOpenRunDetail(runId); }}
                onResumeRun={(runId: string, mode: 'resume' | 'replay') => void handleResumeRun(runId, mode)}
                onCancelRun={(runId: string) => void handleCancelRun(runId)}
                onRequeueDeadLetter={(runId: string) => void handleRequeueDeadLetter(runId)}
              />
            </div>
            <div className={`relative ${isFocusMode ? 'h-full min-h-0' : ''}`}>
              <CanvasBoardMigrated
                flowIntensity={flowIntensity}
                viewportClassName={isFocusMode ? 'h-full min-h-0 rounded-none border-0' : undefined}
                onRemoveEdge={handleRemoveEdge}
                onDisconnectPort={handleDisconnectPort}
                onReconnectInput={handleReconnectInput}
                onFireTrigger={(node) => void handleFireTrigger(node)}
                onPointerDownNode={handlePointerDown}
                onPointerMoveNode={handlePointerMove}
                onPointerUpNode={handlePointerUp}
                onStartConnection={handleStartConnection}
                onCompleteConnection={handleCompleteConnection}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onPanStart={handlePanStart}
                onPanMove={handlePanMove}
                onPanEnd={handlePanEnd}
                onZoomTo={zoomTo}
                onFitToNodes={fitToNodes}
                onResetView={resetView}
              />
            </div>
          </div>
          {!isFocusMode && (
            <div className="mt-4 flex justify-end">
              <Button
                className="rounded-md border border-rose-500/40 text-sm text-rose-200 hover:bg-rose-500/10"
                onClick={() => void handleDeletePath()}
                type="button"
                disabled={!activePathId}
              >
                Delete Path
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'paths' && (
        <PathsTabPanel
          paths={paths}
          pathFlagsById={pathFlagsById}
          onCreatePath={() => { void handleCreatePath(); }}
          onSaveList={() => { void savePathIndex(paths); }}          onEditPath={(pathId: string): void => {
            handleSwitchPath(pathId);
            onTabChange?.('canvas');
          }}
          onDeletePath={(pathId: string): void => {
            void handleDeletePath(pathId);
          }}
        />
      )}

      {activeTab === 'docs' && (
        <DocsTabPanel
          docsOverviewSnippet={DOCS_OVERVIEW_SNIPPET}
          docsWiringSnippet={DOCS_WIRING_SNIPPET}
          docsDescriptionSnippet={DOCS_DESCRIPTION_SNIPPET}
          docsJobsSnippet={DOCS_JOBS_SNIPPET}
          onCopyDocsWiring={() => {
            void navigator.clipboard.writeText(DOCS_WIRING_SNIPPET).then(
              () => toast('Wiring copied to clipboard.', { variant: 'success' }),
              (err) => { reportAiPathsError(err, { action: 'copyDocsWiring' }, 'Failed to copy wiring:'); toast('Failed to copy wiring.', { variant: 'error' }); }
            );
          }}
          onCopyDocsDescription={() => {
            void navigator.clipboard.writeText(DOCS_DESCRIPTION_SNIPPET).then(
              () => toast('AI Description wiring copied.', { variant: 'success' }),
              (err) => { reportAiPathsError(err, { action: 'copyDocsDescription' }, 'Failed to copy wiring:'); toast('Failed to copy wiring.', { variant: 'error' }); }
            );
          }}
          onCopyDocsJobs={() => {
            void navigator.clipboard.writeText(DOCS_JOBS_SNIPPET).then(
              () => toast('AI job wiring copied.', { variant: 'success' }),
              (err) => { reportAiPathsError(err, { action: 'copyDocsJobs' }, 'Failed to copy wiring:'); toast('Failed to copy wiring.', { variant: 'error' }); }
            );
          }}
        />
      )}

      <NodeConfigDialogMigrated
        modelOptions={modelOptions}
        updateSelectedNode={updateSelectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
        handleFetchParserSample={handleFetchParserSample}
        handleFetchUpdaterSample={handleFetchUpdaterSample}
        handleRunSimulation={(node) => void handleRunSimulation(node)}
        onSendToAi={(id, prompt) => handleSendToAi(id, prompt)}
        saveDbQueryPresets={saveDbQueryPresets}
        saveDbNodePresets={saveDbNodePresets}
        toast={toast}
        onDirtyChange={setNodeConfigDirty}
        savePathConfig={handleSave}
      />
      <RunDetailDialogWithContext />
      <PresetsDialogWithContext
        onImportPresets={() => void handleImportPresets('merge')}
        toast={toast}
        reportAiPathsError={reportAiPathsError}
      />

      <SimulationDialogMigrated
        setNodes={setNodesFromUser}
        onRunSimulation={(node) => void handleRunSimulation(node)}
      />
    </div>
  );
}
