'use client';

import { FileCode2, Save, Settings2, Copy } from 'lucide-react';
import React, { useCallback, useEffect, useMemo } from 'react';

import { CanvasBoard } from '@/features/ai/public';
import { AiPathsProvider } from '@/features/ai/public';
import {
  type AiNode,
  type CaseResolverNodeFileSnapshot,
} from '@/shared/contracts/case-resolver';
import { Button, EmptyState, Card, Chip, Tooltip, useToast, Badge } from '@/shared/ui';

import {
  useCaseResolverPageActions,
  useCaseResolverPageState,
} from '../context/CaseResolverPageContext';
import { createEmptyNodeFileSnapshot } from '../settings';
import { buildNode, createNodeId } from './case-resolver-canvas-utils';
import { CaseResolverNodeInspectorModal } from './CaseResolverNodeInspectorModal';
import { NodeFileDocumentSearchPanel } from './NodeFileDocumentSearchPanel';
import { NodeFilePanel } from './NodeFilePanel';
import {
  NodeFileWorkspaceProvider,
  useNodeFileWorkspaceActionsContext,
  useNodeFileWorkspaceStateContext,
} from './NodeFileWorkspaceContext';
import {
  useNodeFileWorkspaceState,
  type UseNodeFileWorkspaceStateProps,
} from '../hooks/useNodeFileWorkspaceState';
import { getCaseResolverDocTooltipWithFallback } from '../relation-search/utils/docs';
import {
  fetchCaseResolverNodeFileSnapshot,
  persistCaseResolverNodeFileSnapshot,
} from '../workspace-persistence';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


// ─── inner canvas component ───────────────────────────────────────────────────

const DRAG_FILE_ID_TYPE = 'application/case-resolver-file-id';
export type NodeFileSnapshotPersistOptions = {
  persistNow?: boolean;
  persistToast?: string;
  source?: string;
};

type ResolvedNodeFileSnapshotState = {
  isLoading: boolean;
  snapshot: CaseResolverNodeFileSnapshot;
  source: 'keyed' | 'empty_default';
  validationErrorMessage: string | null;
};

const NODE_FILE_SNAPSHOT_FETCH_TIMEOUT_MS = 8_000;

function CaseResolverNodeFileWorkspaceInner(): React.JSX.Element {
  const { toast } = useToast();
  const {
    nodes,
    selectedNodeId,
    selectedNodeFileMeta,
    configOpen,
    isNodeInspectorOpen,
    isSidePanelVisible,
    filesById,
    view,
    canvasHostRef,
    hasPendingSnapshotChanges = false,
  } = useNodeFileWorkspaceStateContext();
  const {
    setIsNodeInspectorOpen,
    setConfigOpen,
    addNode,
    setNodeFileMeta,
    selectNode,
    handleManualSave,
  } = useNodeFileWorkspaceActionsContext();

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

      const rect = canvasHostRef.current?.getBoundingClientRect();
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
    [canvasHostRef, filesById, view, addNode, setNodeFileMeta]
  );

  useEffect(() => {
    if (!configOpen) return;
    setIsNodeInspectorOpen(true);
    setConfigOpen(false);
  }, [configOpen, setConfigOpen, setIsNodeInspectorOpen]);

  const handleCopyNodeId = useCallback(
    (id: string) => {
      void navigator.clipboard.writeText(id);
      toast('Node ID copied.', { variant: 'success' });
    },
    [toast]
  );

  return (
    <div className='flex h-full min-h-0 w-full gap-4'>
      <Card
        variant='subtle'
        padding='none'
        className='relative flex min-h-[55vh] flex-1 flex-col border-border/60 bg-card/20 md:min-h-[65vh]'
      >
        <div className='flex items-center justify-between gap-3 border-b border-border/60 bg-card/40 px-3 py-2'>
          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleManualSave}
              disabled={!hasPendingSnapshotChanges}
            >
              <Save className='mr-1 size-3.5' />
              Save Map
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setIsNodeInspectorOpen(true)}
              disabled={!selectedNodeId}
            >
              <Settings2 className='mr-1 size-3.5' />
              Open Inspector
            </Button>
          </div>
          <div className='flex items-center gap-2'>
            {hasPendingSnapshotChanges ? (
              <Badge variant='warning' className='h-5 px-1.5 text-[10px] uppercase font-bold'>
                Unsaved changes
              </Badge>
            ) : (
              <Badge
                variant='outline'
                className='h-5 px-1.5 text-[10px] uppercase font-bold text-gray-500'
              >
                All changes saved
              </Badge>
            )}
          </div>
        </div>

        <NodeFileDocumentSearchPanel />

        <div
          ref={canvasHostRef}
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
            {orderedNodes.length > 0 && (
              <Badge variant='outline' className='text-[10px] h-4 px-1'>
                {orderedNodes.length}
              </Badge>
            )}
          </div>
          {orderedNodes.length === 0 ? (
            <div className='rounded border border-dashed border-border/40 px-2 py-1.5 text-xs text-gray-500'>
              No nodes on this canvas yet.
            </div>
          ) : (
            <div className='flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1 custom-scrollbar'>
              {orderedNodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                return (
                  <div key={node.id} className='relative group/node'>
                    <Chip
                      active={isSelected}
                      onClick={() => selectNode(node.id)}
                      label={
                        <div className='flex items-center gap-2 max-w-[240px]'>
                          <span className='truncate'>{node.title || 'Untitled Node'}</span>
                          <span className='rounded bg-black/30 px-1 text-[9px] uppercase tracking-wide opacity-60'>
                            {node.type}
                          </span>
                        </div>
                      }
                      className='pr-1'
                    />
                    <Tooltip
                      content={getCaseResolverDocTooltipWithFallback('copyNodeId', 'Copy Node ID')}
                      side='top'
                    >
                      <Button
                        variant='ghost'
                        size='xs'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyNodeId(node.id);
                        }}
                        className='absolute -top-1.5 -right-1.5 h-4 w-4 p-0 rounded-full bg-card border border-border/60 opacity-0 group-hover/node:opacity-100 transition-opacity'
                        aria-label='Copy node ID'
                        title='Copy node ID'
                      >
                        <Copy size={8} />
                      </Button>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Side Panel */}
      {isSidePanelVisible && selectedNodeFileMeta && <NodeFilePanel />}

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
  const { selectedAsset } = useCaseResolverPageState();
  const { onUpdateSelectedAsset } = useCaseResolverPageActions();
  const selectedAssetId = selectedAsset?.id ?? null;
  const selectedAssetKind = selectedAsset?.kind ?? null;
  const [resolvedSnapshot, setResolvedSnapshot] = React.useState<ResolvedNodeFileSnapshotState>({
    isLoading: false,
    snapshot: createEmptyNodeFileSnapshot(),
    source: 'empty_default',
    validationErrorMessage: null,
  });

  useEffect(() => {
    if (selectedAssetKind !== 'node_file' || !selectedAssetId) {
      setResolvedSnapshot({
        isLoading: false,
        snapshot: createEmptyNodeFileSnapshot(),
        source: 'empty_default',
        validationErrorMessage: null,
      });
      return;
    }

    setResolvedSnapshot({
      isLoading: true,
      snapshot: createEmptyNodeFileSnapshot(),
      source: 'empty_default',
      validationErrorMessage: null,
    });

    let isCancelled = false;
    void (async (): Promise<void> => {
      try {
        const keyedSnapshot = await fetchCaseResolverNodeFileSnapshot(
          selectedAssetId,
          NODE_FILE_SNAPSHOT_FETCH_TIMEOUT_MS,
          'node_file_workspace_load'
        );
        if (isCancelled) return;
        if (keyedSnapshot) {
          setResolvedSnapshot({
            isLoading: false,
            snapshot: keyedSnapshot,
            source: 'keyed',
            validationErrorMessage: null,
          });
          return;
        }
        setResolvedSnapshot({
          isLoading: false,
          snapshot: createEmptyNodeFileSnapshot(),
          source: 'empty_default',
          validationErrorMessage: null,
        });
      } catch (error) {
        logClientError(error);
        if (isCancelled) return;
        setResolvedSnapshot({
          isLoading: false,
          snapshot: createEmptyNodeFileSnapshot(),
          source: 'empty_default',
          validationErrorMessage:
            error instanceof Error ? error.message : 'Invalid node-file snapshot payload.',
        });
      }
    })();

    return (): void => {
      isCancelled = true;
    };
  }, [selectedAssetId, selectedAssetKind]);

  const handleSnapshotChange = useCallback(
    async (
      updated: CaseResolverNodeFileSnapshot,
      options?: NodeFileSnapshotPersistOptions
    ): Promise<boolean> => {
      if (selectedAsset?.kind !== 'node_file') return false;
      const didPersistSnapshot = await persistCaseResolverNodeFileSnapshot({
        assetId: selectedAsset.id,
        snapshot: updated,
        source: options?.source ?? 'node_file_manual_save',
      });
      if (!didPersistSnapshot) {
        return false;
      }
      onUpdateSelectedAsset(
        {
          textContent: '',
        },
        options
      );
      setResolvedSnapshot({
        isLoading: false,
        snapshot: updated,
        source: 'keyed',
        validationErrorMessage: null,
      });
      return true;
    },
    [onUpdateSelectedAsset, selectedAsset]
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

  if (resolvedSnapshot.isLoading && resolvedSnapshot.source === 'empty_default') {
    return (
      <EmptyState
        title='Loading node file'
        description='Loading node file map...'
        className='h-[420px] bg-card/20'
      />
    );
  }

  if (resolvedSnapshot.validationErrorMessage) {
    return (
      <EmptyState
        title='Invalid node file snapshot'
        description={resolvedSnapshot.validationErrorMessage}
        className='h-[420px] bg-card/20'
      />
    );
  }

  const initialNodes: AiNode[] = resolvedSnapshot.snapshot.nodes.map(
    (node: AiNode): AiNode => ({
      ...node,
      createdAt: node.createdAt ?? new Date().toISOString(),
      updatedAt: node.updatedAt ?? new Date().toISOString(),
      data: node.data ?? {},
    })
  );

  return (
    <AiPathsProvider
      key={`${selectedAsset.id}:${resolvedSnapshot.source}`}
      initialNodes={initialNodes}
      initialEdges={resolvedSnapshot.snapshot.edges}
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
        snapshot={resolvedSnapshot.snapshot}
        onSnapshotChange={handleSnapshotChange}
      />
    </AiPathsProvider>
  );
}
