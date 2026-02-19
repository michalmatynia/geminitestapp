'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { useAiPathRuntimeAnalytics } from '@/features/ai/ai-paths/hooks/useAiPathQueries';
import type { AiNode } from '@/features/ai/ai-paths/lib';
import { inspectPathDependencies } from '@/features/ai/ai-paths/lib';
import {
  Button,
  SelectSimple,
  useToast,
  StatusBadge,
  LoadingState,
  type StatusVariant,
} from '@/shared/ui';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';

import { useAiPathsSettingsOrchestrator } from './AiPathsSettingsOrchestratorContext';
import { useAiPathsSettingsPageContext } from './AiPathsSettingsPageContext';
import { useAiPathsErrorReporting } from './useAiPathsErrorReporting';
import {
  useGraphActions,
  useGraphState,
  usePersistenceActions,
  usePersistenceState,
  useRuntimeActions,
  useRuntimeState,
  useSelectionActions,
  useSelectionState,
} from '../../context';
import { CanvasBoard } from '../canvas-board';
import { CanvasSidebar } from '../canvas-sidebar';
import { ClusterPresetsPanel } from '../cluster-presets-panel';
import { GraphModelDebugPanel } from '../graph-model-debug-panel';
import { NodeConfigDialog } from '../node-config-dialog';
import { PresetsDialog } from '../presets-dialog';
import { RunDetailDialog } from '../run-detail-dialog';
import { RunHistoryPanel } from '../run-history-panel';
import { RuntimeEventLogPanel } from '../runtime-event-log-panel';
import { SimulationDialog } from '../simulation-dialog';
import { DocsTabPanel, PathsTabPanel } from '../ui-panels';
import {
  EXECUTION_OPTIONS,
  FLOW_OPTIONS,
  RUN_MODE_OPTIONS,
  buildHistoryRetentionOptions,
  buildSwitchPathOptions,
  formatDurationMs,
  formatPercent,
  formatStatusLabel,
  sortPathMetas,
  statusToVariant,
} from './ai-paths-settings-view-utils';

export function AiPathsSettingsView(): React.JSX.Element {
  type PathSettingsFormState = {
    saveMode: string;
    execution: string;
    flow: string;
    runMode: string;
    strictFlowMode: string;
    dependencyReport: string;
    history: string;
  };

  const {
    activeTab,
    renderActions,
    onTabChange,
    isFocusMode: isFocusModeProp,
    onFocusModeChange,
  } = useAiPathsSettingsPageContext();
  const state = useAiPathsSettingsOrchestrator();

  // Domain: Persistence — read from context
  const { loading, saving, autoSaveStatus, autoSaveAt } = usePersistenceState();
  const { incrementLoadNonce, savePathConfig } = usePersistenceActions();

  // Domain: Runtime — read from context
  const {
    runtimeState,
    lastRunAt,
    lastError,
    runtimeRunStatus,
    runtimeNodeStatuses,
    runtimeEvents,
  } = useRuntimeState();
  const { setLastError } = useRuntimeActions();

  // Domain: Graph — read from context (synced state only)
  const {
    activePathId,
    paths,
    pathName,
    isPathLocked,
    isPathActive,
    executionMode,
    flowIntensity,
    runMode,
    strictFlowMode,
    nodes,
    edges,
  } = useGraphState();
  const { setPathName, setPaths } = useGraphActions();

  // Domain: Selection — read from context
  const {
    nodeConfigDirty,
    selectedNodeIds,
    selectionToolMode,
    selectionScopeMode,
  } = useSelectionState();
  const { setSelectionToolMode, setSelectionScopeMode } = useSelectionActions();

  // Utility — imported directly
  const { toast } = useToast();

  // Domain: Error reporting — read from dedicated hook
  const { persistLastError } = useAiPathsErrorReporting(activeTab);

  const {
    handleDeletePath,
    handleSwitchPath,
    handleTogglePathLock,
    handleTogglePathActive,
    handleExecutionModeChange,
    handleFlowIntensityChange,
    handleRunModeChange,
    handleStrictFlowModeChange,
    handleHistoryRetentionChange,
    historyRetentionPasses,
    historyRetentionOptionsMax,
    handleClearConnectorData,
    handleClearHistory,
    ConfirmationModal,
  } = state;

  // Derived from Persistence context
  const autoSaveLabel = loading
    ? 'Loading AI Paths...'
    : saving
      ? 'Saving...'
      : autoSaveStatus === 'saved'
        ? 'Saved' +
          (autoSaveAt ? ' at ' + new Date(autoSaveAt).toLocaleTimeString() : '')
        : autoSaveStatus === 'error'
          ? 'Save failed'
          : '';
  const autoSaveVariant: StatusVariant =
    autoSaveStatus === 'saved'
      ? 'success'
      : autoSaveStatus === 'error'
        ? 'error'
        : autoSaveStatus === 'saving'
          ? 'processing'
          : 'neutral';

  const hasHistory = (runtimeState.events?.length ?? 0) > 0;

  const [isFocusModeInternal, setIsFocusModeInternal] = useState(false);
  const [isPathNameEditing, setIsPathNameEditing] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const isFocusMode = isFocusModeProp ?? isFocusModeInternal;
  const setIsFocusMode = onFocusModeChange ?? setIsFocusModeInternal;

  const startPathNameEdit = (): void => {
    if (!activePathId) return;
    setRenameDraft(pathName);
    setIsPathNameEditing(true);
  };

  const cancelPathNameEdit = (): void => {
    setRenameDraft(pathName);
    setIsPathNameEditing(false);
  };

  const commitPathNameEdit = (): void => {
    if (!activePathId) {
      setIsPathNameEditing(false);
      return;
    }
    const nextName = renameDraft.trim();
    if (!nextName) {
      toast('Path name is required.', { variant: 'error' });
      cancelPathNameEdit();
      return;
    }
    if (nextName !== pathName) {
      const updatedAt = new Date().toISOString();
      setPathName(nextName);
      setPaths((prev) =>
        prev.map((p) =>
          p.id === activePathId
            ? { ...p, name: nextName, updatedAt }
            : p,
        ),
      );
      void savePathConfig({ pathNameOverride: nextName });
    }
    setIsPathNameEditing(false);
  };

  // State for dialogs
  const [runDetailOpen, setRunDetailOpen] = useState(false);
  const [runStreamPaused, setRunStreamPaused] = useState(false);
  const [runHistoryNodeId, setRunHistoryNodeId] = useState<string | null>(null);

  const [presetsModalOpen, setPresetsModalOpen] = useState(false);
  const [pathSettingsModalOpen, setPathSettingsModalOpen] = useState(false);

  const [simulationOpenNodeId, setSimulationOpenNodeId] = useState<
    string | null
  >(null);
  const simulationNode = useMemo(
    () => nodes.find((n) => n.id === simulationOpenNodeId) ?? null,
    [nodes, simulationOpenNodeId],
  );

  const { setNodes } = useGraphActions();
  const { runSimulation } = useRuntimeActions();

  const pathSwitchOptions = useMemo(
    () => buildSwitchPathOptions(sortPathMetas(paths)),
    [paths],
  );
  const historyRetentionOptions = useMemo(
    () =>
      buildHistoryRetentionOptions(
        historyRetentionPasses,
        historyRetentionOptionsMax,
      ),
    [historyRetentionOptionsMax, historyRetentionPasses],
  );

  const runtimeAnalyticsQuery = useAiPathRuntimeAnalytics(
    '24h',
    activeTab === 'canvas',
  );

  const nodeTitleById = useMemo((): Map<string, string> => {
    const map = new Map<string, string>();
    nodes.forEach((node: AiNode) => {
      map.set(node.id, node.title ?? node.id);
    });
    return map;
  }, [nodes]);

  const runtimeNodeStatusEntries = useMemo(
    () =>
      Object.entries(runtimeNodeStatuses ?? {}).filter(
        ([, status]: [string, string]) =>
          typeof status === 'string' && status.trim().length > 0,
      ),
    [runtimeNodeStatuses],
  );

  const runtimeNodeStatusCounts = useMemo((): Record<string, number> => {
    return runtimeNodeStatusEntries.reduce<Record<string, number>>(
      (acc: Record<string, number>, [, status]: [string, string]) => {
        const normalized = status.trim().toLowerCase();
        acc[normalized] = (acc[normalized] ?? 0) + 1;
        return acc;
      },
      {},
    );
  }, [runtimeNodeStatusEntries]);

  const runtimeNodeLiveStates = useMemo(
    (): Array<{ nodeId: string; title: string; status: string }> =>
      runtimeNodeStatusEntries
        .map(([nodeId, status]: [string, string]) => ({
          nodeId,
          title: nodeTitleById.get(nodeId) ?? nodeId,
          status: status.trim().toLowerCase(),
        }))
        .filter(
          (entry: { nodeId: string; title: string; status: string }) =>
            entry.status === 'running' ||
            entry.status === 'queued' ||
            entry.status === 'polling' ||
            entry.status === 'paused' ||
            entry.status === 'waiting_callback',
        )
        .slice(0, 8),
    [nodeTitleById, runtimeNodeStatusEntries],
  );

  const runtimeLogEvents = useMemo(
    () => runtimeEvents.slice(Math.max(0, runtimeEvents.length - 80)).reverse(),
    [runtimeEvents],
  );

  const dependencyReport = useMemo(
    () => inspectPathDependencies(nodes, edges),
    [nodes, edges],
  );

  if (loading) {
    return <LoadingState message='Loading AI Paths...' className='py-12' />;
  }

  return (
    <div className={isFocusMode ? 'h-full space-y-0' : 'space-y-6'}>
      {activeTab === 'canvas' && (
        <div className={isFocusMode ? 'h-full space-y-0' : 'space-y-6'}>
          {!isFocusMode && typeof document !== 'undefined' && renderActions
            ? createPortal(
              renderActions(
                <div className='flex w-full items-start'>
                  <div className='flex flex-col items-start gap-2'>
                    <div className='flex flex-wrap items-center gap-3'>
                      <Button
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
                </div>,
              ),
              document.getElementById('ai-paths-actions') ?? document.body,
            )
            : null}
          {typeof document !== 'undefined'
            ? (() => {
              return createPortal(
                <Button size='xs'
                  type='button'
                  variant='outline'
                  onClick={() => setIsFocusMode(!isFocusMode)}
                  title={isFocusMode ? 'Show side panels' : 'Show canvas only'}
                  aria-label={isFocusMode ? 'Show side panels' : 'Show canvas only'}
                  className='fixed left-1/2 top-0 z-40 h-8 w-10 -translate-x-1/2 rounded-b-lg rounded-t-none border-t-0 bg-background/90 px-0 shadow-md backdrop-blur-sm animate-in fade-in slide-in-from-top-2'
                >
                  {isFocusMode ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
                </Button>,
                document.body,
              );
            })()
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
                  <SelectSimple
                    size='sm'
                    value={activePathId ?? undefined}
                    onValueChange={(value: string): void => {
                      if (value !== activePathId) {
                        handleSwitchPath(value);
                      }
                    }}
                    options={pathSwitchOptions}
                    placeholder='Select path'
                    className='w-[240px]'
                    triggerClassName='h-9 border-border bg-card/60 px-3 text-xs text-white'
                    disabled={pathSwitchOptions.length === 0}
                  />
                </div>
              </div>,
              document.getElementById('ai-paths-name') ?? document.body,
            )
            : null}

          <div
            className={`grid grid-cols-1 min-h-0 transition-[grid-template-columns] duration-300 ease-in-out ${
              isFocusMode
                ? 'h-full gap-0 xl:grid-cols-[0px_1fr]'
                : 'gap-6 xl:grid-cols-[280px_1fr]'
            }`}
          >
            <div
              className={`space-y-4 transition-all duration-300 ease-in-out ${
                isFocusMode
                  ? 'pointer-events-none opacity-0 -translate-x-2 max-h-0 overflow-hidden'
                  : 'opacity-100'
              }`}
              aria-hidden={isFocusMode}
            >
              <CanvasSidebar />
              <ClusterPresetsPanel />
              <GraphModelDebugPanel />
              <RunHistoryPanel />
            </div>
            <div className={`relative ${isFocusMode ? 'h-full min-h-0' : ''}`}>
              <CanvasBoard
                viewportClassName={
                  isFocusMode
                    ? 'h-full min-h-0 rounded-none border-0'
                    : undefined
                }
                confirmNodeSwitch={state.confirmNodeSwitch}
              />
            </div>
          </div>
          {!isFocusMode && <RuntimeEventLogPanel />}
          {!isFocusMode ? (
            <div className='grid gap-4 lg:grid-cols-2'>
              <div className='space-y-3 rounded-lg border border-border/60 bg-card/50 p-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <div className='text-sm font-semibold text-white'>
                      Runtime Analysis
                    </div>
                    <div className='text-xs text-gray-400'>
                      Live runtime state synced from node events plus Redis 24h
                      analytics.
                    </div>
                  </div>
                  <Button
                    type='button'
                    className='rounded-md border border-border px-2 py-1 text-[10px] text-gray-200 hover:bg-card/70'
                    onClick={() => {
                      runtimeAnalyticsQuery.refetch().catch(() => {});
                    }}
                    disabled={runtimeAnalyticsQuery.isFetching}
                  >
                    {runtimeAnalyticsQuery.isFetching
                      ? 'Refreshing...'
                      : 'Refresh'}
                  </Button>
                </div>

                <div className='grid gap-2 sm:grid-cols-3'>
                  <div className='rounded-md border border-border/60 bg-card/60 p-2'>
                    <div className='text-[10px] uppercase text-gray-500'>
                      Run Status
                    </div>
                    <div className='mt-1 text-sm text-white'>
                      {formatStatusLabel(runtimeRunStatus)}
                    </div>
                  </div>
                  <div className='rounded-md border border-border/60 bg-card/60 p-2'>
                    <div className='text-[10px] uppercase text-gray-500'>
                      Live Nodes
                    </div>
                    <div className='mt-1 text-sm text-white'>
                      {runtimeNodeLiveStates.length}
                    </div>
                  </div>
                  <div className='rounded-md border border-border/60 bg-card/60 p-2'>
                    <div className='text-[10px] uppercase text-gray-500'>
                      Storage
                    </div>
                    <div className='mt-1 text-sm text-white'>
                      {runtimeAnalyticsQuery.data?.storage ?? '—'}
                    </div>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-2 text-[11px] text-gray-300 sm:grid-cols-4'>
                  {(
                    [
                      'running',
                      'queued',
                      'polling',
                      'completed',
                      'failed',
                      'cached',
                    ] as const
                  ).map((status) => (
                    <div
                      key={status}
                      className='rounded-md border border-border/60 bg-card/60 px-2 py-1'
                    >
                      <span className='text-gray-500'>
                        {formatStatusLabel(status)}:
                      </span>{' '}
                      <span className='text-gray-200'>
                        {runtimeNodeStatusCounts[status] ?? 0}
                      </span>
                    </div>
                  ))}
                </div>

                {runtimeNodeLiveStates.length > 0 ? (
                  <div className='space-y-1'>
                    <div className='text-[10px] uppercase text-gray-500'>
                      Active Node States
                    </div>
                    <div className='flex flex-wrap gap-1.5'>
                      {runtimeNodeLiveStates.map(
                        (entry: {
                          nodeId: string;
                          title: string;
                          status: string;
                        }) => (
                          <StatusBadge
                            key={entry.nodeId}
                            status={
                              entry.title +
                              ' · ' +
                              formatStatusLabel(entry.status)
                            }
                            variant={statusToVariant(entry.status)}
                            size='sm'
                            title={entry.nodeId}
                            className='font-medium'
                          />
                        ),
                      )}
                    </div>
                  </div>
                ) : (
                  <div className='text-xs text-gray-500'>
                    No active runtime node statuses right now.
                  </div>
                )}

                <div className='grid gap-2 sm:grid-cols-2'>
                  <div className='rounded-md border border-border/60 bg-card/60 p-2 text-[11px] text-gray-300'>
                    <div className='text-[10px] uppercase text-gray-500'>
                      Runs (24h)
                    </div>
                    <div className='mt-1 text-sm text-white'>
                      {runtimeAnalyticsQuery.data?.runs.total ?? 0}
                    </div>
                    <div className='mt-1 text-gray-400'>
                      Success:{' '}
                      {formatPercent(
                        runtimeAnalyticsQuery.data?.runs.successRate ?? 0,
                      )}
                    </div>
                  </div>
                  <div className='rounded-md border border-border/60 bg-card/60 p-2 text-[11px] text-gray-300'>
                    <div className='text-[10px] uppercase text-gray-500'>
                      Run Runtime (24h)
                    </div>
                    <div className='mt-1 text-gray-200'>
                      Avg{' '}
                      {formatDurationMs(
                        runtimeAnalyticsQuery.data?.runs.avgDurationMs,
                      )}
                    </div>
                    <div className='mt-1 text-gray-400'>
                      p95{' '}
                      {formatDurationMs(
                        runtimeAnalyticsQuery.data?.runs.p95DurationMs,
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className='space-y-3 rounded-lg border border-border/60 bg-card/50 p-4'>
                <div>
                  <div className='text-sm font-semibold text-white'>
                    Live Runtime Log
                  </div>
                  <div className='text-xs text-gray-400'>
                    Last {runtimeLogEvents.length} runtime events from local +
                    server execution.
                  </div>
                </div>
                <div className='max-h-[280px] space-y-2 overflow-y-auto pr-1'>
                  {runtimeLogEvents.length > 0 ? (
                    runtimeLogEvents.map((event) => (
                      <div
                        key={event.id}
                        className='rounded-md border border-border/60 bg-card/60 px-2 py-1.5 text-[11px] text-gray-300'
                      >
                        <div className='flex flex-wrap items-center gap-1.5 text-[10px]'>
                          <span className='text-gray-500'>
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                          <StatusBadge
                            status={event.level ?? 'info'}
                            variant={
                              event.level === 'error'
                                ? 'error'
                                : event.level === 'warn'
                                  ? 'warning'
                                  : 'info'
                            }
                            size='sm'
                            className='font-bold'
                          />
                          <StatusBadge
                            status={event.nodeType ?? event.type ?? 'event'}
                            variant='neutral'
                            size='sm'
                            className='border-border/60 text-gray-400'
                          />
                        </div>
                        <div className='mt-1 text-gray-200'>
                          {event.message}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className='rounded-md border border-dashed border-border/60 px-3 py-4 text-xs text-gray-500'>
                      Runtime log is empty. Fire a trigger to stream node/run
                      events.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
          {!isFocusMode && (
            <div className='mt-4 flex justify-end'>
              <Button
                className='rounded-md border border-rose-500/40 text-sm text-rose-200 hover:bg-rose-500/10'
                onClick={() => {
                  void handleDeletePath();
                }}
                type='button'
                disabled={!activePathId}
              >
                Delete Path
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'paths' && (
        <PathsTabPanel onPathOpen={() => onTabChange?.('canvas')} />
      )}

      {activeTab === 'docs' && <DocsTabPanel />}

      <NodeConfigDialog />
      <RunDetailDialog
        isOpen={runDetailOpen}
        onClose={() => setRunDetailOpen(false)}
        onSuccess={() => {}}
        loading={false}
        runDetail={null}
        runStreamStatus='idle'
        runStreamPaused={runStreamPaused}
        runEventsOverflow={false}
        runEventsBatchLimit={100}
        runHistoryNodeId={runHistoryNodeId}
        onStreamPauseToggle={setRunStreamPaused}
        onHistoryNodeSelect={setRunHistoryNodeId}
      />
      <PresetsDialog
        isOpen={presetsModalOpen}
        onClose={() => setPresetsModalOpen(false)}
        onSuccess={() => {}}
        presetsJson=''
        setPresetsJson={() => {}}
        clusterPresets={[]}
        onImport={async (mode) => {
          await state.handleImportPresets(mode).catch(() => {});
        }}
        onCopyJson={(value) => {
          navigator.clipboard
            .writeText(value)
            .then(() =>
              state.toast('Presets copied to clipboard.', {
                variant: 'success',
              }),
            )
            .catch((error: Error) => {
              state.reportAiPathsError(
                error,
                { action: 'copyPresets' },
                'Failed to copy presets:',
              );
              state.toast('Failed to copy presets.', { variant: 'error' });
            });
        }}
      />
      <SettingsPanelBuilder<PathSettingsFormState>
        open={pathSettingsModalOpen}
        onClose={() => setPathSettingsModalOpen(false)}
        title='Paths Settings'
        subtitle='Configure persistence and runtime behavior for this path.'
        size='sm'
        onSave={async () => {
          setPathSettingsModalOpen(false);
        }}
        cancelText='Close'
        showSaveButton={false}
        fields={[
          {
            key: 'saveMode',
            label: 'Save Mode',
            type: 'custom',
            render: () => autoSaveLabel ? (
              <StatusBadge
                status={autoSaveLabel}
                variant={autoSaveVariant}
                size='sm'
                className='font-medium'
              />
            ) : <span className='text-xs text-muted-foreground'>No save status</span>
          },
          {
            key: 'execution',
            label: 'Execution',
            type: 'custom',
            render: () => (
              <SelectSimple
                size='sm'
                value={executionMode}
                onValueChange={(value: string): void => {
                  if (value === executionMode) return;
                  if (value === 'local' || value === 'server') {
                    handleExecutionModeChange(value);
                  }
                }}
                options={[...EXECUTION_OPTIONS]}
                triggerClassName='h-9 border-border bg-card/60 px-3 text-xs text-white'
                disabled={isPathLocked}
              />
            )
          },
          {
            key: 'flow',
            label: 'Flow',
            type: 'custom',
            render: () => (
              <SelectSimple
                size='sm'
                value={flowIntensity}
                onValueChange={(value: string): void => {
                  if (value === flowIntensity) return;
                  if (
                    value === 'off' ||
                    value === 'low' ||
                    value === 'medium' ||
                    value === 'high'
                  ) {
                    handleFlowIntensityChange(value);
                  }
                }}
                options={[...FLOW_OPTIONS]}
                triggerClassName='h-9 border-border bg-card/60 px-3 text-xs text-white'
                disabled={isPathLocked}
              />
            )
          },
          {
            key: 'runMode',
            label: 'Run Mode',
            type: 'custom',
            render: () => (
              <SelectSimple
                size='sm'
                value={runMode}
                onValueChange={(value: string): void => {
                  if (value === runMode) return;
                  if (value === 'manual' || value === 'automatic' || value === 'step') {
                    handleRunModeChange(value);
                  }
                }}
                options={[...RUN_MODE_OPTIONS]}
                triggerClassName='h-9 border-border bg-card/60 px-3 text-xs text-white'
                disabled={isPathLocked}
              />
            )
          },
          {
            key: 'strictFlowMode',
            label: 'Strict Flow',
            type: 'custom',
            render: () => (
              <div className='space-y-2'>
                <div className='flex items-center justify-between gap-2'>
                  <StatusBadge
                    status={strictFlowMode ? 'Strict mode: on' : 'Strict mode: off'}
                    variant={strictFlowMode ? 'success' : 'warning'}
                    size='sm'
                    className='font-medium'
                  />
                  <Button
                    type='button'
                    className='h-8 rounded-md border border-border px-2 text-[11px] text-gray-200 hover:bg-card/70'
                    onClick={() => {
                      handleStrictFlowModeChange(!strictFlowMode);
                    }}
                    disabled={isPathLocked}
                  >
                    {strictFlowMode ? 'Disable' : 'Enable'}
                  </Button>
                </div>
                <div className='text-[11px] text-gray-400'>
                  When enabled, runtime blocks implicit fallback inputs and uses only wired/contextual data.
                </div>
              </div>
            )
          },
          {
            key: 'dependencyReport',
            label: 'Dependency Inspector',
            type: 'custom',
            render: () => (
              <div className='space-y-2'>
                <div className='flex flex-wrap items-center gap-2 text-[11px]'>
                  <StatusBadge
                    status={`Warnings: ${dependencyReport.warnings}`}
                    variant={dependencyReport.warnings > 0 ? 'warning' : 'neutral'}
                    size='sm'
                  />
                  <StatusBadge
                    status={`Errors: ${dependencyReport.errors}`}
                    variant={dependencyReport.errors > 0 ? 'error' : 'neutral'}
                    size='sm'
                  />
                  <StatusBadge
                    status={dependencyReport.strictReady ? 'Strict-ready' : 'Action needed'}
                    variant={dependencyReport.strictReady ? 'success' : 'warning'}
                    size='sm'
                  />
                </div>
                {dependencyReport.risks.length > 0 ? (
                  <div className='max-h-[200px] space-y-1 overflow-y-auto rounded-md border border-border/60 bg-card/40 p-2'>
                    {dependencyReport.risks.map((risk) => (
                      <div
                        key={risk.id}
                        className='rounded-md border border-border/50 bg-card/60 px-2 py-1.5 text-[11px]'
                      >
                        <div className='font-medium text-gray-100'>
                          {risk.nodeTitle} · {risk.category}
                        </div>
                        <div className='mt-0.5 text-gray-400'>{risk.message}</div>
                        <div className='mt-0.5 text-gray-300'>Fix: {risk.recommendation}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-[11px] text-emerald-200'>
                    No hidden-dependency risks detected for current wiring.
                  </div>
                )}
              </div>
            )
          },
          {
            key: 'history',
            label: 'History Retention',
            type: 'custom',
            render: () => (
              <SelectSimple
                size='sm'
                value={String(historyRetentionPasses)}
                onValueChange={(value: string): void => {
                  const parsed = Number.parseInt(value, 10);
                  if (!Number.isFinite(parsed) || parsed === historyRetentionPasses) {
                    return;
                  }
                  void handleHistoryRetentionChange(parsed);
                }}
                options={historyRetentionOptions}
                triggerClassName='h-9 border-border bg-card/60 px-3 text-xs text-white'
                disabled={saving}
              />
            )
          }
        ]}
        values={{
          saveMode: autoSaveLabel,
          execution: executionMode,
          flow: flowIntensity,
          runMode,
          strictFlowMode: strictFlowMode ? 'on' : 'off',
          dependencyReport: dependencyReport.strictReady ? 'strict-ready' : 'issues',
          history: String(historyRetentionPasses),
        }}
        onChange={() => {}}
      />
      <SimulationDialog
        isOpen={Boolean(simulationOpenNodeId)}
        onClose={() => setSimulationOpenNodeId(null)}
        onSuccess={() => {}}
        item={simulationNode}
        isPathLocked={isPathLocked}
        onSimulate={async (node, entityId) => {
          const runNode: AiNode = {
            ...node,
            config: {
              ...node.config,
              simulation: {
                ...node.config?.simulation,
                productId: entityId,
                entityId,
                entityType: node.config?.simulation?.entityType ?? 'product',
              },
            },
          };
          setNodes((prev: AiNode[]): AiNode[] =>
            prev.map((n: AiNode): AiNode => (n.id === node.id ? runNode : n)),
          );
          void savePathConfig({
            silent: true,
            includeNodeConfig: true,
            force: true,
            nodeOverride: runNode,
          });
          void runSimulation(runNode);
        }}
        onConfigChange={async (nodeId, entityId) => {
          setNodes((prev: AiNode[]): AiNode[] => {
            const next = prev.map(
              (node: AiNode): AiNode =>
                node.id === nodeId
                  ? {
                    ...node,
                    config: {
                      ...node.config,
                      simulation: {
                        ...node.config?.simulation,
                        productId: entityId,
                        entityId,
                        entityType:
                            node.config?.simulation?.entityType ?? 'product',
                      },
                    },
                  }
                  : node,
            );
            const persistedNode = next.find(
              (node: AiNode): boolean => node.id === nodeId,
            );
            void savePathConfig({
              silent: true,
              includeNodeConfig: true,
              force: true,
              ...(persistedNode ? { nodeOverride: persistedNode } : {}),
            });
            return next;
          });
        }}
      />
      <ConfirmationModal />
    </div>
  );
}
