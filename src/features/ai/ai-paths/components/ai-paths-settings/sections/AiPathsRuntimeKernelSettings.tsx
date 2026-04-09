'use client';

import React from 'react';
import { AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY, AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY } from '@/shared/lib/ai-paths';
import {
  normalizeRuntimeKernelConfigRecord,
  parseRuntimeKernelCodeObjectResolverIds,
  parseRuntimeKernelNodeTypes,
} from '@/shared/lib/ai-paths/core/runtime/runtime-kernel-config';
import {
  fetchAiPathsSettingsByKeysCached,
  invalidateAiPathsSettingsCache,
  updateAiPathsSettingsBulk,
} from '@/shared/lib/ai-paths/settings-store-client';
import { Button } from '@/shared/ui/primitives.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  useAiPathsSettingsPagePathActionsContext,
  useAiPathsSettingsPagePersistenceContext,
  useAiPathsSettingsPageWorkspaceContext,
} from '../AiPathsSettingsPageContext';
import { useGraphActions } from '@/features/ai/ai-paths/context';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

type DeferredRuntimeKernelSettingsTarget = {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
  setTimeout: (handler: () => void, timeout?: number) => number;
  clearTimeout: (handle: number) => void;
};

function scheduleDeferredCanvasViewTask(
  target: DeferredRuntimeKernelSettingsTarget,
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

export function AiPathsRuntimeKernelSettings(): React.JSX.Element {
  const {
    activePathId,
    pathConfigs,
    paths,
  } = useAiPathsSettingsPagePathActionsContext();
  const { persistPathSettings } = useAiPathsSettingsPagePersistenceContext();
  const { toast } = useAiPathsSettingsPageWorkspaceContext();
  const { setPathConfigs, setPaths } = useGraphActions();
  const notify = toast ?? (() => undefined);
  const activePath = activePathId ?? null;

  const [runtimeKernelNodeTypesDraft, setRuntimeKernelNodeTypesDraft] = React.useState<string>('');
  const [runtimeKernelPersistedNodeTypes, setRuntimeKernelPersistedNodeTypes] = React.useState<
    string[]
  >([]);
  const [runtimeKernelResolverIdsDraft, setRuntimeKernelResolverIdsDraft] =
    React.useState<string>('');
  const [runtimeKernelPersistedResolverIds, setRuntimeKernelPersistedResolverIds] = React.useState<
    string[]
  >([]);
  const [runtimeKernelLoading, setRuntimeKernelLoading] = React.useState(true);
  const [runtimeKernelSaving, setRuntimeKernelSaving] = React.useState(false);

  const [pathRuntimeKernelNodeTypesDraft, setPathRuntimeKernelNodeTypesDraft] =
    React.useState<string>('');
  const [pathRuntimeKernelPersistedNodeTypes, setPathRuntimeKernelPersistedNodeTypes] =
    React.useState<string[]>([]);
  const [pathRuntimeKernelResolverIdsDraft, setPathRuntimeKernelResolverIdsDraft] =
    React.useState<string>('');
  const [pathRuntimeKernelPersistedResolverIds, setPathRuntimeKernelPersistedResolverIds] =
    React.useState<string[]>([]);
  const [pathRuntimeKernelSaving, setPathRuntimeKernelSaving] = React.useState(false);

  const loadRuntimeKernelSettings = React.useCallback(async (): Promise<void> => {
    setRuntimeKernelLoading(true);
    try {
      const records = await fetchAiPathsSettingsByKeysCached(
        [
          AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY,
          AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY,
        ],
        { timeoutMs: 8_000 }
      );
      const settingsMap = new Map(records.map((record) => [record.key, record.value]));
      const nodeTypes =
        parseRuntimeKernelNodeTypes(settingsMap.get(AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY)) ?? [];
      const resolverIds =
        parseRuntimeKernelCodeObjectResolverIds(
          settingsMap.get(AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY)
        ) ?? [];
      setRuntimeKernelPersistedNodeTypes(nodeTypes);
      setRuntimeKernelNodeTypesDraft(nodeTypes.join(', '));
      setRuntimeKernelPersistedResolverIds(resolverIds);
      setRuntimeKernelResolverIdsDraft(resolverIds.join(', '));
    } catch (error) {
      logClientError(error);
    } finally {
      setRuntimeKernelLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      void loadRuntimeKernelSettings();
      return;
    }

    return scheduleDeferredCanvasViewTask(window, () => {
      void loadRuntimeKernelSettings();
    });
  }, [loadRuntimeKernelSettings]);

  const runtimeKernelDraftNodeTypes = React.useMemo(
    () => parseRuntimeKernelNodeTypes(runtimeKernelNodeTypesDraft) ?? [],
    [runtimeKernelNodeTypesDraft]
  );
  const runtimeKernelDraftResolverIds = React.useMemo(
    () => parseRuntimeKernelCodeObjectResolverIds(runtimeKernelResolverIdsDraft) ?? [],
    [runtimeKernelResolverIdsDraft]
  );
  const runtimeKernelSettingsDirty =
    runtimeKernelDraftNodeTypes.join(',') !== runtimeKernelPersistedNodeTypes.join(',') ||
    runtimeKernelDraftResolverIds.join(',') !== runtimeKernelPersistedResolverIds.join(',');

  React.useEffect(() => {
    if (!activePath) {
      setPathRuntimeKernelPersistedNodeTypes([]);
      setPathRuntimeKernelNodeTypesDraft('');
      setPathRuntimeKernelPersistedResolverIds([]);
      setPathRuntimeKernelResolverIdsDraft('');
      return;
    }
    const activeConfig = pathConfigs[activePath];
    const extensionsRecord = asRecord(activeConfig?.extensions);
    const runtimeKernelRecord = normalizeRuntimeKernelConfigRecord(
      extensionsRecord?.['runtimeKernel']
    );
    const nodeTypes = parseRuntimeKernelNodeTypes(runtimeKernelRecord?.['nodeTypes']) ?? [];
    const resolverIds =
      parseRuntimeKernelCodeObjectResolverIds(runtimeKernelRecord?.['codeObjectResolverIds']) ?? [];
    setPathRuntimeKernelPersistedNodeTypes(nodeTypes);
    setPathRuntimeKernelNodeTypesDraft(nodeTypes.join(', '));
    setPathRuntimeKernelPersistedResolverIds(resolverIds);
    setPathRuntimeKernelResolverIdsDraft(resolverIds.join(', '));
  }, [activePath, pathConfigs]);

  const pathRuntimeKernelDraftNodeTypes = React.useMemo(
    () => parseRuntimeKernelNodeTypes(pathRuntimeKernelNodeTypesDraft) ?? [],
    [pathRuntimeKernelNodeTypesDraft]
  );
  const pathRuntimeKernelDraftResolverIds = React.useMemo(
    () => parseRuntimeKernelCodeObjectResolverIds(pathRuntimeKernelResolverIdsDraft) ?? [],
    [pathRuntimeKernelResolverIdsDraft]
  );
  const pathRuntimeKernelSettingsDirty =
    pathRuntimeKernelDraftNodeTypes.join(',') !== pathRuntimeKernelPersistedNodeTypes.join(',') ||
    pathRuntimeKernelDraftResolverIds.join(',') !== pathRuntimeKernelPersistedResolverIds.join(',');

  const saveRuntimeKernelSettings = React.useCallback(async (): Promise<void> => {
    if (!runtimeKernelSettingsDirty || runtimeKernelSaving) return;
    setRuntimeKernelSaving(true);
    try {
      await updateAiPathsSettingsBulk([
        {
          key: AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY,
          value:
            runtimeKernelDraftNodeTypes.length > 0
              ? JSON.stringify(runtimeKernelDraftNodeTypes)
              : '',
        },
        {
          key: AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY,
          value:
            runtimeKernelDraftResolverIds.length > 0
              ? JSON.stringify(runtimeKernelDraftResolverIds)
              : '',
        },
      ]);
      invalidateAiPathsSettingsCache();
      setRuntimeKernelPersistedNodeTypes(runtimeKernelDraftNodeTypes);
      setRuntimeKernelNodeTypesDraft(runtimeKernelDraftNodeTypes.join(', '));
      setRuntimeKernelPersistedResolverIds(runtimeKernelDraftResolverIds);
      setRuntimeKernelResolverIdsDraft(runtimeKernelDraftResolverIds.join(', '));
      notify('Runtime kernel settings saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      const message =
        error instanceof Error ? error.message : 'Failed to save runtime kernel settings.';
      notify(message, { variant: 'error' });
    } finally {
      setRuntimeKernelSaving(false);
    }
  }, [
    notify,
    runtimeKernelDraftResolverIds,
    runtimeKernelDraftNodeTypes,
    runtimeKernelPersistedResolverIds,
    runtimeKernelSaving,
    runtimeKernelSettingsDirty,
  ]);

  const savePathRuntimeKernelSettings = React.useCallback(async (): Promise<void> => {
    if (!activePath || !pathRuntimeKernelSettingsDirty || pathRuntimeKernelSaving) return;
    const activeConfig = pathConfigs[activePath];
    if (!activeConfig) return;
    setPathRuntimeKernelSaving(true);
    try {
      const updatedAt = new Date().toISOString();
      const nextRuntimeKernelConfig =
        pathRuntimeKernelDraftNodeTypes.length > 0 || pathRuntimeKernelDraftResolverIds.length > 0
          ? {
            ...(pathRuntimeKernelDraftNodeTypes.length > 0
              ? { nodeTypes: pathRuntimeKernelDraftNodeTypes }
              : {}),
            ...(pathRuntimeKernelDraftResolverIds.length > 0
              ? { codeObjectResolverIds: pathRuntimeKernelDraftResolverIds }
              : {}),
          }
          : null;
      const nextExtensions = {
        ...(asRecord(activeConfig.extensions) ?? {}),
      };
      if (nextRuntimeKernelConfig) {
        nextExtensions['runtimeKernel'] = nextRuntimeKernelConfig;
      } else {
        delete nextExtensions['runtimeKernel'];
      }
      const hasExtensions = Object.keys(nextExtensions).length > 0;
      const nextConfig = {
        ...activeConfig,
        updatedAt,
        ...(hasExtensions ? { extensions: nextExtensions } : { extensions: undefined }),
      };
      const nextPaths = paths.map((p) =>
        p.id === activePath ? { ...p, updatedAt } : p
      );
      setPaths(nextPaths);
      setPathConfigs((prev) => ({
        ...prev,
        [activePath]: nextConfig,
      }));
      await persistPathSettings(nextPaths, activePath, nextConfig);
      setPathRuntimeKernelPersistedNodeTypes(pathRuntimeKernelDraftNodeTypes);
      setPathRuntimeKernelNodeTypesDraft(pathRuntimeKernelDraftNodeTypes.join(', '));
      setPathRuntimeKernelPersistedResolverIds(pathRuntimeKernelDraftResolverIds);
      setPathRuntimeKernelResolverIdsDraft(pathRuntimeKernelDraftResolverIds.join(', '));
      notify('Path runtime-kernel settings saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      const message =
        error instanceof Error ? error.message : 'Failed to save path runtime-kernel settings.';
      notify(message, { variant: 'error' });
    } finally {
      setPathRuntimeKernelSaving(false);
    }
  }, [
    activePath,
    notify,
    pathConfigs,
    pathRuntimeKernelDraftNodeTypes,
    pathRuntimeKernelDraftResolverIds,
    pathRuntimeKernelSaving,
    pathRuntimeKernelSettingsDirty,
    paths,
    persistPathSettings,
    setPathConfigs,
    setPaths,
  ]);

  return (
    <>
      <div className='flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 py-1'>
        <span className='text-[10px] uppercase tracking-wide text-cyan-100'>
            Runtime Kernel Global
        </span>
        <StatusBadge
          status='Strict Native: On (fixed)'
          variant='success'
          size='sm'
          className='h-8 border border-cyan-500/50 bg-card/60 px-2 text-[11px] text-cyan-100'
        />
        <input
          data-doc-id='canvas_runtime_kernel_node_types'
          type='text'
          value={runtimeKernelNodeTypesDraft}
          onChange={(event) => {
            setRuntimeKernelNodeTypesDraft(event.target.value);
          }}
          aria-label='Runtime kernel node types'
          placeholder='kernel nodes: constant, math'
          disabled={runtimeKernelLoading || runtimeKernelSaving}
          className='h-8 w-[220px] rounded-md border border-cyan-500/40 bg-card/60 px-2 text-[11px] text-cyan-50 outline-none ring-offset-background placeholder:text-cyan-200/50 focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2'
        />
        <input
          data-doc-id='canvas_runtime_kernel_resolver_ids'
          type='text'
          value={runtimeKernelResolverIdsDraft}
          onChange={(event) => {
            setRuntimeKernelResolverIdsDraft(event.target.value);
          }}
          aria-label='Runtime kernel resolver ids'
          placeholder='resolvers: kernel.primary, kernel.fallback'
          disabled={runtimeKernelLoading || runtimeKernelSaving}
          className='h-8 w-[260px] rounded-md border border-cyan-500/40 bg-card/60 px-2 text-[11px] text-cyan-50 outline-none ring-offset-background placeholder:text-cyan-200/50 focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2'
        />
        <Button
          data-doc-id='canvas_runtime_kernel_apply'
          type='button'
          className='h-8 rounded-md border border-cyan-400/50 px-2 text-[11px] text-cyan-100 hover:bg-cyan-500/20'
          onClick={() => {
            void saveRuntimeKernelSettings();
          }}
          disabled={
            runtimeKernelLoading || runtimeKernelSaving || !runtimeKernelSettingsDirty
          }
        >
          {runtimeKernelSaving ? 'Saving...' : 'Apply'}
        </Button>
      </div>
      <div className='flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1'>
        <span className='text-[10px] uppercase tracking-wide text-emerald-100'>
            Runtime Kernel Path
        </span>
        <StatusBadge
          status={activePath ? 'Scope: Active Path' : 'Scope: None'}
          variant='neutral'
          size='sm'
          className='h-8 border border-emerald-500/50 bg-card/60 px-2 text-[11px] text-emerald-100'
        />
        <StatusBadge
          status='Strict Native: On (fixed)'
          variant='success'
          size='sm'
          className='h-8 border border-emerald-500/50 bg-card/60 px-2 text-[11px] text-emerald-100'
        />
        <input
          data-doc-id='canvas_path_runtime_kernel_node_types'
          type='text'
          value={pathRuntimeKernelNodeTypesDraft}
          onChange={(event) => {
            setPathRuntimeKernelNodeTypesDraft(event.target.value);
          }}
          aria-label='Path runtime kernel node types'
          placeholder='path kernel nodes: template, parser'
          disabled={!activePath || pathRuntimeKernelSaving}
          className='h-8 w-[220px] rounded-md border border-emerald-500/40 bg-card/60 px-2 text-[11px] text-emerald-50 outline-none ring-offset-background placeholder:text-emerald-200/50 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2'
        />
        <input
          data-doc-id='canvas_path_runtime_kernel_resolver_ids'
          type='text'
          value={pathRuntimeKernelResolverIdsDraft}
          onChange={(event) => {
            setPathRuntimeKernelResolverIdsDraft(event.target.value);
          }}
          aria-label='Path runtime kernel resolver ids'
          placeholder='path resolvers: resolver.path'
          disabled={!activePath || pathRuntimeKernelSaving}
          className='h-8 w-[240px] rounded-md border border-emerald-500/40 bg-card/60 px-2 text-[11px] text-emerald-50 outline-none ring-offset-background placeholder:text-emerald-200/50 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2'
        />
        <Button
          data-doc-id='canvas_path_runtime_kernel_apply'
          type='button'
          className='h-8 rounded-md border border-emerald-400/50 px-2 text-[11px] text-emerald-100 hover:bg-emerald-500/20'
          onClick={() => {
            void savePathRuntimeKernelSettings();
          }}
          disabled={
            !activePath || pathRuntimeKernelSaving || !pathRuntimeKernelSettingsDirty
          }
        >
          {pathRuntimeKernelSaving ? 'Saving...' : 'Apply to Path'}
        </Button>
      </div>
    </>
  );
}
