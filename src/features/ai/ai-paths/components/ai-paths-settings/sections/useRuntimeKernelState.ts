'use client';

import React from 'react';
import { AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY, AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY } from '@/shared/lib/ai-paths/core/constants';
import {
  parseRuntimeKernelCodeObjectResolverIds,
  parseRuntimeKernelNodeTypes,
} from '@/shared/lib/ai-paths/core/runtime/runtime-kernel-config';
import {
  fetchAiPathsSettingsByKeysCached,
  invalidateAiPathsSettingsCache,
  updateAiPathsSettingsBulk,
} from '@/shared/lib/ai-paths/settings-store-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export interface RuntimeKernelState {
  loading: boolean;
  saving: boolean;
  nodeTypesDraft: string;
  setNodeTypesDraft: (val: string) => void;
  resolverIdsDraft: string;
  setDraftResolverIds: (val: string) => void;
  isDirty: boolean;
  onSave: () => Promise<void>;
}

type Target = {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
  setTimeout: (handler: () => void, timeout?: number) => number;
  clearTimeout: (handle: number) => void;
};

function scheduleTask(target: Target, onReady: () => void): () => void {
  if (typeof target.requestIdleCallback === 'function') {
    const handle = target.requestIdleCallback(() => onReady());
    return () => { if (target.cancelIdleCallback) target.cancelIdleCallback(handle); };
  }
  const handle = target.setTimeout(() => onReady(), 1);
  return () => target.clearTimeout(handle);
}

export function useRuntimeKernelState(notify: (msg: string, opts: { variant: 'success' | 'error' }) => void): RuntimeKernelState {
  const [nodeTypesDraft, setNodeTypesDraft] = React.useState<string>('');
  const [persistedNodeTypes, setPersistedNodeTypes] = React.useState<string[]>([]);
  const [resolverIdsDraft, setResolverIdsDraft] = React.useState<string>('');
  const [persistedResolverIds, setPersistedResolverIds] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const loadSettings = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const records = await fetchAiPathsSettingsByKeysCached([AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY, AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY], { timeoutMs: 8_000 });
      const settingsMap = new Map(records.map((record) => [record.key, record.value]));
      const nodeTypes = parseRuntimeKernelNodeTypes(settingsMap.get(AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY)) ?? [];
      const resolverIds = parseRuntimeKernelCodeObjectResolverIds(settingsMap.get(AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY)) ?? [];
      setPersistedNodeTypes(nodeTypes);
      setNodeTypesDraft(nodeTypes.join(', '));
      setPersistedResolverIds(resolverIds);
      setResolverIdsDraft(resolverIds.join(', '));
    } catch (error) { logClientError(error); } finally { setLoading(false); }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') { loadSettings().catch(logClientError); return () => {}; }
    return scheduleTask(window, () => { loadSettings().catch(logClientError); });
  }, [loadSettings]);

  const draftNodeTypes = React.useMemo(() => parseRuntimeKernelNodeTypes(nodeTypesDraft) ?? [], [nodeTypesDraft]);
  const draftResolverIds = React.useMemo(() => parseRuntimeKernelCodeObjectResolverIds(resolverIdsDraft) ?? [], [resolverIdsDraft]);
  const isDirty = draftNodeTypes.join(',') !== persistedNodeTypes.join(',') || draftResolverIds.join(',') !== persistedResolverIds.join(',');

  const onSave = React.useCallback(async (): Promise<void> => {
    if (isDirty === false || saving === true) return;
    setSaving(true);
    try {
      await updateAiPathsSettingsBulk([
        { key: AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY, value: draftNodeTypes.length > 0 ? JSON.stringify(draftNodeTypes) : '' },
        { key: AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY, value: draftResolverIds.length > 0 ? JSON.stringify(draftResolverIds) : '' },
      ]);
      invalidateAiPathsSettingsCache();
      setPersistedNodeTypes(draftNodeTypes);
      setNodeTypesDraft(draftNodeTypes.join(', '));
      setPersistedResolverIds(draftResolverIds);
      setResolverIdsDraft(draftResolverIds.join(', '));
      notify('Runtime kernel settings saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      notify(error instanceof Error ? error.message : 'Failed to save settings.', { variant: 'error' });
    } finally { setSaving(false); }
  }, [notify, draftResolverIds, draftNodeTypes, saving, isDirty]);

  return { loading, saving, nodeTypesDraft, setNodeTypesDraft, resolverIdsDraft, setDraftResolverIds: setResolverIdsDraft, isDirty, onSave };
}
