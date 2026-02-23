'use client';

import {
  Save,
  Sparkles,
} from 'lucide-react';
import React, { useEffect, useMemo, useState, useCallback } from 'react';

import { CanvasBoard } from '@/features/ai/ai-paths/components/canvas-board';
import { AiPathsProvider } from '@/features/ai/ai-paths/context/AiPathsProvider';
import {
  AI_PATHS_UI_STATE_KEY,
  EMPTY_RUNTIME_STATE,
  type Edge as AiEdge,
  type AiNode,
} from '@/features/ai/ai-paths/lib';
import {
  fetchAiPathsSettingsCached,
  invalidateAiPathsSettingsCache,
  updateAiPathsSetting,
} from '@/features/ai/ai-paths/lib/settings-store-client';
import {
  useGraphState,
} from '@/features/ai/ai-paths/context/hooks/useGraph';
import {
  useSelectionActions,
  useSelectionState,
} from '@/features/ai/ai-paths/context/hooks/useSelection';
import {
  type CaseResolverNodeMeta,
  type CaseResolverEdgeMeta,
  DEFAULT_CASE_RESOLVER_NODE_META,
  DEFAULT_CASE_RESOLVER_EDGE_META,
} from '@/shared/contracts/case-resolver';
import {
  Badge,
  Button,
  Card,
  EmptyState,
} from '@/shared/ui';
import { parseJsonSetting } from '@/shared/utils/settings-json';
import { cn } from '@/shared/utils';
import { logClientError } from '@/features/observability';

import {
  useCaseResolverPageContext,
} from '../context/CaseResolverPageContext';
import { CaseResolverNodeInspectorModal } from './CaseResolverNodeInspectorModal';
import { CaseResolverLinkedPreviewModal } from './CaseResolverLinkedPreviewModal';
import { NodeFileWorkspaceProvider, type NodeFileWorkspaceContextValue } from './NodeFileWorkspaceContext';
import { 
  resolvePromptConfig, 
  renderPromptNodeTextPreview, 
} from './case-resolver-canvas-utils';

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function CaseResolverCanvasWorkspaceInner(): React.JSX.Element {
  const {
    workspace,
    activeFile,
    onGraphChange,
  } = useCaseResolverPageContext();

  const { nodes } = useGraphState();
  const { selectedNodeId, selectedEdgeId, configOpen } = useSelectionState();
  const { selectNode, setConfigOpen } = useSelectionActions();

  const [isLinkedPreviewOpen, setIsLinkedPreviewOpen] = useState(false);
  const [isNodeInspectorOpen, setIsNodeInspectorOpenLocal] = useState(false);

  const normalizedNodeMeta = useMemo(
    (): Record<string, CaseResolverNodeMeta> => {
      const value = activeFile?.graph?.nodeMeta;
      return isObjectRecord(value) ? (value) : {};
    },
    [activeFile?.graph?.nodeMeta]
  );

  const normalizedEdgeMeta = useMemo(
    (): Record<string, CaseResolverEdgeMeta> => {
      const value = activeFile?.graph?.edgeMeta;
      return isObjectRecord(value) ? (value) : {};
    },
    [activeFile?.graph?.edgeMeta]
  );

  const activeNodeOptions = useMemo(
    () =>
      nodes
        .filter((n) => n.type === 'prompt')
        .map((n) => ({
          value: n.id,
          label: n.title || n.id,
          description: n.description || undefined,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [nodes]
  );

  const selectedNode = useMemo(
    (): AiNode | null =>
      selectedNodeId ? nodes.find((n: AiNode) => n.id === selectedNodeId) ?? null : null,
    [nodes, selectedNodeId]
  );

  const selectedEdge = useMemo(
    (): unknown | null => {
      const edges = activeFile?.graph?.edges;
      if (!selectedEdgeId || !Array.isArray(edges)) return null;
      return (edges).find((e) => e.id === selectedEdgeId) ?? null;
    },
    [activeFile?.graph?.edges, selectedEdgeId]
  );

  const selectedNodeMeta = useMemo(
    () => (selectedNodeId ? normalizedNodeMeta[selectedNodeId] ?? DEFAULT_CASE_RESOLVER_NODE_META : null),
    [normalizedNodeMeta, selectedNodeId]
  );

  const selectedPromptMeta = selectedNodeMeta;
  const selectedPromptSourceFile = null; 
  const selectedPromptTemplate = useMemo(
    () => {
      if (!selectedNode) return '';
      const config = resolvePromptConfig(selectedNode);
      return config.template ?? '';
    },
    [selectedNode]
  );
  const selectedPromptInputText = useMemo(
    () => (selectedNode ? renderPromptNodeTextPreview(selectedNode, selectedNodeMeta!) : ''),
    [selectedNode, selectedNodeMeta]
  );
  const selectedPromptOutputPreview = null; 
  const selectedPromptSecondaryOutputHint = false;

  const updateSelectedPromptTemplate = useCallback((template: string): void => {
    // No-op for now in canvas workspace
    console.log('Update template requested:', template);
  }, []);

  const updateSelectedNodeMeta = useCallback((patch: Partial<CaseResolverNodeMeta>): void => {
    if (!selectedNodeId || !activeFile?.graph) return;
    const nextMeta = { ...normalizedNodeMeta, [selectedNodeId]: { ...selectedNodeMeta, ...patch } };
    onGraphChange({ 
      ...activeFile.graph, 
      nodeMeta: nextMeta 
    } as unknown as any);
  }, [selectedNodeId, activeFile, normalizedNodeMeta, selectedNodeMeta, onGraphChange]);

  const selectedEdgeJoinMode = useMemo(
    () => (selectedEdgeId ? (normalizedEdgeMeta[selectedEdgeId] ?? DEFAULT_CASE_RESOLVER_EDGE_META).joinMode : DEFAULT_CASE_RESOLVER_EDGE_META.joinMode),
    [normalizedEdgeMeta, selectedEdgeId]
  );

  const updateSelectedEdgeMeta = useCallback((patch: Partial<CaseResolverEdgeMeta>): void => {
    if (!selectedEdgeId || !activeFile?.graph) return;
    const currentMeta = normalizedEdgeMeta[selectedEdgeId] ?? DEFAULT_CASE_RESOLVER_EDGE_META;
    const nextMeta = { ...normalizedEdgeMeta, [selectedEdgeId]: { ...currentMeta, ...patch } };
    onGraphChange({ 
      ...activeFile.graph, 
      edgeMeta: nextMeta 
    } as unknown as any);
  }, [selectedEdgeId, activeFile, normalizedEdgeMeta, onGraphChange]);

  const handleManualGraphSave = useCallback((): void => {
    if (!activeFile?.graph) return;
    onGraphChange({ 
      ...activeFile.graph, 
      nodeMeta: normalizedNodeMeta, 
      edgeMeta: normalizedEdgeMeta 
    } as unknown as any);
  }, [activeFile, normalizedEdgeMeta, normalizedNodeMeta, onGraphChange]);

  const handlePersistUiState = useCallback(async (): Promise<void> => {
    try {
      const settingsData = await fetchAiPathsSettingsCached();
      const map = new Map<string, string>(
        settingsData.map((item: { key: string; value: string }) => [item.key, item.value])
      );
      const uiStateRaw = map.get(AI_PATHS_UI_STATE_KEY);
      const uiState = parseJsonSetting<Record<string, unknown>>(uiStateRaw, {});
      const nextUiState = {
        ...uiState,
        lastWorkspaceId: workspace?.id,
        lastFileId: activeFile?.id,
      };
      await updateAiPathsSetting(AI_PATHS_UI_STATE_KEY, JSON.stringify(nextUiState));
      invalidateAiPathsSettingsCache();
    } catch (error) {
      logClientError(error, { context: { source: 'CaseResolverCanvasWorkspace', action: 'persistUiState' } });
    }
  }, [activeFile?.id, workspace?.id]);

  useEffect(() => {
    if (activeFile?.id) {
      void handlePersistUiState();
    }
  }, [activeFile?.id, handlePersistUiState]);

  useEffect(() => {
    if (!configOpen) return;
    setIsNodeInspectorOpenLocal(true);
    setConfigOpen(false);
  }, [configOpen, setConfigOpen, setIsNodeInspectorOpenLocal]);

  const contextValue = useMemo(
    (): NodeFileWorkspaceContextValue => ({
      assetId: activeFile?.id ?? '',
      assetName: activeFile?.name ?? '',
      handleManualSave: handleManualGraphSave,
      isSidebarReady: true,
      compiled: {
        segments: [],
        combinedContent: '',
        prompt: '',
        outputsByNode: {},
        warnings: [],
      },
      selectedNode,
      selectedPromptMeta,
      selectedPromptSourceFile,
      selectedPromptTemplate,
      selectedPromptInputText,
      selectedPromptOutputPreview,
      selectedPromptSecondaryOutputHint,
      updateSelectedPromptTemplate,
      updateSelectedNodeMeta,
      selectedEdge,
      selectedEdgeJoinMode,
      updateSelectedEdgeMeta,
      isNodeInspectorOpen,
      setIsNodeInspectorOpen: setIsNodeInspectorOpenLocal,
      isLinkedPreviewOpen,
      setIsLinkedPreviewOpen,
      hasPendingSnapshotChanges: false,
    }),
    [
      activeFile?.id,
      activeFile?.name,
      handleManualGraphSave,
      selectedNode,
      selectedPromptMeta,
      selectedPromptTemplate,
      selectedPromptInputText,
      updateSelectedPromptTemplate,
      updateSelectedNodeMeta,
      selectedEdge,
      selectedEdgeJoinMode,
      updateSelectedEdgeMeta,
      isNodeInspectorOpen,
      isLinkedPreviewOpen,
      setIsLinkedPreviewOpen,
    ]
  );

  const headerActions = (
    <div className='flex items-center gap-2'>
      <Button
        variant='outline'
        size='sm'
        onClick={handleManualGraphSave}
        className='h-8 border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/10'
      >
        <Save className='mr-2 size-3.5' />
        Save Map
      </Button>
      <Button
        variant='outline'
        size='sm'
        onClick={() => setIsLinkedPreviewOpen(true)}
        className='h-8 border-sky-500/30 text-sky-200 hover:bg-sky-500/10'
      >
        <Sparkles className='mr-2 size-3.5' />
        Preview Compiled
      </Button>
    </div>
  );

  return (
    <NodeFileWorkspaceProvider value={contextValue}>
      <div className='flex h-full min-h-0 flex-col gap-4'>
        <div className='flex flex-1 min-h-0 gap-4 overflow-hidden'>
          <Card variant='subtle' padding='none' className='relative flex flex-1 flex-col overflow-hidden'>
            <div className='absolute left-4 top-4 z-10 flex items-center gap-2'>
              <div className='rounded-full border border-border/60 bg-card/80 px-3 py-1.5 backdrop-blur-sm'>
                <div className='flex items-center gap-2'>
                  <span className='text-[10px] font-bold uppercase tracking-wider text-gray-500'>Active:</span>
                  <span className='text-xs font-medium text-white'>{activeFile?.name || 'Untitled Map'}</span>
                </div>
              </div>
              {headerActions}
            </div>

            <CanvasBoard />
          </Card>

          {activeNodeOptions.length > 0 && (
            <div className='w-72 flex flex-col gap-3'>
              <Card variant='subtle' padding='sm' className='flex-1 overflow-hidden bg-card/40'>
                <div className='mb-3 flex items-center justify-between px-1'>
                  <span className='text-[10px] font-bold uppercase tracking-wider text-gray-500'>Nodes</span>
                  <Badge variant='neutral' className='bg-muted/30 text-[10px]'>{activeNodeOptions.length}</Badge>
                </div>
                <div className='flex-1 overflow-y-auto space-y-1.5 pr-1'>
                  {activeNodeOptions.map((option) => {
                    const isSelected = selectedNodeId === option.value;
                    return (
                      <button
                        key={option.value}
                        type='button'
                        onClick={() => selectNode(option.value)}
                        className={cn(
                          'w-full rounded-md border p-2.5 text-left transition-all',
                          isSelected
                            ? 'border-blue-500/50 bg-blue-500/10'
                            : 'border-border/40 bg-card/20 hover:border-border/80 hover:bg-card/40'
                        )}
                      >
                        <div className='truncate text-xs font-medium text-gray-200'>{option.label}</div>
                        {option.description && (
                          <div className='mt-1 truncate text-[10px] text-gray-500'>{option.description}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}
        </div>

        <CaseResolverNodeInspectorModal />

        <CaseResolverLinkedPreviewModal />
      </div>
    </NodeFileWorkspaceProvider>
  );
}

export function CaseResolverCanvasWorkspace(): React.JSX.Element {
  const { activeFile } = useCaseResolverPageContext();

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
      initialEdges={(activeFile.graph?.edges || []) as unknown as AiEdge[]}
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
    } as unknown as AiNode;
  });
}
