'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { useAiPathRuntimeAnalytics } from '@/features/ai/ai-paths/hooks/useAiPathQueries';
import type {
  AiNode,
} from '@/features/ai/ai-paths/lib';
import type { PathMeta } from '@/shared/types/domain/ai-paths';
import { Button, Input, Label, AppModal, SelectSimple, useToast } from '@/shared/ui';

import { useAiPathsSettingsOrchestrator } from './AiPathsSettingsOrchestratorContext';
import { useAiPathsSettingsPageContext } from './AiPathsSettingsPageContext';
import { useAiPathsErrorReporting } from './useAiPathsErrorReporting';
import { usePathConfigHandlers } from './usePathConfigHandlers';
import { useGraphActions, useGraphState, usePersistenceActions, usePersistenceState, useRuntimeActions, useRuntimeState, useSelectionState } from '../../context';
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

export function AiPathsSettingsView(): React.JSX.Element {
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
  const { runtimeState, lastRunAt, lastError, runtimeRunStatus, runtimeNodeStatuses, runtimeEvents } = useRuntimeState();
  const { setLastError } = useRuntimeActions();

  // Domain: Graph — read from context (synced state only)
  const { activePathId, pathName, isPathLocked, isPathActive, executionMode, flowIntensity, runMode, paths, nodes } = useGraphState();
  const { setPathName, setPaths } = useGraphActions();

  // Domain: Selection — read from context
  const { nodeConfigDirty } = useSelectionState();

  // Utility — imported directly
  const { toast } = useToast();

  // Domain: Path config — read from dedicated hook
  const { handleExecutionModeChange, handleFlowIntensityChange, handleRunModeChange } = usePathConfigHandlers();

  // Domain: Error reporting — read from dedicated hook
  const { persistLastError } = useAiPathsErrorReporting(activeTab);

  const {
    handleCreatePath,
    handleDeletePath,
    handleTogglePathLock,
    handleTogglePathActive,
    handleSwitchPath,
    historyRetentionPasses,
    historyRetentionOptionsMax,
    handleHistoryRetentionChange,
    handleClearConnectorData,
    handleClearHistory,
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

  const hasHistory = Object.keys(runtimeState.history ?? {}).length > 0;

  const [isFocusModeInternal, setIsFocusModeInternal] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const isFocusMode = isFocusModeProp ?? isFocusModeInternal;
  const setIsFocusMode = onFocusModeChange ?? setIsFocusModeInternal;

  const sortedPaths = useMemo(
    () =>
      [...paths].sort((a: PathMeta, b: PathMeta): number => {
        const isTemplateName = (name: string): boolean =>
          /^new path\b/i.test(name) || /^e2e test path\b/i.test(name);
        const templateA = isTemplateName(a.name);
        const templateB = isTemplateName(b.name);
        if (templateA !== templateB) {
          return templateA ? 1 : -1;
        }
        if (a.updatedAt !== b.updatedAt) {
          return b.updatedAt.localeCompare(a.updatedAt);
        }
        return a.name.localeCompare(b.name);
      }),
    [paths]
  );
  const switchPathOptions = useMemo(() => {
    const nameCounts = sortedPaths.reduce<Map<string, number>>((acc, path: PathMeta) => {
      acc.set(path.name, (acc.get(path.name) ?? 0) + 1);
      return acc;
    }, new Map<string, number>());
    return sortedPaths.map((path: PathMeta) => {
      const isDuplicateName = (nameCounts.get(path.name) ?? 0) > 1;
      const isGenericName = /^new path\b/i.test(path.name) || /^path\b/i.test(path.name);
      const suffix =
        isDuplicateName || isGenericName
          ? ` · ${path.id.slice(-6)}`
          : '';
      return {
        value: path.id,
        label: `${path.name}${suffix}`,
      };
    });
  }, [sortedPaths]);

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
  const historyRetentionOptions = useMemo(
    () => {
      const optionCount = Math.max(historyRetentionPasses, historyRetentionOptionsMax);
      return Array.from({ length: optionCount }, (_value, index) => {
        const passes = index + 1;
        return {
          value: String(passes),
          label: `${passes} pass${passes === 1 ? '' : 'es'}`,
        };
      });
    },
    [historyRetentionOptionsMax, historyRetentionPasses]
  );

  const runtimeAnalyticsQuery = useAiPathRuntimeAnalytics('24h', activeTab === 'canvas');

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

  if (loading) {
    return <div className='text-sm text-gray-400'>Loading AI Paths...</div>;
  }

  return (
    <div className={isFocusMode ? 'h-full space-y-0' : 'space-y-6'}>
      {activeTab === 'canvas' && (
        <div className={isFocusMode ? 'h-full space-y-0' : 'space-y-6'}>
          {!isFocusMode && typeof document !== 'undefined' && renderActions
            ? createPortal(
              renderActions(
                <div className='grid w-full grid-cols-[1fr_auto_1fr] items-start gap-3'>
                  <div className='flex flex-col items-start gap-2'>
                    <div className='flex flex-wrap items-center gap-3'>
                      <Button
                        type='button'
                        className='rounded-md border border-border text-sm text-gray-300 hover:bg-card/60'
                        onClick={handleTogglePathLock}
                        disabled={!activePathId}
                        title={isPathLocked ? 'Unlock to edit nodes and connections' : 'Lock to prevent edits'}
                      >
                        {isPathLocked ? 'Unlock Path' : 'Lock Path'}
                      </Button>
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
                    </div>
                    <div className='flex flex-wrap items-center gap-3'>
                      <Button
                        type='button'
                        className={`rounded-md border text-sm ${isPathActive ? 'border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10' : 'border-rose-500/40 text-rose-200 hover:bg-rose-500/10'}`}
                        onClick={handleTogglePathActive}
                        disabled={!activePathId}
                        title={isPathActive ? 'Deactivate to stop runs' : 'Activate to allow runs'}
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
                        title={hasHistory ? 'Clear history for all nodes in this path' : 'No history recorded yet'}
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
                        {lastError.message === 'Failed to load AI Paths settings' && (
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
                  <div className='flex justify-center'>
                    {!isFocusMode && (
                      <Button
                        type='button'
                        className='rounded-md border border-border text-sm text-gray-200 hover:bg-card/60'
                        onClick={() => setIsFocusMode(true)}
                        title='Show canvas only'
                      >
                        Show
                      </Button>
                    )}
                  </div>
                  <div className='flex flex-col items-end gap-2'>
                    <Button
                      className='rounded-md border text-sm text-white hover:bg-muted/60'
                      type='button'
                      onClick={handleCreatePath}
                    >
                        New Path
                    </Button>
                    <Button
                      className='rounded-md border text-sm text-white hover:bg-muted/60'
                      onClick={() => {
                        if (nodeConfigDirty) {
                          toast(
                            'Unsaved node-config dialog changes are not included. Click "Update Node" first, then "Save Path".',
                            { variant: 'info' }
                          );
                        }
                        void savePathConfig();
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
                  type='button'
                  className='rounded-md border border-border text-sm text-gray-200 hover:bg-card/60'
                  onClick={() => setIsFocusMode(false)}
                  title='Show side panels'
                >
                  Edit
                </Button>,
                headerTarget
              );
            })()
            : null}
          {!isFocusMode && typeof document !== 'undefined' && activePathId
            ? createPortal(
              <div className='flex items-center justify-end gap-2'>
                <div className={`rounded-md border px-2 py-1 text-[10px] ${autoSaveClasses}`}>
                  {autoSaveLabel}
                </div>
                {lastRunAt && (
                  <div className='rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-200'>
                      Last run: {new Date(lastRunAt).toLocaleTimeString()}
                  </div>
                )}
                <div className='flex flex-col items-end gap-1'>
                  <Label className='text-[10px] uppercase text-gray-500'>Execution</Label>
                  <SelectSimple size='sm'
                    value={executionMode}
                    onValueChange={(value: string): void => {
                      if (value !== executionMode) {
                        handleExecutionModeChange(value as 'local' | 'server');
                      }
                    }}
                    options={executionOptions}
                    className='w-[160px]'
                    triggerClassName='h-9 border-border bg-card/60 px-3 text-xs text-white'
                    disabled={isPathLocked}
                  />
                </div>
                <div className='flex flex-col items-end gap-1'>
                  <Label className='text-[10px] uppercase text-gray-500'>Flow</Label>
                  <SelectSimple size='sm'
                    value={flowIntensity}
                    onValueChange={(value: string): void => {
                      if (value !== flowIntensity) {
                        handleFlowIntensityChange(value as 'off' | 'low' | 'medium' | 'high');
                      }
                    }}
                    options={flowOptions}
                    className='w-[160px]'
                    triggerClassName='h-9 border-border bg-card/60 px-3 text-xs text-white'
                    disabled={isPathLocked}
                  />
                </div>
                <div className='flex flex-col items-end gap-1'>
                  <Label className='text-[10px] uppercase text-gray-500'>Run Mode</Label>
                  <SelectSimple size='sm'
                    value={runMode}
                    onValueChange={(value: string): void => {
                      if (value !== runMode) {
                        handleRunModeChange(value as 'block' | 'queue');
                      }
                    }}
                    options={runModeOptions}
                    className='w-[160px]'
                    triggerClassName='h-9 border-border bg-card/60 px-3 text-xs text-white'
                    disabled={isPathLocked}
                  />
                </div>
                <div className='flex flex-col items-end gap-1'>
                  <Label className='text-[10px] uppercase text-gray-500'>History</Label>
                  <SelectSimple size='sm'
                    value={String(historyRetentionPasses)}
                    onValueChange={(value: string): void => {
                      const parsed = Number.parseInt(value, 10);
                      if (!Number.isFinite(parsed) || parsed === historyRetentionPasses) return;
                      void handleHistoryRetentionChange(parsed);
                    }}
                    options={historyRetentionOptions}
                    className='w-[140px]'
                    triggerClassName='h-9 border-border bg-card/60 px-3 text-xs text-white'
                    disabled={saving}
                  />
                </div>
                <SelectSimple size='sm'
                  value={activePathId}
                  onValueChange={(value: string): void => {
                    if (!value || value === activePathId) return;
                    handleSwitchPath(value);
                  }}
                  options={switchPathOptions}
                  placeholder='Switch path'
                  className='w-[320px]'
                  triggerClassName='h-9 border-border bg-card/60 px-3 text-sm text-white'
                />
                <Button
                  type='button'
                  className='h-9 rounded-md border border-border text-sm text-gray-200 hover:bg-card/60'
                  onClick={() => {
                    setRenameDraft(pathName);
                    setRenameOpen(true);
                  }}
                  disabled={!activePathId}
                  title='Rename this path'
                >
                    Rename
                </Button>
              </div>,
              document.getElementById('ai-paths-name') ?? document.body
            )
            : null}

          <AppModal
            open={renameOpen}
            onClose={() => setRenameOpen(false)}
            title='Rename Path'
            size='sm'
            footer={
              <div className='flex w-full justify-end gap-2'>
                <Button
                  type='button'
                  className='rounded-md border border-border text-sm text-gray-200 hover:bg-card/60'
                  onClick={() => setRenameOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type='button'
                  className='rounded-md border text-sm text-white hover:bg-muted/60'
                  onClick={() => {
                    const nextName = renameDraft.trim();
                    if (!nextName) {
                      toast('Path name is required.', { variant: 'error' });
                      return;
                    }
                    setPathName(nextName);
                    if (activePathId) {
                      const updatedAt = new Date().toISOString();
                      setPaths((prev) => prev.map((p) => p.id === activePathId ? { ...p, name: nextName, updatedAt } : p));
                    }
                    setRenameOpen(false);
                    void savePathConfig({ pathNameOverride: nextName });
                  }}
                >
                  Save
                </Button>
              </div>
            }
          >
            <div className='space-y-2'>
              <div className='space-y-1'>
                <Label className='text-xs text-gray-400'>Name</Label>
                <Input
                  className='h-9 w-full rounded-md border border-border bg-card/60 px-3 text-sm text-white'
                  value={renameDraft}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setRenameDraft(event.target.value)}
                  placeholder='Path name'
                  autoFocus
                />
              </div>
            </div>
          </AppModal>

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
              <CanvasSidebar />
              <ClusterPresetsPanel />
              <GraphModelDebugPanel />
              <RunHistoryPanel />
            </div>
            <div className={`relative ${isFocusMode ? 'h-full min-h-0' : ''}`}>
              <CanvasBoard
                viewportClassName={isFocusMode ? 'h-full min-h-0 rounded-none border-0' : undefined}
              />
            </div>
          </div>
          {!isFocusMode && <RuntimeEventLogPanel />}
          {!isFocusMode ? (
            <div className='grid gap-4 lg:grid-cols-2'>
              <div className='space-y-3 rounded-lg border border-border/60 bg-card/50 p-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <div className='text-sm font-semibold text-white'>Runtime Analysis</div>
                    <div className='text-xs text-gray-400'>
                      Live runtime state synced from node events plus Redis 24h analytics.
                    </div>
                  </div>
                  <Button
                    type='button'
                    className='rounded-md border border-border px-2 py-1 text-[10px] text-gray-200 hover:bg-card/70'
                    onClick={() => { runtimeAnalyticsQuery.refetch().catch(() => {}); }}
                    disabled={runtimeAnalyticsQuery.isFetching}
                  >
                    {runtimeAnalyticsQuery.isFetching ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>

                <div className='grid gap-2 sm:grid-cols-3'>
                  <div className='rounded-md border border-border/60 bg-card/60 p-2'>
                    <div className='text-[10px] uppercase text-gray-500'>Run Status</div>
                    <div className='mt-1 text-sm text-white'>{formatStatusLabel(runtimeRunStatus)}</div>
                  </div>
                  <div className='rounded-md border border-border/60 bg-card/60 p-2'>
                    <div className='text-[10px] uppercase text-gray-500'>Live Nodes</div>
                    <div className='mt-1 text-sm text-white'>{runtimeNodeLiveStates.length}</div>
                  </div>
                  <div className='rounded-md border border-border/60 bg-card/60 p-2'>
                    <div className='text-[10px] uppercase text-gray-500'>Storage</div>
                    <div className='mt-1 text-sm text-white'>{runtimeAnalyticsQuery.data?.storage ?? '—'}</div>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-2 text-[11px] text-gray-300 sm:grid-cols-4'>
                  {(['running', 'queued', 'polling', 'completed', 'failed', 'cached'] as const).map((status) => (
                    <div key={status} className='rounded-md border border-border/60 bg-card/60 px-2 py-1'>
                      <span className='text-gray-500'>{formatStatusLabel(status)}:</span>{' '}
                      <span className='text-gray-200'>{runtimeNodeStatusCounts[status] ?? 0}</span>
                    </div>
                  ))}
                </div>

                {runtimeNodeLiveStates.length > 0 ? (
                  <div className='space-y-1'>
                    <div className='text-[10px] uppercase text-gray-500'>Active Node States</div>
                    <div className='flex flex-wrap gap-1.5'>
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
                  <div className='text-xs text-gray-500'>No active runtime node statuses right now.</div>
                )}

                <div className='grid gap-2 sm:grid-cols-2'>
                  <div className='rounded-md border border-border/60 bg-card/60 p-2 text-[11px] text-gray-300'>
                    <div className='text-[10px] uppercase text-gray-500'>Runs (24h)</div>
                    <div className='mt-1 text-sm text-white'>
                      {runtimeAnalyticsQuery.data?.runs.total ?? 0}
                    </div>
                    <div className='mt-1 text-gray-400'>
                      Success: {formatPercent(runtimeAnalyticsQuery.data?.runs.successRate ?? 0)}
                    </div>
                  </div>
                  <div className='rounded-md border border-border/60 bg-card/60 p-2 text-[11px] text-gray-300'>
                    <div className='text-[10px] uppercase text-gray-500'>Run Runtime (24h)</div>
                    <div className='mt-1 text-gray-200'>
                      Avg {formatDurationMs(runtimeAnalyticsQuery.data?.runs.avgDurationMs)}
                    </div>
                    <div className='mt-1 text-gray-400'>
                      p95 {formatDurationMs(runtimeAnalyticsQuery.data?.runs.p95DurationMs)}
                    </div>
                  </div>
                </div>
              </div>

              <div className='space-y-3 rounded-lg border border-border/60 bg-card/50 p-4'>
                <div>
                  <div className='text-sm font-semibold text-white'>Live Runtime Log</div>
                  <div className='text-xs text-gray-400'>
                    Last {runtimeLogEvents.length} runtime events from local + server execution.
                  </div>
                </div>
                <div className='max-h-[280px] space-y-2 overflow-y-auto pr-1'>
                  {runtimeLogEvents.length > 0 ? (
                    runtimeLogEvents.map((event) => (
                      <div key={event.id} className='rounded-md border border-border/60 bg-card/60 px-2 py-1.5 text-[11px] text-gray-300'>
                        <div className='flex flex-wrap items-center gap-1.5 text-[10px]'>
                          <span className='text-gray-500'>{new Date(event.timestamp).toLocaleTimeString()}</span>
                          <span className={`rounded-full border px-1.5 py-0.5 ${event.level === 'error' ? 'border-rose-500/40 text-rose-200' : event.level === 'warning' ? 'border-amber-500/40 text-amber-200' : 'border-sky-500/40 text-sky-200'}`}>
                            {event.level}
                          </span>
                          <span className='rounded-full border border-border/60 px-1.5 py-0.5 text-gray-400'>
                            {event.source}
                          </span>
                          {event.status ? (
                            <span className={`rounded-full border px-1.5 py-0.5 ${statusBadgeClassName(event.status)}`}>
                              {formatStatusLabel(event.status)}
                            </span>
                          ) : null}
                        </div>
                        <div className='mt-1 text-gray-200'>{event.message}</div>
                      </div>
                    ))
                  ) : (
                    <div className='rounded-md border border-dashed border-border/60 px-3 py-4 text-xs text-gray-500'>
                      Runtime log is empty. Fire a trigger to stream node/run events.
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
                onClick={() => { void handleDeletePath(); }}
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
      <RunDetailDialog />
      <PresetsDialog />
      <SimulationDialog />
    </div>
  );
}
