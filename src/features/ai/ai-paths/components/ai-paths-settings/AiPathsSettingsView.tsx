'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { triggers } from '@/features/ai/ai-paths/lib';
import type {
  AiNode,
  AiPathRuntimeAnalyticsSummary,
  ClusterPreset,
  NodeDefinition,
} from '@/features/ai/ai-paths/lib';
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

const formatDurationMs = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (value < 1000) return `${Math.round(value)}ms`;
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
};

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

const formatStatusLabel = (status: string): string =>
  status
    .split('_')
    .map((part: string) => (part ? `${part[0]!.toUpperCase()}${part.slice(1)}` : part))
    .join(' ');

const statusBadgeClassName = (status: string): string => {
  if (status === 'completed' || status === 'cached') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
  if (status === 'failed' || status === 'canceled' || status === 'timeout') return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
  if (status === 'queued') return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
  if (status === 'running' || status === 'polling' || status === 'waiting_callback' || status === 'advance_pending' || status === 'paused') {
    return 'border-sky-500/40 bg-sky-500/10 text-sky-200';
  }
  return 'border-border/60 bg-card/60 text-gray-300';
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
    runtimeNodeStatuses,
    runtimeEvents,
    updateSelectedNode,
    handleClearWires,
    handleClearConnectorData,
    handleClearHistory,
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

  const runtimeAnalyticsQuery = useQuery({
    queryKey: ['ai-paths', 'runtime-analytics', '24h'],
    queryFn: async (): Promise<AiPathRuntimeAnalyticsSummary> => {
      const res = await fetch('/api/ai-paths/runtime-analytics/summary?range=24h');
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Failed to fetch runtime analytics.');
      }
      const data = (await res.json()) as { summary?: AiPathRuntimeAnalyticsSummary };
      if (!data.summary) throw new Error('Missing runtime analytics payload.');
      return data.summary;
    },
    refetchInterval: 30_000,
    enabled: activeTab === 'canvas',
  });

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
        ([, status]: [string, string]) => typeof status === 'string' && status.trim().length > 0
      ),
    [runtimeNodeStatuses]
  );

  const runtimeNodeStatusCounts = useMemo((): Record<string, number> => {
    return runtimeNodeStatusEntries.reduce<Record<string, number>>(
      (acc: Record<string, number>, [, status]: [string, string]) => {
        const normalized = status.trim().toLowerCase();
        acc[normalized] = (acc[normalized] ?? 0) + 1;
        return acc;
      },
      {}
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
            entry.status === 'waiting_callback'
        )
        .slice(0, 8),
    [nodeTitleById, runtimeNodeStatusEntries]
  );

  const runtimeLogEvents = useMemo(
    () => runtimeEvents.slice(Math.max(0, runtimeEvents.length - 80)).reverse(),
    [runtimeEvents]
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
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-lg border border-border/60 bg-card/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">Runtime Analysis</div>
                    <div className="text-xs text-gray-400">
                      Live runtime state synced from node events plus Redis 24h analytics.
                    </div>
                  </div>
                  <Button
                    type="button"
                    className="rounded-md border border-border px-2 py-1 text-[10px] text-gray-200 hover:bg-card/70"
                    onClick={() => {
                      void runtimeAnalyticsQuery.refetch();
                    }}
                    disabled={runtimeAnalyticsQuery.isFetching}
                  >
                    {runtimeAnalyticsQuery.isFetching ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-md border border-border/60 bg-card/60 p-2">
                    <div className="text-[10px] uppercase text-gray-500">Run Status</div>
                    <div className="mt-1 text-sm text-white">{formatStatusLabel(runtimeRunStatus)}</div>
                  </div>
                  <div className="rounded-md border border-border/60 bg-card/60 p-2">
                    <div className="text-[10px] uppercase text-gray-500">Live Nodes</div>
                    <div className="mt-1 text-sm text-white">{runtimeNodeLiveStates.length}</div>
                  </div>
                  <div className="rounded-md border border-border/60 bg-card/60 p-2">
                    <div className="text-[10px] uppercase text-gray-500">Storage</div>
                    <div className="mt-1 text-sm text-white">{runtimeAnalyticsQuery.data?.storage ?? '—'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-300 sm:grid-cols-4">
                  {(['running', 'queued', 'polling', 'completed', 'failed', 'cached'] as const).map((status) => (
                    <div key={status} className="rounded-md border border-border/60 bg-card/60 px-2 py-1">
                      <span className="text-gray-500">{formatStatusLabel(status)}:</span>{' '}
                      <span className="text-gray-200">{runtimeNodeStatusCounts[status] ?? 0}</span>
                    </div>
                  ))}
                </div>

                {runtimeNodeLiveStates.length > 0 ? (
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase text-gray-500">Active Node States</div>
                    <div className="flex flex-wrap gap-1.5">
                      {runtimeNodeLiveStates.map((entry: { nodeId: string; title: string; status: string }) => (
                        <span
                          key={entry.nodeId}
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${statusBadgeClassName(entry.status)}`}
                          title={entry.nodeId}
                        >
                          {entry.title} · {formatStatusLabel(entry.status)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">No active runtime node statuses right now.</div>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-md border border-border/60 bg-card/60 p-2 text-[11px] text-gray-300">
                    <div className="text-[10px] uppercase text-gray-500">Runs (24h)</div>
                    <div className="mt-1 text-sm text-white">
                      {runtimeAnalyticsQuery.data?.runs.total ?? 0}
                    </div>
                    <div className="mt-1 text-gray-400">
                      Success: {formatPercent(runtimeAnalyticsQuery.data?.runs.successRate ?? 0)}
                    </div>
                  </div>
                  <div className="rounded-md border border-border/60 bg-card/60 p-2 text-[11px] text-gray-300">
                    <div className="text-[10px] uppercase text-gray-500">Run Runtime (24h)</div>
                    <div className="mt-1 text-gray-200">
                      Avg {formatDurationMs(runtimeAnalyticsQuery.data?.runs.avgDurationMs)}
                    </div>
                    <div className="mt-1 text-gray-400">
                      p95 {formatDurationMs(runtimeAnalyticsQuery.data?.runs.p95DurationMs)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-border/60 bg-card/50 p-4">
                <div>
                  <div className="text-sm font-semibold text-white">Live Runtime Log</div>
                  <div className="text-xs text-gray-400">
                    Last {runtimeLogEvents.length} runtime events from local + server execution.
                  </div>
                </div>
                <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                  {runtimeLogEvents.length > 0 ? (
                    runtimeLogEvents.map((event) => (
                      <div key={event.id} className="rounded-md border border-border/60 bg-card/60 px-2 py-1.5 text-[11px] text-gray-300">
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                          <span className="text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                          <span className={`rounded-full border px-1.5 py-0.5 ${event.level === 'error' ? 'border-rose-500/40 text-rose-200' : event.level === 'warning' ? 'border-amber-500/40 text-amber-200' : 'border-sky-500/40 text-sky-200'}`}>
                            {event.level}
                          </span>
                          <span className="rounded-full border border-border/60 px-1.5 py-0.5 text-gray-400">
                            {event.source}
                          </span>
                          {event.status ? (
                            <span className={`rounded-full border px-1.5 py-0.5 ${statusBadgeClassName(event.status)}`}>
                              {formatStatusLabel(event.status)}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-gray-200">{event.message}</div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-md border border-dashed border-border/60 px-3 py-4 text-xs text-gray-500">
                      Runtime log is empty. Fire a trigger to stream node/run events.
                    </div>
                  )}
                </div>
              </div>
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
                onClearWires={() => void handleClearWires()}
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
                presetDraft={presetDraft}
                setPresetDraft={setPresetDraft}
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
                runFilter={runFilter}
                setRunFilter={setRunFilter}
                expandedRunHistory={expandedRunHistory}
                setExpandedRunHistory={setExpandedRunHistory}
                runHistorySelection={runHistorySelection}
                setRunHistorySelection={setRunHistorySelection}
              />
            </div>
            <div className={`relative ${isFocusMode ? 'h-full min-h-0' : ''}`}>
              <CanvasBoardMigrated
                runtimeNodeStatuses={runtimeNodeStatuses}
                runtimeEvents={runtimeEvents}
                viewportClassName={isFocusMode ? 'h-full min-h-0 rounded-none border-0' : undefined}
                onFireTrigger={(node) => void handleFireTrigger(node)}
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
        openNodeId={simulationOpenNodeId}
        onClose={() => setSimulationOpenNodeId(null)}
        nodes={nodes}
        isPathLocked={isPathLocked}
      />
    </div>
  );
}
