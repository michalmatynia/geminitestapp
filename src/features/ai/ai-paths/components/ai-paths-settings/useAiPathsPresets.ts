'use client';

import React, { useCallback, useEffect } from 'react';

import { useGraphActions } from '@/features/ai/ai-paths/context/GraphContext';
import { usePresetsActions, usePresetsState } from '@/features/ai/ai-paths/context/PresetsContext';
import { useSelectionActions } from '@/features/ai/ai-paths/context/SelectionContext';
import type {
  AiNode,
  ClusterPreset,
  DbNodePreset,
  DbQueryPreset,
  Edge,
} from '@/shared/contracts/ai-paths';
import type { Toast } from '@/shared/contracts/ui/base';
import { ConfirmConfig } from '@/shared/hooks/ui/useConfirm';
import {
  BUNDLE_INPUT_PORTS,
  CLUSTER_PRESETS_KEY,
  DB_NODE_PRESETS_KEY,
  DB_QUERY_PRESETS_KEY,
  TEMPLATE_INPUT_PORTS,
} from '@/shared/lib/ai-paths/core/constants';
import { createPresetId, parsePathList } from '@/shared/lib/ai-paths/core/utils';
import { updateAiPathsSetting } from '@/shared/lib/ai-paths/settings-store-client';

import type { ClusterPresetDraft } from '../cluster-presets-panel';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type UseAiPathsPresetsArgs = {
  nodes: AiNode[];
  edges: Edge[];
  selectedNode: AiNode | null;
  isPathLocked: boolean;
  ensureNodeVisible: (node: AiNode) => void;
  getCanvasCenterPosition: () => { x: number; y: number };
  toast: Toast;
  confirm: (config: ConfirmConfig) => void;
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string
  ) => void;
};

export interface AiPathsPresets {
  clusterPresets: ClusterPreset[];
  setClusterPresets: React.Dispatch<React.SetStateAction<ClusterPreset[]>>;
  saveClusterPresets: (nextPresets: ClusterPreset[]) => Promise<void>;
  dbQueryPresets: DbQueryPreset[];
  setDbQueryPresets: React.Dispatch<React.SetStateAction<DbQueryPreset[]>>;
  saveDbQueryPresets: (nextPresets: DbQueryPreset[]) => Promise<void>;
  dbNodePresets: DbNodePreset[];
  setDbNodePresets: React.Dispatch<React.SetStateAction<DbNodePreset[]>>;
  saveDbNodePresets: (nextPresets: DbNodePreset[]) => Promise<void>;
  editingPresetId: string | null;
  presetDraft: ClusterPresetDraft;
  setPresetDraft: React.Dispatch<React.SetStateAction<ClusterPresetDraft>>;
  handleSavePreset: () => Promise<void>;
  handleLoadPreset: (preset: ClusterPreset) => void;
  handleDeletePreset: (presetId: string) => Promise<void>;
  handleApplyPreset: (preset: ClusterPreset) => void;
  handleExportPresets: () => void;
  handleImportPresets: (mode: 'merge' | 'replace') => Promise<void>;
  handlePresetFromSelection: () => void;
  handleResetPresetDraft: () => void;
  presetsModalOpen: boolean;
  setPresetsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  presetsJson: string;
  setPresetsJson: React.Dispatch<React.SetStateAction<string>>;
  expandedPaletteGroups: Set<string>;
  setExpandedPaletteGroups: React.Dispatch<React.SetStateAction<Set<string>>>;
  paletteCollapsed: boolean;
  setPaletteCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  togglePaletteGroup: (title: string) => void;
  normalizeDbQueryPreset: (raw: Partial<DbQueryPreset>) => DbQueryPreset;
  normalizeDbNodePreset: (raw: Partial<DbNodePreset>) => DbNodePreset;
}

export function useAiPathsPresets({
  nodes,
  edges,
  selectedNode,
  isPathLocked,
  ensureNodeVisible,
  getCanvasCenterPosition,
  toast,
  confirm,
  reportAiPathsError,
}: UseAiPathsPresetsArgs): AiPathsPresets {
  const presetsState = usePresetsState();
  const presetsActions = usePresetsActions();
  const { setNodes, setEdges } = useGraphActions();
  const { selectNode, selectEdge } = useSelectionActions();

  const clusterPresets = presetsState.clusterPresets;
  const dbQueryPresets = presetsState.dbQueryPresets;
  const dbNodePresets = presetsState.dbNodePresets;
  const editingPresetId = presetsState.editingPresetId;
  const presetDraft = presetsState.presetDraft;
  const presetsModalOpen = presetsState.presetsModalOpen;
  const presetsJson = presetsState.presetsJson;
  const expandedPaletteGroups = presetsState.expandedPaletteGroups;
  const paletteCollapsed = presetsState.paletteCollapsed;

  const setClusterPresets = useCallback<React.Dispatch<React.SetStateAction<ClusterPreset[]>>>(
    (next): void => {
      presetsActions.setClusterPresets(next);
    },
    [presetsActions]
  );

  const setDbQueryPresets = useCallback<React.Dispatch<React.SetStateAction<DbQueryPreset[]>>>(
    (next): void => {
      presetsActions.setDbQueryPresets(next);
    },
    [presetsActions]
  );

  const setDbNodePresets = useCallback<React.Dispatch<React.SetStateAction<DbNodePreset[]>>>(
    (next): void => {
      presetsActions.setDbNodePresets(next);
    },
    [presetsActions]
  );

  const setPresetDraft = useCallback<React.Dispatch<React.SetStateAction<ClusterPresetDraft>>>(
    (next): void => {
      presetsActions.setPresetDraft(next);
    },
    [presetsActions]
  );

  const setPresetsModalOpen = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(
    (next): void => {
      const resolved = typeof next === 'function' ? next(presetsState.presetsModalOpen) : next;
      presetsActions.setPresetsModalOpen(resolved);
    },
    [presetsActions, presetsState.presetsModalOpen]
  );

  const setPresetsJson = useCallback<React.Dispatch<React.SetStateAction<string>>>(
    (next): void => {
      const resolved = typeof next === 'function' ? next(presetsState.presetsJson) : next;
      presetsActions.setPresetsJson(resolved);
    },
    [presetsActions, presetsState.presetsJson]
  );

  const setExpandedPaletteGroups = useCallback<React.Dispatch<React.SetStateAction<Set<string>>>>(
    (next): void => {
      presetsActions.setExpandedPaletteGroups(next);
    },
    [presetsActions]
  );

  const setPaletteCollapsed = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(
    (next): void => {
      const resolved = typeof next === 'function' ? next(presetsState.paletteCollapsed) : next;
      presetsActions.setPaletteCollapsed(resolved);
    },
    [presetsActions, presetsState.paletteCollapsed]
  );

  const setEditingPresetId = useCallback(
    (id: string | null): void => {
      presetsActions.setEditingPresetId(id);
    },
    [presetsActions]
  );

  const handleResetPresetDraft = useCallback((): void => {
    presetsActions.resetPresetDraft();
  }, [presetsActions]);

  const saveClusterPresets = useCallback(
    async (nextPresets: ClusterPreset[]): Promise<void> => {
      try {
        await updateAiPathsSetting(CLUSTER_PRESETS_KEY, JSON.stringify(nextPresets));
      } catch (error: unknown) {
        logClientError(error);
        reportAiPathsError(error, { action: 'saveClusterPresets' }, 'Failed to save presets:');
        toast('Failed to save cluster presets.', { variant: 'error' });
      }
    },
    [reportAiPathsError, toast]
  );

  const saveDbQueryPresets = useCallback(
    async (nextPresets: DbQueryPreset[]): Promise<void> => {
      try {
        await updateAiPathsSetting(DB_QUERY_PRESETS_KEY, JSON.stringify(nextPresets));
      } catch (error: unknown) {
        logClientError(error);
        reportAiPathsError(
          error,
          { action: 'saveDbQueryPresets' },
          'Failed to save query presets:'
        );
        toast('Failed to save query presets.', { variant: 'error' });
        throw error;
      }
    },
    [reportAiPathsError, toast]
  );

  const saveDbNodePresets = useCallback(
    async (nextPresets: DbNodePreset[]): Promise<void> => {
      try {
        await updateAiPathsSetting(DB_NODE_PRESETS_KEY, JSON.stringify(nextPresets));
      } catch (error: unknown) {
        logClientError(error);
        reportAiPathsError(
          error,
          { action: 'saveDbNodePresets' },
          'Failed to save database presets:'
        );
        toast('Failed to save database presets.', { variant: 'error' });
      }
    },
    [reportAiPathsError, toast]
  );

  useEffect(() => {
    presetsActions.setPresetPersistenceHandlers({
      saveDbQueryPresets,
      saveDbNodePresets,
    });
    return () => {
      presetsActions.setPresetPersistenceHandlers({});
    };
  }, [presetsActions, saveDbNodePresets, saveDbQueryPresets]);

  const normalizePreset = presetsActions.normalizeClusterPreset;
  const normalizeDbQueryPreset = presetsActions.normalizeDbQueryPreset;
  const normalizeDbNodePreset = presetsActions.normalizeDbNodePreset;
  const togglePaletteGroup = presetsActions.togglePaletteGroup;

  const handleSavePreset = async (): Promise<void> => {
    const name = presetDraft.name.trim();
    if (!name) {
      toast('Preset name is required.', { variant: 'error' });
      return;
    }
    const now = new Date().toISOString();
    const bundlePorts = parsePathList(presetDraft.bundlePorts);
    const template = presetDraft.template.trim();
    const nextPresets = [...clusterPresets];
    if (editingPresetId) {
      const index = nextPresets.findIndex(
        (preset: ClusterPreset): boolean => preset.id === editingPresetId
      );
      const existing = nextPresets[index];
      if (index >= 0 && existing) {
        nextPresets[index] = {
          ...existing,
          name,
          description: presetDraft.description.trim(),
          bundlePorts,
          template,
          updatedAt: now,
        };
      }
    } else {
      nextPresets.push({
        id: createPresetId(),
        name,
        description: presetDraft.description.trim(),
        bundlePorts,
        template,
        createdAt: now,
        updatedAt: now,
      });
    }
    setClusterPresets(nextPresets);
    await saveClusterPresets(nextPresets);
    setEditingPresetId(null);
    toast('Cluster preset saved.', { variant: 'success' });
  };

  const handleLoadPreset = (preset: ClusterPreset): void => {
    setEditingPresetId(preset.id);
    setPresetDraft({
      name: preset.name,
      description: preset.description ?? '',
      bundlePorts: preset.bundlePorts.join('\n'),
      template: preset.template ?? '',
    });
  };

  const handleDeletePreset = async (presetId: string): Promise<void> => {
    const target = clusterPresets.find((preset: ClusterPreset): boolean => preset.id === presetId);
    if (!target) return;

    confirm({
      title: 'Delete Preset?',
      message: `Are you sure you want to delete preset "${target.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        const nextPresets = clusterPresets.filter(
          (preset: ClusterPreset): boolean => preset.id !== presetId
        );
        setClusterPresets(nextPresets);
        await saveClusterPresets(nextPresets);
        if (editingPresetId === presetId) {
          handleResetPresetDraft();
        }
        toast('Preset deleted.', { variant: 'success' });
      },
    });
  };

  const handleApplyPreset = (preset: ClusterPreset): void => {
    if (isPathLocked) {
      toast('This path is locked. Unlock it to apply presets.', { variant: 'info' });
      return;
    }
    const base = getCanvasCenterPosition();
    const now = new Date().toISOString();
    const bundleNode: AiNode = {
      id: `node-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: null,
      data: {},
      type: 'bundle',
      title: `${preset.name} Bundle`,
      description: preset.description || 'Cluster preset bundle.',
      inputs: BUNDLE_INPUT_PORTS,
      outputs: ['bundle'],
      position: { x: base.x, y: base.y },
      config: {
        bundle: {
          includePorts: preset.bundlePorts ?? [],
        },
      },
    };
    const templateNode: AiNode = {
      id: `node-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: null,
      data: {},
      type: 'template',
      title: `${preset.name} Template`,
      description: 'Preset template prompt.',
      inputs: TEMPLATE_INPUT_PORTS,
      outputs: ['prompt'],
      position: { x: base.x + 320, y: base.y },
      config: {
        template: {
          template: preset.template ?? '',
        },
      },
    };
    const edge: Edge = {
      id: `edge-${Math.random().toString(36).slice(2, 8)}`,
      from: bundleNode.id,
      to: templateNode.id,
      fromPort: 'bundle',
      toPort: 'bundle',
    };
    setNodes((prev: AiNode[]): AiNode[] => [...prev, bundleNode, templateNode]);
    setEdges((prev: Edge[]): Edge[] => [...prev, edge]);
    selectEdge(null);
    selectNode(templateNode.id);
    ensureNodeVisible(templateNode);
    toast(`Preset applied: ${preset.name}`, { variant: 'success' });
  };

  const handleExportPresets = (): void => {
    const payload = JSON.stringify(clusterPresets, null, 2);
    setPresetsJson(payload);
    setPresetsModalOpen(true);
  };

  const handleImportPresets = async (mode: 'merge' | 'replace'): Promise<void> => {
    if (!presetsJson.trim()) {
      toast('Paste presets JSON to import.', { variant: 'error' });
      return;
    }

    const performImport = async () => {
      try {
        const parsed = JSON.parse(presetsJson) as unknown;
        const list = (
          Array.isArray(parsed)
            ? parsed
            : parsed &&
                typeof parsed === 'object' &&
                'presets' in (parsed as Record<string, unknown>)
              ? (parsed as Record<string, unknown>)['presets']
              : null
        ) as unknown[] | null;
        if (!list) {
          toast('Invalid presets JSON. Expected an array.', { variant: 'error' });
          return;
        }
        const normalized = list.map(
          (item: unknown): ClusterPreset => normalizePreset(item as Partial<ClusterPreset>)
        );
        let nextPresets = mode === 'replace' ? [] : [...clusterPresets];
        const existingIds = new Set(nextPresets.map((preset: ClusterPreset): string => preset.id));
        const merged = normalized.map((preset: ClusterPreset): ClusterPreset => {
          if (existingIds.has(preset.id)) {
            return { ...preset, id: createPresetId(), updatedAt: new Date().toISOString() };
          }
          return preset;
        });
        nextPresets = [...nextPresets, ...merged];
        setClusterPresets(nextPresets);
        await saveClusterPresets(nextPresets);
        toast('Presets imported.', { variant: 'success' });
      } catch (error: unknown) {
        logClientError(error);
        reportAiPathsError(error, { action: 'importPresets' }, 'Failed to import presets:');
        toast('Failed to import presets. Check JSON format.', { variant: 'error' });
      }
    };

    if (mode === 'replace') {
      confirm({
        title: 'Replace Presets?',
        message: 'Replace existing presets? This cannot be undone.',
        confirmText: 'Replace All',
        isDangerous: true,
        onConfirm: performImport,
      });
      return;
    }

    await performImport();
  };

  const handlePresetFromSelection = (): void => {
    const selectedTemplate = selectedNode?.type === 'template' ? selectedNode : null;
    const selectedBundle = selectedNode?.type === 'bundle' ? selectedNode : null;

    const findBundleForTemplate = (template: AiNode): AiNode[] => {
      const bundleEdges = edges.filter(
        (edge: Edge): boolean => edge.to === template.id && edge.toPort === 'bundle'
      );
      const bundleNodes = bundleEdges
        .map((edge: Edge): AiNode | undefined =>
          nodes.find((node: AiNode): boolean => node.id === edge.from)
        )
        .filter((node: AiNode | undefined): node is AiNode => Boolean(node?.type === 'bundle'));
      return bundleNodes;
    };

    const findTemplateForBundle = (bundle: AiNode): AiNode[] => {
      const templateEdges = edges.filter(
        (edge: Edge): boolean => edge.from === bundle.id && edge.fromPort === 'bundle'
      );
      const templateNodes = templateEdges
        .map((edge: Edge): AiNode | undefined =>
          nodes.find((node: AiNode): boolean => node.id === edge.to)
        )
        .filter((node: AiNode | undefined): node is AiNode => Boolean(node?.type === 'template'));
      return templateNodes;
    };

    let templateNode: AiNode | null = selectedTemplate;
    let bundleNode: AiNode | null = selectedBundle;

    if (selectedTemplate && !bundleNode) {
      const bundles = findBundleForTemplate(selectedTemplate);
      if (bundles.length > 1) {
        toast('Multiple bundles connected. Using the first one.', { variant: 'info' });
      }
      bundleNode = bundles[0] ?? null;
    }

    if (selectedBundle && !templateNode) {
      const templates = findTemplateForBundle(selectedBundle);
      if (templates.length > 1) {
        toast('Multiple templates connected. Using the first one.', { variant: 'info' });
      }
      templateNode = templates[0] ?? null;
    }

    if (!templateNode || !bundleNode) {
      toast('Select a connected Bundle + Template pair.', { variant: 'error' });
      return;
    }

    const presetName =
      (templateNode.title || '').replace(/template/i, '').trim() || 'Cluster Preset';
    setEditingPresetId(null);
    setPresetDraft({
      name: presetName,
      description: bundleNode.description ?? '',
      bundlePorts: (bundleNode.config?.bundle?.includePorts ?? bundleNode.inputs).join('\n'),
      template: templateNode.config?.template?.template ?? '',
    });
    toast('Preset draft loaded from selection.', { variant: 'success' });
  };

  return {
    clusterPresets,
    setClusterPresets,
    saveClusterPresets,
    dbQueryPresets,
    setDbQueryPresets,
    saveDbQueryPresets,
    dbNodePresets,
    setDbNodePresets,
    saveDbNodePresets,
    editingPresetId,
    presetDraft,
    setPresetDraft,
    handleSavePreset,
    handleLoadPreset,
    handleDeletePreset,
    handleApplyPreset,
    handleExportPresets,
    handleImportPresets,
    handlePresetFromSelection,
    handleResetPresetDraft,
    presetsModalOpen,
    setPresetsModalOpen,
    presetsJson,
    setPresetsJson,
    expandedPaletteGroups,
    setExpandedPaletteGroups,
    paletteCollapsed,
    setPaletteCollapsed,
    togglePaletteGroup,
    normalizeDbQueryPreset,
    normalizeDbNodePreset,
  };
}
