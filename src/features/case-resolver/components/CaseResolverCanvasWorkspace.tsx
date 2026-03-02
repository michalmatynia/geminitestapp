'use client';

import { Save, Sparkles } from 'lucide-react';
import React, { useEffect, useMemo, useState, useCallback } from 'react';

import { CanvasBoard } from '@/features/ai/ai-paths/components/canvas-board';
import { AiPathsProvider } from '@/features/ai/ai-paths/context/AiPathsProvider';
import { AI_PATHS_UI_STATE_KEY, EMPTY_RUNTIME_STATE } from '@/shared/lib/ai-paths/core/constants';
import type { AiNode, Edge as AiEdge } from '@/shared/contracts/case-resolver';
import {
  fetchAiPathsSettingsCached,
  invalidateAiPathsSettingsCache,
  updateAiPathsSetting,
} from '@/shared/lib/ai-paths/settings-store-client';
import { useGraphState } from '@/features/ai/ai-paths/context/hooks/useGraph';
import {
  useSelectionActions,
  useSelectionState,
} from '@/features/ai/ai-paths/context/hooks/useSelection';
import {
  type CaseResolverNodeMeta,
  type CaseResolverEdgeMeta,
  type CaseResolverGraph,
  DEFAULT_CASE_RESOLVER_NODE_META,
  DEFAULT_CASE_RESOLVER_EDGE_META,
} from '@/shared/contracts/case-resolver';
import { Badge, Button, Card, EmptyState } from '@/shared/ui';
import { parseJsonSetting } from '@/shared/utils/settings-json';
import { cn } from '@/shared/utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { useCaseResolverPageContext } from '../context/CaseResolverPageContext';
import { CaseResolverNodeInspectorModal } from './CaseResolverNodeInspectorModal';
import { CaseResolverLinkedPreviewModal } from './CaseResolverLinkedPreviewModal';
import {
  NodeFileWorkspaceProvider,
  type NodeFileWorkspaceContextValue,
} from './NodeFileWorkspaceContext';
import { resolvePromptConfig, renderPromptNodeTextPreview } from './case-resolver-canvas-utils';
import { isObjectRecord } from '@/shared/utils/object-utils';

function CaseResolverCanvasWorkspaceInner(): React.JSX.Element {
  const { workspace, activeFile, onGraphChange } = useCaseResolverPageContext();

  const { nodes } = useGraphState();
  const { selectedNodeId, selectedEdgeId, configOpen } = useSelectionState();
  const { selectNode, setConfigOpen } = useSelectionActions();

  const [isLinkedPreviewOpen, setIsLinkedPreviewOpen] = useState(false);
  const [isNodeInspectorOpen, setIsNodeInspectorOpenLocal] = useState(false);

  const normalizedNodeMeta = useMemo((): Record<string, CaseResolverNodeMeta> => {
    const value = activeFile?.graph?.nodeMeta;
    return isObjectRecord(value) ? value : {};
  }, [activeFile?.graph?.nodeMeta]);

  const normalizedEdgeMeta = useMemo((): Record<string, CaseResolverEdgeMeta> => {
    const value = activeFile?.graph?.edgeMeta;
    return isObjectRecord(value) ? value : {};
  }, [activeFile?.graph?.edgeMeta]);

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
      selectedNodeId ? (nodes.find((n: AiNode) => n.id === selectedNodeId) ?? null) : null,
    [nodes, selectedNodeId]
  );

  const selectedEdge = useMemo((): unknown | null => {
    const edges = activeFile?.graph?.edges;
    if (!selectedEdgeId || !Array.isArray(edges)) return null;
    return edges.find((e) => e.id === selectedEdgeId) ?? null;
  }, [activeFile?.graph?.edges, selectedEdgeId]);

  const selectedNodeMeta = useMemo(
    () =>
      selectedNodeId
        ? (normalizedNodeMeta[selectedNodeId] ?? DEFAULT_CASE_RESOLVER_NODE_META)
        : null,
    [normalizedNodeMeta, selectedNodeId]
  );

  const selectedPromptMeta = selectedNodeMeta;
  const selectedPromptSourceFile = null;
  const selectedPromptTemplate = useMemo(() => {
    if (!selectedNode) return '';
    const config = resolvePromptConfig(selectedNode);
    return config.template ?? '';
  }, [selectedNode]);
  const selectedPromptInputText = useMemo(
    () => (selectedNode ? renderPromptNodeTextPreview(selectedNode, selectedNodeMeta!) : ''),
    [selectedNode, selectedNodeMeta]
  );

  const updateSelectedPromptTemplate = useCallback((_template: string): void => {
    // No-op for now in canvas workspace
  }, []);

  const updateSelectedNodeMeta = useCallback(
    (patch: Partial<CaseResolverNodeMeta>): void => {
      if (!selectedNodeId || !activeFile?.graph) return;
      const nextMeta = {
        ...normalizedNodeMeta,
        [selectedNodeId]: { ...selectedNodeMeta, ...patch },
      };
      const { nodes, edges, ...rest } = activeFile.graph;
      const nextGraph: CaseResolverGraph = {
        ...rest,
        nodes,
        edges,
        nodeMeta: nextMeta,
      };
      onGraphChange(nextGraph);
    },
    [selectedNodeId, activeFile, normalizedNodeMeta, selectedNodeMeta, onGraphChange]
  );

  const selectedEdgeJoinMode = useMemo(
    () =>
      selectedEdgeId
        ? (normalizedEdgeMeta[selectedEdgeId] ?? DEFAULT_CASE_RESOLVER_EDGE_META).joinMode
        : DEFAULT_CASE_RESOLVER_EDGE_META.joinMode,
    [normalizedEdgeMeta, selectedEdgeId]
  );

  const updateSelectedEdgeMeta = useCallback(
    (patch: Partial<CaseResolverEdgeMeta>): void => {
      if (!selectedEdgeId || !activeFile?.graph) return;
      const currentMeta = normalizedEdgeMeta[selectedEdgeId] ?? DEFAULT_CASE_RESOLVER_EDGE_META;
      const nextMeta = { ...normalizedEdgeMeta, [selectedEdgeId]: { ...currentMeta, ...patch } };
      const { nodes, edges, ...rest } = activeFile.graph;
      const nextGraph: CaseResolverGraph = {
        ...rest,
        nodes,
        edges,
        edgeMeta: nextMeta,
      };
      onGraphChange(nextGraph);
    },
    [selectedEdgeId, activeFile, normalizedEdgeMeta, onGraphChange]
  );

  const handleManualGraphSave = useCallback((): void => {
    if (!activeFile?.graph) return;
    const { nodes, edges, ...rest } = activeFile.graph;
    const nextGraph: CaseResolverGraph = {
      ...rest,
      nodes,
      edges,
      nodeMeta: normalizedNodeMeta,
      edgeMeta: normalizedEdgeMeta,
    };
    onGraphChange(nextGraph);
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
      logClientError(error, {
        context: { source: 'CaseResolverCanvasWorkspace', action: 'persistUiState' },
      });
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
      nodes,
      edges: activeFile?.graph?.edges || [],
      selectedNodeId,
      selectedEdgeId,
      configOpen,
      newNodeType: 'prompt',
      setNewNodeType: () => {},
      isSidePanelVisible: false,
      setIsSidePanelVisible: () => {},
      isNodeInspectorOpen,
      setIsNodeInspectorOpen: setIsNodeInspectorOpenLocal,
      isLinkedPreviewOpen,
      setIsLinkedPreviewOpen,
      showNodeSelectorUnderCanvas: true,
      setShowNodeSelectorUnderCanvas: () => {},
      documentSearchScope: 'case_scope',
      setDocumentSearchScope: () => {},
      documentSearchQuery: '',
      setDocumentSearchQuery: () => {},
      selectedSearchFolderPath: null,
      setSelectedSearchFolderPath: () => {},
      expandedSearchFolderPaths: new Set(),
      setExpandedSearchFolderPaths: () => {},
      selectedSearchDocumentId: '',
      setSelectedSearchDocumentId: () => {},
      isDocumentSearchOpen: false,
      setIsDocumentSearchOpen: () => {},
      caseSearchQuery: '',
      setCaseSearchQuery: () => {},
      selectedDrillCaseId: null,
      setSelectedDrillCaseId: () => {},
      visibleCaseRows: [],
      nodeMetaByNode: normalizedNodeMeta,
      edgeMetaByEdge: normalizedEdgeMeta,
      filesById: new Map(),
      caseIdentifierLabelById: new Map(),
      documentSearchRows: [],
      folderScopedDocumentSearchRows: [],
      visibleDocumentSearchRows: [],
      folderTree: { nodesByPath: new Map(), childPathsByParent: new Map(), rootFileCount: 0 },
      compiled: {
        segments: [],
        combinedContent: '',
        prompt: '',
        outputsByNode: {},
        warnings: [],
      },
      selectedNode,
      selectedNodeMeta,
      selectedNodeFileMeta: null,
      selectedFile: selectedPromptSourceFile,
      handleManualSave: handleManualGraphSave,
      selectNode,
      setConfigOpen,
      addNode: () => {},
      updateNode: () => {},
      setNodeFileMeta: () => {},
      setNodes: () => {},
      setEdges: () => {},
      setView: () => {},
      view: { x: 0, y: 0, scale: 1 },
      canvasHostRef: { current: null },
      viewportRef: { current: null },
      canvasRef: { current: null },
      onSelectFile: () => {},
      documentSearchRef: { current: null },

      // Optional / Canvas additions
      isSidebarReady: true,
      selectedPromptMeta,
      selectedPromptSourceFile,
      selectedPromptTemplate,
      selectedPromptInputText,
      selectedPromptOutputPreview: undefined,
      selectedPromptSecondaryOutputHint: undefined,
      updateSelectedPromptTemplate,
      updateSelectedNodeMeta,
      selectedEdge: selectedEdge as AiEdge | null,
      selectedEdgeJoinMode,
      updateSelectedEdgeMeta,
      hasPendingSnapshotChanges: false,
    }),
    [
      activeFile?.id,
      activeFile?.name,
      nodes,
      activeFile?.graph?.edges,
      selectedNodeId,
      selectedEdgeId,
      configOpen,
      isNodeInspectorOpen,
      isLinkedPreviewOpen,
      normalizedNodeMeta,
      normalizedEdgeMeta,
      selectedNode,
      selectedNodeMeta,
      selectedPromptSourceFile,
      handleManualGraphSave,
      selectNode,
      setConfigOpen,
      selectedPromptMeta,
      selectedPromptTemplate,
      selectedPromptInputText,
      updateSelectedPromptTemplate,
      updateSelectedNodeMeta,
      selectedEdge,
      selectedEdgeJoinMode,
      updateSelectedEdgeMeta,
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
          <Card
            variant='subtle'
            padding='none'
            className='relative flex flex-1 flex-col overflow-hidden'
          >
            <div className='absolute left-4 top-4 z-10 flex items-center gap-2'>
              <div className='rounded-full border border-border/60 bg-card/80 px-3 py-1.5 backdrop-blur-sm'>
                <div className='flex items-center gap-2'>
                  <span className='text-[10px] font-bold uppercase tracking-wider text-gray-500'>
                    Active:
                  </span>
                  <span className='text-xs font-medium text-white'>
                    {activeFile?.name || 'Untitled Map'}
                  </span>
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
                  <span className='text-[10px] font-bold uppercase tracking-wider text-gray-500'>
                    Nodes
                  </span>
                  <Badge variant='neutral' className='bg-muted/30 text-[10px]'>
                    {activeNodeOptions.length}
                  </Badge>
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
                        <div className='truncate text-xs font-medium text-gray-200'>
                          {option.label}
                        </div>
                        {option.description && (
                          <div className='mt-1 truncate text-[10px] text-gray-500'>
                            {option.description}
                          </div>
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
