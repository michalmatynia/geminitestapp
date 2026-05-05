'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';

import { useGraphState, useSelectionActions, useSelectionState } from '@/features/ai/public';
import { CaseResolverLinkedPreviewModal } from './CaseResolverLinkedPreviewModal';
import { CaseResolverNodeInspectorModal } from './CaseResolverNodeInspectorModal';
import {
  NodeFileWorkspaceProvider,
  type NodeFileWorkspaceContextValue,
} from './NodeFileWorkspaceContext';
import {
  useCaseResolverPageActions,
  useCaseResolverPageState,
} from '../context/CaseResolverPageContext';
import { useGraphMetadata, useSelectedNodeMeta, useSelectedEdgeMeta } from './useGraphMetadata';
import { WorkspaceCanvas } from './WorkspaceCanvas';
import { NodeListPanel } from './NodeListPanel';
import {
  AI_PATHS_UI_STATE_KEY,
} from '@/shared/lib/ai-paths/core/constants';
import {
  fetchAiPathsSettingsCached,
  invalidateAiPathsSettingsCache,
  updateAiPathsSetting,
} from '@/shared/lib/ai-paths/settings-store-client';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { parseJsonSetting } from '@/shared/utils/settings-json';
import { EmptyState } from '@/shared/ui/navigation-and-layout.public';
import { Save } from 'lucide-react';
import { AiPathsProvider, EMPTY_RUNTIME_STATE } from '@/features/ai/public';
import type { AiNode } from '@/shared/contracts/case-resolver/../ai-paths-core';

function CaseResolverCanvasWorkspaceInner(): React.JSX.Element {
  const { workspace, activeFile } = useCaseResolverPageState();
  const { onGraphChange } = useCaseResolverPageActions();
  const { nodes } = useGraphState();
  const { selectedNodeId, selectedEdgeId, configOpen } = useSelectionState();
  const { selectNode, setConfigOpen } = useSelectionActions();

  const [isLinkedPreviewOpen, setIsLinkedPreviewOpen] = useState(false);
  const [isNodeInspectorOpen, setIsNodeInspectorOpenLocal] = useState(false);

  const { normalizedNodeMeta, normalizedEdgeMeta } = useGraphMetadata(activeFile);
  const selectedNodeMeta = useSelectedNodeMeta(selectedNodeId, normalizedNodeMeta);
  const selectedEdgeMeta = useSelectedEdgeMeta(selectedEdgeId, normalizedEdgeMeta);

  const activeNodeOptions = useMemo(() => nodes
    .filter((n) => n.type === 'prompt')
    .map((n) => ({
      value: n.id,
      label: (n.title ?? n.id),
      description: (n.description ?? undefined),
    }))
    .sort((a, b) => a.label.localeCompare(b.label)), [nodes]);

  const handleManualGraphSave = useCallback((): void => {
    if (activeFile?.graph) {
      const { nodes, edges, ...rest } = activeFile.graph;
      onGraphChange({ ...rest, nodes, edges, nodeMeta: normalizedNodeMeta, edgeMeta: normalizedEdgeMeta });
    }
  }, [activeFile?.graph, normalizedEdgeMeta, normalizedNodeMeta, onGraphChange]);

  useEffect(() => {
    if (activeFile?.id) {
      const persist = async () => {
        try {
          const settingsData = await fetchAiPathsSettingsCached();
          const map = new Map(settingsData.map((item: { key: string; value: string }) => [item.key, item.value]));
          const uiState = parseJsonSetting<Record<string, unknown>>(map.get(AI_PATHS_UI_STATE_KEY) ?? '', {});
          await updateAiPathsSetting(AI_PATHS_UI_STATE_KEY, JSON.stringify({
            ...uiState, lastWorkspaceId: workspace?.id, lastFileId: activeFile.id
          }));
          invalidateAiPathsSettingsCache();
        } catch (error) {
          logClientCatch(error, { source: 'CaseResolverCanvasWorkspace', action: 'persistUiState' });
        }
      };
      void persist();
    }
  }, [activeFile?.id, workspace?.id]);

  useEffect(() => {
    if (configOpen) {
      setIsNodeInspectorOpenLocal(true);
      setConfigOpen(false);
    }
  }, [configOpen, setConfigOpen]);

  const contextValue: NodeFileWorkspaceContextValue = useMemo((): any => ({
    assetId: activeFile?.id ?? '',
    selectedNodeId,
    selectedEdgeId,
    configOpen,
    isNodeInspectorOpen,
    setIsNodeInspectorOpen: setIsNodeInspectorOpenLocal,
    isLinkedPreviewOpen,
    setIsLinkedPreviewOpen,
    nodeMetaByNode: normalizedNodeMeta,
    edgeMetaByEdge: normalizedEdgeMeta,
    handleManualSave: handleManualGraphSave,
    selectNode,
    setConfigOpen,
    selectedNodeMeta,
    selectedEdge: activeFile?.graph?.edges?.find(e => e.id === selectedEdgeId) ?? null,
    selectedEdgeJoinMode: selectedEdgeMeta.joinMode,
  }), [
    activeFile?.id, activeFile?.graph?.edges, selectedNodeId, selectedEdgeId, configOpen, isNodeInspectorOpen, 
    isLinkedPreviewOpen, normalizedNodeMeta, normalizedEdgeMeta, handleManualGraphSave, selectNode, setConfigOpen,
    selectedNodeMeta, selectedEdgeMeta,
  ]);

  return (
    <NodeFileWorkspaceProvider value={contextValue}>
      <div className='flex h-full min-h-0 flex-col gap-4'>
        <div className='flex flex-1 min-h-0 gap-4 overflow-hidden'>
          <WorkspaceCanvas onSave={handleManualGraphSave} />
          <NodeListPanel activeNodeOptions={activeNodeOptions} selectedNodeId={selectedNodeId} selectNode={selectNode} />
        </div>
        <CaseResolverNodeInspectorModal />
        <CaseResolverLinkedPreviewModal />
      </div>
    </NodeFileWorkspaceProvider>
  );
}

export function CaseResolverCanvasWorkspace(): React.JSX.Element {
  const { activeFile } = useCaseResolverPageState();

  if (!activeFile) {
    return (
      <EmptyState
        title='No active map'
        description='Select or create a relation map to start visualizing.'
        icon={<Save className='mx-auto size-12 opacity-60' />}
        className='h-full'
      />
    );
  }

  return (
    <AiPathsProvider
      initialNodes={normalizeNodes(activeFile.graph?.nodes || [])}
      initialEdges={activeFile.graph?.edges || []}
      initialLoading={false}
      initialRuntimeState={EMPTY_RUNTIME_STATE}
    >
      <CaseResolverCanvasWorkspaceInner />
    </AiPathsProvider>
  );
}

function normalizeNodes(nodes: unknown[]): AiNode[] {
  return (nodes as Array<Record<string, unknown>>).map((n) => {
    return {
      ...n,
      inputs: Array.isArray(n['inputs']) ? (n['inputs'] as string[]) : ['in'],
      outputs: Array.isArray(n['outputs']) ? (n['outputs'] as string[]) : ['out'],
      position: (n['position'] as { x: number; y: number }) || { x: 0, y: 0 },
      createdAt: (n['createdAt'] as string) || new Date().toISOString(),
      updatedAt: (n['updatedAt'] as string) || new Date().toISOString(),
    } as AiNode;
  });
}
