'use client';

import {
  FileCode2,
} from 'lucide-react';
import React, { useCallback, useMemo } from 'react';

import { CanvasBoard } from '@/features/ai/ai-paths/components/canvas-board';
import {
  AiPathsProvider,
} from '@/features/ai/ai-paths/context';
import { type AiNode } from '@/shared/contracts/case-resolver';
import {
  type CaseResolverNodeFileSnapshot,
} from '@/shared/contracts/case-resolver';
import { EmptyState, Card } from '@/shared/ui';

import { useCaseResolverPageContext } from '../context/CaseResolverPageContext';
import { parseNodeFileSnapshot, serializeNodeFileSnapshot } from '../settings';
import {
  buildNode,
  createNodeId,
} from './case-resolver-canvas-utils';
import { CaseResolverNodeInspectorModal } from './CaseResolverNodeInspectorModal';
import { NodeFileWorkspaceProvider, useNodeFileWorkspaceContext } from './NodeFileWorkspaceContext';
import { useNodeFileWorkspaceState, type UseNodeFileWorkspaceStateProps } from '../hooks/useNodeFileWorkspaceState';
import { NodeFilePanel } from './NodeFilePanel';
import { NodeFileDocumentSearchPanel } from './NodeFileDocumentSearchPanel';

// ─── inner canvas component ───────────────────────────────────────────────────

const DRAG_FILE_ID_TYPE = 'application/case-resolver-file-id';

function CaseResolverNodeFileWorkspaceInner(): React.JSX.Element {
  const {
    nodes,
    newNodeType,
    setNewNodeType,
    isSidePanelVisible,
    setIsNodeInspectorOpen,
    selectedNodeFileMeta,
    selectedFile,
    addNode,
    setNodeFileMeta,
    filesById,
    view,
    viewportRef,
    onSelectFile,
  } = useNodeFileWorkspaceContext();

  const onExplanatoryClick = useCallback(() => {
    const center = {
      x: (-view.x + 400) / view.scale,
      y: (-view.y + 300) / view.scale,
    };
    const node = buildNode(
      {
        type: 'template',
        title: 'Explanatory Note',
        description: '',
        outputs: [],
        inputs: [],
      },
      center,
      createNodeId(),
      'Explanatory Note'
    );
    addNode(node);
  }, [view, addNode]);

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
        className='relative flex min-h-0 flex-1 flex-col border-border/60 bg-card/20'
      >
        {/* Search panel — shrink-0 so it never pushes canvas to 0 */}
        <NodeFileDocumentSearchPanel
          newNodeType={newNodeType}
          setNewNodeType={setNewNodeType}
          onExplanatoryClick={onExplanatoryClick}
          onNodeInspectorClick={() => setIsNodeInspectorOpen(true)}
        />

        {/* Canvas — flex-1 means it always fills remaining space */}
        <div
          ref={viewportRef}
          className='relative min-h-0 flex-1 overflow-hidden'
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
      </Card>

      {/* Side Panel */}
      {isSidePanelVisible && selectedNodeFileMeta && (
        <NodeFilePanel
          meta={selectedNodeFileMeta}
          file={selectedFile}
          onOpen={() => onSelectFile(selectedFile?.id ?? '')}
        />
      )}

      <CaseResolverNodeInspectorModal />
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
    (updated: CaseResolverNodeFileSnapshot): void => {
      onUpdateSelectedAsset({ textContent: serializeNodeFileSnapshot(updated) });
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

  const initialNodes: AiNode[] = snapshot.nodes.map((node: AiNode): AiNode => ({
    ...node,
    createdAt: node.createdAt ?? new Date().toISOString(),
    updatedAt: node.updatedAt ?? new Date().toISOString(),
    data: node.data ?? {},
  }));

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
