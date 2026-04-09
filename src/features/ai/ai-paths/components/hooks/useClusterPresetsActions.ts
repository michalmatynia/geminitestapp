'use client';

import { useCallback } from 'react';

import type { AiNode, ClusterPreset, Edge } from '@/shared/contracts/ai-paths';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { BUNDLE_INPUT_PORTS, CLUSTER_PRESETS_KEY, NODE_MIN_HEIGHT, NODE_WIDTH, TEMPLATE_INPUT_PORTS, VIEW_MARGIN, createPresetId, parsePathList } from '@/shared/lib/ai-paths';
import { updateAiPathsSetting } from '@/shared/lib/ai-paths/settings-store-client';
import { useToast } from '@/shared/ui/primitives.public';

import { useCanvasActions, useCanvasRefs, useCanvasState } from '../../context/CanvasContext';
import {
  useGraphActions,
  useGraphDataState,
  usePathMetadataState,
} from '../../context/GraphContext';
import { usePresetsActions, usePresetsState } from '../../context/PresetsContext';
import { useSelectionActions, useSelectionState } from '../../context/SelectionContext';
import { useAiPathsErrorState } from '../ai-paths-settings/hooks/useAiPathsErrorState';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export function useClusterPresetsActions() {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const { clusterPresets, presetDraft, editingPresetId } = usePresetsState();
  const presetsActions = usePresetsActions();
  const { nodes, edges } = useGraphDataState();
  const { isPathLocked } = usePathMetadataState();
  const { setNodes, setEdges } = useGraphActions();
  const { selectedNodeId } = useSelectionState();
  const { selectEdge, selectNode } = useSelectionActions();
  const { view } = useCanvasState();
  const { viewportRef } = useCanvasRefs();
  const { updateView } = useCanvasActions();
  const { reportAiPathsError } = useAiPathsErrorState({ toast });

  const selectedNode = selectedNodeId
    ? (nodes.find((n: AiNode): boolean => n.id === selectedNodeId) ?? null)
    : null;

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

  const ensureNodeVisible = useCallback(
    (node: AiNode): void => {
      const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
      if (!viewport) return;
      const scale = view.scale;
      const nodeLeft = node.position.x * scale + view.x;
      const nodeTop = node.position.y * scale + view.y;
      const nodeRight = nodeLeft + NODE_WIDTH * scale;
      const nodeBottom = nodeTop + NODE_MIN_HEIGHT * scale;
      let nextX = view.x;
      let nextY = view.y;
      if (nodeLeft < VIEW_MARGIN) {
        nextX += VIEW_MARGIN - nodeLeft;
      } else if (nodeRight > viewport.width - VIEW_MARGIN) {
        nextX -= nodeRight - (viewport.width - VIEW_MARGIN);
      }
      if (nodeTop < VIEW_MARGIN) {
        nextY += VIEW_MARGIN - nodeTop;
      } else if (nodeBottom > viewport.height - VIEW_MARGIN) {
        nextY -= nodeBottom - (viewport.height - VIEW_MARGIN);
      }
      updateView({ x: nextX, y: nextY, scale });
    },
    [view, viewportRef, updateView]
  );

  const getCanvasCenterPosition = useCallback((): { x: number; y: number } => {
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) return { x: 0, y: 0 };
    return {
      x: (viewport.width / 2 - view.x) / view.scale,
      y: (viewport.height / 2 - view.y) / view.scale,
    };
  }, [view, viewportRef]);

  const handleExportPresets = useCallback((): void => {
    presetsActions.setPresetsJson(JSON.stringify(clusterPresets, null, 2));
    presetsActions.setPresetsModalOpen(true);
  }, [clusterPresets, presetsActions]);

  const handlePresetFromSelection = useCallback((): void => {
    const selectedTemplate = selectedNode?.type === 'template' ? selectedNode : null;
    const selectedBundle = selectedNode?.type === 'bundle' ? selectedNode : null;

    const findBundleForTemplate = (template: AiNode): AiNode[] => {
      const bundleEdges = edges.filter(
        (edge: Edge): boolean => edge.to === template.id && edge.toPort === 'bundle'
      );
      return bundleEdges
        .map((edge: Edge): AiNode | undefined =>
          nodes.find((node: AiNode): boolean => node.id === edge.from)
        )
        .filter((node: AiNode | undefined): node is AiNode => Boolean(node?.type === 'bundle'));
    };

    const findTemplateForBundle = (bundle: AiNode): AiNode[] => {
      const templateEdges = edges.filter(
        (edge: Edge): boolean => edge.from === bundle.id && edge.fromPort === 'bundle'
      );
      return templateEdges
        .map((edge: Edge): AiNode | undefined =>
          nodes.find((node: AiNode): boolean => node.id === edge.to)
        )
        .filter((node: AiNode | undefined): node is AiNode => Boolean(node?.type === 'template'));
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
    presetsActions.setEditingPresetId(null);
    presetsActions.setPresetDraft({
      name: presetName,
      description: bundleNode.description ?? '',
      bundlePorts: (bundleNode.config?.bundle?.includePorts ?? bundleNode.inputs).join('\n'),
      template: templateNode.config?.template?.template ?? '',
    });
    toast('Preset draft loaded from selection.', { variant: 'success' });
  }, [selectedNode, nodes, edges, presetsActions, toast]);

  const handleSavePreset = useCallback(async (): Promise<void> => {
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
    presetsActions.setClusterPresets(nextPresets);
    await saveClusterPresets(nextPresets);
    presetsActions.setEditingPresetId(null);
    toast('Cluster preset saved.', { variant: 'success' });
  }, [presetDraft, editingPresetId, clusterPresets, presetsActions, saveClusterPresets, toast]);

  const handleDeletePreset = useCallback(
    async (presetId: string): Promise<void> => {
      const target = clusterPresets.find(
        (preset: ClusterPreset): boolean => preset.id === presetId
      );
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
          presetsActions.setClusterPresets(nextPresets);
          await saveClusterPresets(nextPresets);
          toast('Preset deleted.', { variant: 'success' });
        },
      });
    },
    [clusterPresets, presetsActions, saveClusterPresets, toast, confirm]
  );

  const handleApplyPreset = useCallback(
    (preset: ClusterPreset): void => {
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
    },
    [
      isPathLocked,
      getCanvasCenterPosition,
      setNodes,
      setEdges,
      selectEdge,
      selectNode,
      ensureNodeVisible,
      toast,
    ]
  );

  return {
    handleExportPresets,
    handlePresetFromSelection,
    handleSavePreset,
    handleDeletePreset,
    handleApplyPreset,
    ConfirmationModal,
  };
}
