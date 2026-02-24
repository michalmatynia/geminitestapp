'use client';

import {
  FileCode2,
  Sparkles,
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
import { Button, SelectSimple, EmptyState, Card, SearchInput } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useCaseResolverPageContext } from '../context/CaseResolverPageContext';
import { parseNodeFileSnapshot, serializeNodeFileSnapshot } from '../settings';
import {
  buildNode,
  createNodeId,
} from './case-resolver-canvas-utils';
import { CaseResolverNodeInspectorModal } from './CaseResolverNodeInspectorModal';
import { NodeFileWorkspaceProvider, useNodeFileWorkspaceContext } from './NodeFileWorkspaceContext';
import { useNodeFileWorkspaceState } from '../hooks/useNodeFileWorkspaceState';
import { NodeFilePanel } from './NodeFilePanel';
import { NodeFileDocumentSearchRow } from './CaseResolverNodeFileUtils';

// ─── inner canvas component ───────────────────────────────────────────────────

function CaseResolverNodeFileWorkspaceInner(): React.JSX.Element {
  const {
    nodes,
    newNodeType,
    setNewNodeType,
    isSidePanelVisible,
    setIsNodeInspectorOpen,
    documentSearchQuery,
    setDocumentSearchQuery,
    selectedSearchDocumentId,
    setSelectedSearchDocumentId,
    isDocumentSearchOpen,
    setIsDocumentSearchOpen,
    visibleDocumentSearchRows,
    selectedNodeMeta,
    selectedFile,
    addNode,
    view,
    viewportRef,
    onSelectFile,
  } = useNodeFileWorkspaceContext();

  const addSelectedSearchDocument = useCallback(() => {
    const row = visibleDocumentSearchRows.find((r) => r.file.id === selectedSearchDocumentId);
    if (!row) return;

    const center = {
      x: (-view.x + 400) / view.scale,
      y: (-view.y + 300) / view.scale,
    };

    const node = buildNode(
      {
        type: row.file.fileType === 'scanfile' ? 'scanfile' : 'document',
        title: row.file.name,
        description: '',
        outputs: [],
        inputs: [],
      },
      center,
      createNodeId(),
      row.file.name
    );

    addNode(node);
  }, [visibleDocumentSearchRows, selectedSearchDocumentId, view, addNode]);

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

  return (
    <div className='flex h-full min-h-0 w-full gap-4'>
      <Card
        variant='subtle'
        padding='none'
        className='relative flex min-h-0 flex-1 flex-col overflow-hidden border-border/60 bg-card/20'
      >
        {/* Toolbar */}
        <div className='flex items-center gap-3 border-b border-border/60 bg-card/40 px-4 py-2.5'>
          <div className='relative flex-1 max-w-md'>
            <SearchInput
              value={documentSearchQuery}
              onChange={(e) => setDocumentSearchQuery(e.target.value)}
              onClear={() => setDocumentSearchQuery('')}
              placeholder='Search documents...'
              onFocus={() => setIsDocumentSearchOpen(true)}
              className='h-8 border-border bg-card/60 text-xs text-white'
            />
            {isDocumentSearchOpen && (
              <div className='absolute top-full z-30 mt-1 w-full overflow-hidden rounded-md border border-border/70 bg-card/95 shadow-xl backdrop-blur-sm'>
                {visibleDocumentSearchRows.length === 0 ? (
                  <div className='px-3 py-2 text-xs text-gray-400'>No results.</div>
                ) : (
                  <div className='max-h-80 overflow-auto p-1'>
                    {visibleDocumentSearchRows.map((row: NodeFileDocumentSearchRow) => (
                      <button
                        key={row.file.id}
                        type='button'
                        className={cn(
                          'w-full rounded px-2 py-1.5 text-left transition-colors',
                          selectedSearchDocumentId === row.file.id ? 'bg-cyan-500/15 text-cyan-100' : 'text-gray-200 hover:bg-card/70'
                        )}
                        onClick={() => {
                          setSelectedSearchDocumentId(row.file.id);
                          setDocumentSearchQuery(row.file.name);
                          setIsDocumentSearchOpen(false);
                        }}
                      >
                        <div className='truncate text-xs font-medium'>{row.file.name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <Button
            variant='outline'
            size='sm'
            onClick={addSelectedSearchDocument}
            disabled={!selectedSearchDocumentId}
          >
            Add Selected
          </Button>

          <div className='mx-1 h-6 w-px bg-border/60' />

          <Button onClick={onExplanatoryClick} variant='success' size='sm'>
            <Sparkles className='mr-1 size-3.5' />
            Explanatory Node
          </Button>

          <SelectSimple
            size='sm'
            value={newNodeType}
            onValueChange={(val: any) => setNewNodeType(val)}
            options={[
              { value: 'prompt', label: 'Prompt Node' },
              { value: 'model', label: 'Model Node' },
              { value: 'template', label: 'Template Node' },
              { value: 'database', label: 'Database Node' },
              { value: 'viewer', label: 'Result Viewer Node' },
            ]}
            className='w-[170px]'
            triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
          />

          <Button variant='outline' size='sm' onClick={() => setIsNodeInspectorOpen(true)}>
            Node Inspector
          </Button>
        </div>

        {/* Canvas */}
        <div ref={viewportRef} className='relative min-h-0 flex-1 overflow-hidden'>
          <CanvasBoard viewportClassName='h-full min-h-0' />
          {nodes.length === 0 && (
            <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
              <EmptyState
                title='Empty canvas'
                description='Drag files here or use the search above.'
                icon={<FileCode2 className='size-12' />}
                className='border-none bg-card/60 backdrop-blur-sm'
              />
            </div>
          )}
        </div>
      </Card>

      {/* Side Panel */}
      {isSidePanelVisible && selectedNodeMeta && (
        <NodeFilePanel
          meta={selectedNodeMeta as any}
          file={selectedFile}
          onOpen={() => onSelectFile(selectedFile?.id ?? '')}
        />
      )}

      <CaseResolverNodeInspectorModal />
    </div>
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

  const state = useNodeFileWorkspaceState({
    assetId: selectedAsset?.id ?? '',
    assetName: selectedAsset?.name ?? '',
    snapshot,
    onSnapshotChange: handleSnapshotChange,
  });

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
      <NodeFileWorkspaceProvider value={state}>
        <CaseResolverNodeFileWorkspaceInner />
      </NodeFileWorkspaceProvider>
    </AiPathsProvider>
  );
}
