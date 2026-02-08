'use client';

import { Trash2 } from 'lucide-react';
import React from 'react';

import { AI_PATHS_LOCAL_RUNS_KEY, parseLocalRuns } from '@/features/ai/ai-paths/lib';
import type { AiPathLocalRunRecord } from '@/features/ai/ai-paths/lib';
import { AI_PATHS_RUN_SOURCE_VALUES } from '@/features/ai/ai-paths/lib/run-sources';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { Button, ConfirmDialog, useToast } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

const formatDate = (value?: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const formatDuration = (value?: number | null): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  if (value < 1000) return `${Math.max(0, Math.round(value))}ms`;
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
};

const formatEntity = (run: AiPathLocalRunRecord): string => {
  if (!run.entityType && !run.entityId) return '-';
  if (run.entityType && run.entityId) return `${run.entityType}:${run.entityId}`;
  return run.entityType ?? run.entityId ?? '-';
};

const AI_PATHS_SOURCES = new Set<string>(AI_PATHS_RUN_SOURCE_VALUES);
const TERMINAL_LOCAL_RUN_STATUSES = new Set(['success', 'error']);

type LocalRunsPanelProps = {
  sourceFilter?: string | null;
  sourceMode?: 'include' | 'exclude';
};

const shouldIncludeRun = (
  run: AiPathLocalRunRecord,
  sourceFilter?: string | null,
  sourceMode?: 'include' | 'exclude'
): boolean => {
  if (!sourceFilter) return true;
  const sourceValue = run.source ?? null;
  if (sourceMode === 'exclude') {
    if (sourceFilter === 'ai_paths_ui') {
      return sourceValue !== null && !AI_PATHS_SOURCES.has(sourceValue);
    }
    return sourceValue !== sourceFilter;
  }
  if (sourceFilter === 'ai_paths_ui') {
    return sourceValue === null || (sourceValue !== null && AI_PATHS_SOURCES.has(sourceValue));
  }
  return sourceValue === sourceFilter;
};

const getPanelLabel = (sourceFilter?: string | null, sourceMode?: 'include' | 'exclude'): string => {
  if (sourceFilter === 'ai_paths_ui' && sourceMode === 'exclude') return 'External Local Runs';
  if (sourceFilter === 'ai_paths_ui') return 'Local Runs';
  return 'Local Runs';
};

export function LocalRunsPanel({
  sourceFilter,
  sourceMode,
}: LocalRunsPanelProps): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap({ scope: 'heavy' });
  const updateSetting = useUpdateSetting();
  const [clearScope, setClearScope] = React.useState<'terminal' | 'all' | null>(null);

  const rawRuns = settingsQuery.data?.get(AI_PATHS_LOCAL_RUNS_KEY) ?? null;
  const allRuns = React.useMemo(() => parseLocalRuns(rawRuns), [rawRuns]);
  const runs = React.useMemo(() => {
    return allRuns.filter((run: AiPathLocalRunRecord) => shouldIncludeRun(run, sourceFilter, sourceMode));
  }, [allRuns, sourceFilter, sourceMode]);

  React.useEffect((): (() => void) => {
    const handler = (event: Event): void => {
      const detail = (event as CustomEvent<{ scope?: string }>).detail;
      if (detail?.scope && detail.scope !== 'heavy') return;
      void settingsQuery.refetch();
    };
    window.addEventListener('settings:updated', handler);
    return (): void => window.removeEventListener('settings:updated', handler);
  }, [settingsQuery]);

  const metrics = React.useMemo(() => {
    const total = runs.length;
    const success = runs.filter((run: AiPathLocalRunRecord) => run.status === 'success').length;
    const error = runs.filter((run: AiPathLocalRunRecord) => run.status === 'error').length;
    const durations = runs
      .map((run: AiPathLocalRunRecord) => run.durationMs)
      .filter((value: number | null | undefined): value is number => Number.isFinite(value));
    const avgDuration = durations.length
      ? Math.round(durations.reduce((acc: number, value: number) => acc + value, 0) / durations.length)
      : null;
    const p95Duration = durations.length
      ? [...durations].sort((a: number, b: number) => a - b)[Math.max(0, Math.ceil(durations.length * 0.95) - 1)] ?? null
      : null;
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
    const lastRunAt = runs[0]?.startedAt ?? null;
    return { total, success, error, avgDuration, p95Duration, successRate, lastRunAt };
  }, [runs]);

  const handleClear = React.useCallback(async (): Promise<void> => {
    if (!clearScope) return;
    const scope = clearScope;
    const nextRuns = allRuns.filter((run: AiPathLocalRunRecord) => {
      const inPanel = shouldIncludeRun(run, sourceFilter, sourceMode);
      if (!inPanel) return true;
      if (scope === 'all') return false;
      return !TERMINAL_LOCAL_RUN_STATUSES.has(run.status);
    });

    try {
      await updateSetting.mutateAsync({
        key: AI_PATHS_LOCAL_RUNS_KEY,
        value: serializeSetting(nextRuns),
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('settings:updated', { detail: { scope: 'heavy' } }));
      }
      toast(
        scope === 'all'
          ? 'Cleared all local runs in this list.'
          : 'Cleared finished local runs in this list.',
        { variant: 'success' }
      );
      setClearScope(null);
      void settingsQuery.refetch();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to clear local runs.', { variant: 'error' });
    }
  }, [allRuns, clearScope, settingsQuery, sourceFilter, sourceMode, toast, updateSetting]);

  const panelLabel = getPanelLabel(sourceFilter, sourceMode);
  const isBusy = settingsQuery.isLoading || updateSetting.isPending;

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <div className='text-sm font-semibold text-white'>{panelLabel}</div>
          <div className='text-xs text-gray-400'>Recent local execution history and performance metrics.</div>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
            onClick={() => { void settingsQuery.refetch(); }}
            disabled={settingsQuery.isFetching}
          >
            {settingsQuery.isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            type='button'
            variant='destructive'
            className='rounded-md border px-2 py-1 text-[10px]'
            onClick={() => setClearScope('terminal')}
            disabled={isBusy}
          >
            <Trash2 className='mr-1 size-3' />
            Clear Finished
          </Button>
          <Button
            type='button'
            variant='destructive'
            className='rounded-md border px-2 py-1 text-[10px]'
            onClick={() => setClearScope('all')}
            disabled={isBusy}
          >
            <Trash2 className='mr-1 size-3' />
            Clear All
          </Button>
        </div>
      </div>

      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-5'>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Runs</div>
          <div className='mt-1 text-sm text-white'>{metrics.total}</div>
          <div className='mt-1 text-[11px] text-gray-400'>Visible in this tab</div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Success</div>
          <div className='mt-1 text-sm text-emerald-200'>{metrics.success}</div>
          <div className='mt-1 text-[11px] text-gray-400'>{metrics.successRate}% success rate</div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Errors</div>
          <div className='mt-1 text-sm text-rose-200'>{metrics.error}</div>
          <div className='mt-1 text-[11px] text-gray-400'>Failures in this list</div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Avg Duration</div>
          <div className='mt-1 text-sm text-white'>{formatDuration(metrics.avgDuration)}</div>
          <div className='mt-1 text-[11px] text-gray-400'>p95 {formatDuration(metrics.p95Duration)}</div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Last Run</div>
          <div className='mt-1 text-sm text-white'>{formatDate(metrics.lastRunAt)}</div>
          <div className='mt-1 text-[11px] text-gray-400'>Newest execution</div>
        </div>
      </div>

      {settingsQuery.isLoading ? (
        <div className='rounded-md border border-border bg-card/40 p-4 text-sm text-gray-400'>
          Loading local runs...
        </div>
      ) : runs.length === 0 ? (
        <div className='rounded-md border border-border bg-card/40 p-4 text-sm text-gray-400'>
          No local runs recorded yet.
        </div>
      ) : (
        <div className='overflow-hidden rounded-md border border-border bg-card/40'>
          <table className='w-full text-sm'>
            <thead className='bg-card/60 text-xs uppercase text-gray-400'>
              <tr>
                <th className='px-4 py-3 text-left'>Started</th>
                <th className='px-4 py-3 text-left'>Path</th>
                <th className='px-4 py-3 text-left'>Trigger</th>
                <th className='px-4 py-3 text-left'>Entity</th>
                <th className='px-4 py-3 text-left'>Status</th>
                <th className='px-4 py-3 text-left'>Duration</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border text-gray-200'>
              {runs.map((run: AiPathLocalRunRecord) => (
                <tr key={run.id} className='hover:bg-card/60'>
                  <td className='px-4 py-3 text-xs text-gray-300'>{formatDate(run.startedAt)}</td>
                  <td className='px-4 py-3 text-xs'>
                    <div className='font-medium text-gray-100'>{run.pathName ?? 'Untitled path'}</div>
                    <div className='text-[10px] text-gray-500'>{run.pathId ?? '-'}</div>
                  </td>
                  <td className='px-4 py-3 text-xs'>
                    <div className='font-medium text-gray-100'>{run.triggerLabel ?? run.triggerEvent ?? '-'}</div>
                    <div className='text-[10px] text-gray-500'>{run.triggerEvent ?? '-'}</div>
                  </td>
                  <td className='px-4 py-3 text-xs text-gray-300'>{formatEntity(run)}</td>
                  <td className='px-4 py-3 text-xs'>
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] uppercase ${
                        run.status === 'success'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                          : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                      }`}
                      title={run.error ?? undefined}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className='px-4 py-3 text-xs text-gray-300'>{formatDuration(run.durationMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={clearScope === 'terminal'}
        onOpenChange={(open: boolean): void => setClearScope(open ? 'terminal' : null)}
        onConfirm={() => { void handleClear(); }}
        title='Clear finished local runs'
        description='Delete completed local run history for this tab.'
        confirmText='Clear Finished'
        variant='destructive'
        loading={updateSetting.isPending}
      />

      <ConfirmDialog
        open={clearScope === 'all'}
        onOpenChange={(open: boolean): void => setClearScope(open ? 'all' : null)}
        onConfirm={() => { void handleClear(); }}
        title='Clear all local runs'
        description='Delete all local run records for this tab.'
        confirmText='Clear All'
        variant='destructive'
        loading={updateSetting.isPending}
      />
    </div>
  );
}
