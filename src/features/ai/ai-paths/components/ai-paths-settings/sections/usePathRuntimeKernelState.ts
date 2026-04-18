'use client';

import React from 'react';
import type { PathConfig, PathMeta } from '@/shared/contracts/ai-paths';
import {
  normalizeRuntimeKernelConfigRecord,
  parseRuntimeKernelCodeObjectResolverIds,
  parseRuntimeKernelNodeTypes,
} from '@/shared/lib/ai-paths/core/runtime/runtime-kernel-config';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

function getNextConfig(activeConfig: PathConfig, draftNodeTypes: string[], draftResolverIds: string[]): PathConfig {
  const updatedAt = new Date().toISOString();
  const hasNodeTypes = draftNodeTypes.length > 0;
  const hasResolvers = draftResolverIds.length > 0;
  const nextKernel = (hasNodeTypes || hasResolvers) ? {
    ...(hasNodeTypes ? { nodeTypes: draftNodeTypes } : {}),
    ...(hasResolvers ? { codeObjectResolverIds: draftResolverIds } : {}),
  } : null;

  const extensions = { ...(asRecord(activeConfig.extensions) ?? {}) };
  if (nextKernel) extensions['runtimeKernel'] = nextKernel;
  else delete extensions['runtimeKernel'];

  return {
    ...activeConfig,
    updatedAt,
    extensions: Object.keys(extensions).length > 0 ? extensions : undefined,
  };
}

export interface PathRuntimeKernelStateOptions {
  activePath: string | null;
  pathConfigs: Record<string, PathConfig>;
  paths: PathMeta[];
  setPaths: (paths: PathMeta[]) => void;
  setPathConfigs: React.Dispatch<React.SetStateAction<Record<string, PathConfig>>>;
  persistPathSettings: (nextPaths: PathMeta[], configId: string, config: PathConfig) => Promise<void>;
  notify: (msg: string, opts: { variant: 'success' | 'error' }) => void;
}

export interface PathRuntimeKernelState {
  saving: boolean;
  nodeTypesDraft: string;
  setNodeTypesDraft: (val: string) => void;
  resolverIdsDraft: string;
  setResolverIdsDraft: (val: string) => void;
  isDirty: boolean;
  onSave: () => Promise<void>;
}

export function usePathRuntimeKernelState({
  activePath,
  pathConfigs,
  paths,
  setPaths,
  setPathConfigs,
  persistPathSettings,
  notify,
}: PathRuntimeKernelStateOptions): PathRuntimeKernelState {
  const [nodeTypesDraft, setNodeTypesDraft] = React.useState<string>('');
  const [persistedNodeTypes, setPersistedNodeTypes] = React.useState<string[]>([]);
  const [resolverIdsDraft, setResolverIdsDraft] = React.useState<string>('');
  const [persistedResolverIds, setPersistedResolverIds] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (activePath === null) {
      setPersistedNodeTypes([]); setNodeTypesDraft('');
      setPersistedResolverIds([]); setResolverIdsDraft('');
      return;
    }
    const cfg = pathConfigs[activePath];
    const kernel = normalizeRuntimeKernelConfigRecord(asRecord(cfg?.extensions)?.['runtimeKernel']);
    const nt = parseRuntimeKernelNodeTypes(kernel?.['nodeTypes']) ?? [];
    const ri = parseRuntimeKernelCodeObjectResolverIds(kernel?.['codeObjectResolverIds']) ?? [];
    setPersistedNodeTypes(nt); setNodeTypesDraft(nt.join(', '));
    setPersistedResolverIds(ri); setResolverIdsDraft(ri.join(', '));
  }, [activePath, pathConfigs]);

  const draftNodeTypes = React.useMemo(() => parseRuntimeKernelNodeTypes(nodeTypesDraft) ?? [], [nodeTypesDraft]);
  const draftResolverIds = React.useMemo(() => parseRuntimeKernelCodeObjectResolverIds(resolverIdsDraft) ?? [], [resolverIdsDraft]);
  const isDirty = draftNodeTypes.join(',') !== persistedNodeTypes.join(',') || draftResolverIds.join(',') !== persistedResolverIds.join(',');

  const onSave = React.useCallback(async (): Promise<void> => {
    if (activePath === null || isDirty === false || saving === true) return;
    const activeConfig = pathConfigs[activePath];
    if (activeConfig === undefined) return;
    setSaving(true);
    try {
      const nextConfig = getNextConfig(activeConfig, draftNodeTypes, draftResolverIds);
      const nextPaths = paths.map((p) => (p.id === activePath ? { ...p, updatedAt: nextConfig.updatedAt } : p));
      setPaths(nextPaths);
      setPathConfigs((prev) => ({ ...prev, [activePath]: nextConfig }));
      await persistPathSettings(nextPaths, activePath, nextConfig);
      setPersistedNodeTypes(draftNodeTypes); setNodeTypesDraft(draftNodeTypes.join(', '));
      setPersistedResolverIds(draftResolverIds); setResolverIdsDraft(draftResolverIds.join(', '));
      notify('Settings saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      notify(error instanceof Error ? error.message : 'Failed to save.', { variant: 'error' });
    } finally { setSaving(false); }
  }, [activePath, isDirty, saving, pathConfigs, draftNodeTypes, draftResolverIds, paths, setPaths, setPathConfigs, persistPathSettings, notify]);

  return { saving, nodeTypesDraft, setNodeTypesDraft, resolverIdsDraft, setResolverIdsDraft, isDirty, onSave };
}
