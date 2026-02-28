'use client';

import { FileCode2 } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';

import { CanvasBoard } from '@/features/ai/ai-paths/components/canvas-board';
import { AiPathsProvider } from '@/features/ai/ai-paths/context';
import { type AiNode } from '@/shared/contracts/case-resolver';
import { type CaseResolverNodeFileSnapshot } from '@/shared/contracts/case-resolver';
import { EmptyState, Card } from '@/shared/ui';

import { useCaseResolverPageContext } from '../context/CaseResolverPageContext';
import { parseNodeFileSnapshot, serializeNodeFileSnapshot } from '../settings';
import { buildNode, createNodeId } from './case-resolver-canvas-utils';
import { CaseResolverNodeInspectorModal } from './CaseResolverNodeInspectorModal';
import { NodeFileWorkspaceProvider, useNodeFileWorkspaceContext } from './NodeFileWorkspaceContext';
import {
  useNodeFileWorkspaceState,
  type UseNodeFileWorkspaceStateProps,
} from '../hooks/useNodeFileWorkspaceState';
import { NodeFilePanel } from './NodeFilePanel';
import { NodeFileDocumentSearchPanel } from './NodeFileDocumentSearchPanel';

// ─── inner canvas component ───────────────────────────────────────────────────

const DRAG_FILE_ID_TYPE = 'application/case-resolver-file-id';
export type NodeFileSnapshotPersistOptions = {
  persistNow?: boolean;
  persistToast?: string;
  source?: string;
};

function CaseResolverNodeFileWorkspaceInner(): React.JSX.Element {
  const {
    nodes,
    selectedNodeId,
    isNodeInspectorOpen,
    newNodeType,
    setNewNodeType,
    isSidePanelVisible,
    setIsNodeInspectorOpen,
    selectedNodeFileMeta,
    selectedFile,
    addNode,
    setNodeFileMeta,
    filesById,
    selectNode,
    view,
    viewportRef,
    onSelectFile,
  } = useNodeFileWorkspaceContext();

  const resolveCanvasCenter = useCallback((): { x: number; y: number } => {
    const rect = viewportRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.width / 2 : 400;
    const centerY = rect ? rect.height / 2 : 300;
    const safeScale = view.scale || 1;
    return {
      x: (centerX - view.x) / safeScale,
      y: (centerY - view.y) / safeScale,
    };
  }, [viewportRef, view]);

  const onExplanatoryClick = useCallback(() => {
    const node = buildNode(
      {
        type: 'template',
        title: 'Explanatory Note',
        description: '',
        outputs: [],
        inputs: [],
      },
      resolveCanvasCenter(),
      createNodeId(),
      'Explanatory Note'
    );
    addNode(node);
  }, [addNode, resolveCanvasCenter]);

  const orderedNodes = useMemo((): AiNode[] => {
    return nodes
      .map((node, index): { node: AiNode; index: number } => ({ node, index }))
      .sort((left, right): number => {
        const leftStamp = Date.parse(left.node.updatedAt ?? left.node.createdAt ?? '');
        const rightStamp = Date.parse(right.node.updatedAt ?? right.node.createdAt ?? '');
        const leftHasStamp = Number.isFinite(leftStamp);
        const rightHasStamp = Number.isFinite(rightStamp);
        if (leftHasStamp && rightHasStamp && leftStamp !== rightStamp) {
          return rightStamp - leftStamp;
        }
        if (leftHasStamp !== rightHasStamp) {
          return rightHasStamp ? 1 : -1;
        }
        return right.index - left.index;
      })
      .map((entry) => entry.node);
  }, [nodes]);

  // Drop handler: accept file IDs dragged from the search panel
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes(DRAG_FILE_ID_TYPE)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      const fileId = e.dataTransfer.getData(DRAG_FILE_ID_TYPE);
      if (!fileId) return;
      e.preventDefault();
      const file = filesById.get(fileId);
      if (!file) return;

      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Convert screen coords → canvas coords
      const x = (e.clientX - rect.left - view.x) / view.scale;
      const y = (e.clientY - rect.top - view.y) / view.scale;

      const nodeId = createNodeId();
      const node = buildNode(
        {
          type: file.fileType === 'scanfile' ? 'scanfile' : 'document',
          title: file.name,
          description: '',
          outputs: [],
          inputs: [],
        },
        { x, y },
        nodeId,
        file.name
      );
      addNode(node);
      setNodeFileMeta(nodeId, {
        fileId: file.id,
        fileType: file.fileType,
        fileName: file.name,
      });
    },
    [filesById, view, viewportRef, addNode, setNodeFileMeta]
  );

  return (
    <div className='flex h-full min-h-0 w-full gap-4'>
      <Card
        variant='subtle'
        padding='none'
        className='relative flex min-h-[55vh] flex-1 flex-col border-border/60 bg-card/20 md:min-h-[65vh]'
      >
        <NodeFileDocumentSearchPanel
          newNodeType={newNodeType}
          setNewNodeType={setNewNodeType}
          onExplanatoryClick={onExplanatoryClick}
          onNodeInspectorClick={() => setIsNodeInspectorOpen(true)}
        />

        <div
          ref={viewportRef}
          className='relative min-h-[55vh] flex-1 overflow-hidden md:min-h-[65vh]'
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <CanvasBoard viewportClassName='h-full min-h-0' />
          {nodes.length === 0 && (
            <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
              <EmptyState
                title='Empty canvas'
                description='Drag documents from the panel above or click + to add.'
                icon={<FileCode2 className='size-12' />}
                className='border-none bg-card/60 backdrop-blur-sm'
              />
            </div>
          )}
        </div>

        <div className='shrink-0 border-t border-border/40 bg-card/30 px-3 py-2'>
          <div className='mb-2 flex items-center justify-between'>
            <span className='text-[10px] font-semibold uppercase tracking-wide text-gray-500'>
              Added Nodes
            </span>
            <span className='text-[10px] text-gray-500'>{orderedNodes.length}</span>
          </div>
          {orderedNodes.length === 0 ? (
            <div className='rounded border border-dashed border-border/40 px-2 py-1.5 text-xs text-gray-500'>
              No nodes on this canvas yet.
            </div>
          ) : (
            <div className='flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1'>
              {orderedNodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                return (
                  <button
                    key={node.id}
                    type='button'
                    onClick={() => selectNode(node.id)}
                    className={
                      isSelected
                        ? 'inline-flex max-w-full items-center gap-2 rounded border border-cyan-500/50 bg-cyan-500/15 px-2 py-1 text-xs text-cyan-100'
                        : 'inline-flex max-w-full items-center gap-2 rounded border border-border/50 bg-card/50 px-2 py-1 text-xs text-gray-300 transition-colors hover:border-border hover:bg-card/70'
                    }
                  >
                    <span className='max-w-[200px] truncate'>{node.title || 'Untitled Node'}</span>
                    <span className='rounded bg-card/70 px-1 py-0.5 text-[10px] uppercase tracking-wide text-gray-500'>
                      {node.type}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Side Panel */}
      {isSidePanelVisible && selectedNodeFileMeta && (
        <NodeFilePanel
          meta={selectedNodeFileMeta}
          file={selectedFile}
          onOpen={() => onSelectFile(selectedFile?.id ?? '')}
        />
      )}

      {isNodeInspectorOpen ? <CaseResolverNodeInspectorModal /> : null}
    </div>
  );
}

function CaseResolverNodeFileWorkspaceStateProviderBridge(
  props: UseNodeFileWorkspaceStateProps
): React.JSX.Element {
  const state = useNodeFileWorkspaceState(props);
  return (
    <NodeFileWorkspaceProvider value={state}>
      <CaseResolverNodeFileWorkspaceInner />
    </NodeFileWorkspaceProvider>
  );
}

// ─── public wrapper ───────────────────────────────────────────────────────────

export function CaseResolverNodeFileWorkspace(): React.JSX.Element {
  const { selectedAsset, onUpdateSelectedAsset } = useCaseResolverPageContext();

  const snapshot = useMemo(
    () => parseNodeFileSnapshot(selectedAsset?.textContent ?? ''),
    [selectedAsset?.id]
  );

  const handleSnapshotChange = useCallback(
    (updated: CaseResolverNodeFileSnapshot, options?: NodeFileSnapshotPersistOptions): void => {
      onUpdateSelectedAsset({ textContent: serializeNodeFileSnapshot(updated) }, options);
    },
    [onUpdateSelectedAsset]
  );

  if (selectedAsset?.kind !== 'node_file') {
    return (
      <EmptyState
        title='No canvas selected'
        description='Select a node file to open the canvas and start mapping.'
        className='h-[420px] bg-card/20'
      />
    );
  }

  const initialNodes: AiNode[] = snapshot.nodes.map(
    (node: AiNode): AiNode => ({
      ...node,
      createdAt: node.createdAt ?? new Date().toISOString(),
      updatedAt: node.updatedAt ?? new Date().toISOString(),
      data: node.data ?? {},
    })
  );

  return (
    <AiPathsProvider
      key={selectedAsset.id}
      initialNodes={initialNodes}
      initialEdges={snapshot.edges}
      initialLoading={false}
      initialRuntimeState={{
        status: 'idle',
        nodeStatuses: {},
        nodeOutputs: {},
        variables: {},
        events: [],
        inputs: {},
        outputs: {},
        history: {},
      }}
    >
      <CaseResolverNodeFileWorkspaceStateProviderBridge
        assetId={selectedAsset.id}
        assetName={selectedAsset.name}
        snapshot={snapshot}
        onSnapshotChange={handleSnapshotChange}
      />
    </AiPathsProvider>
  );
}
