'use client';

import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  GripVertical,
  ListTree,
  Waypoints,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef } from 'react';

import {
  createMasterFolderTreeTransactionAdapter,
  FolderTreeViewportV2,
  handleMasterTreeDrop,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
} from '@/shared/lib/foldertree/public';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { Badge, Button, Card } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { useDocumentActions, useDocumentState, useSegmentEditorActions } from '../../context';
import {
  buildPromptExploderSegmentMasterNodes,
  rebuildPromptExploderSegmentsFromMasterNodes,
} from '../../tree/segment-master-tree';
import {
  buildPromptExploderTreeRevision,
  usePromptExploderHandleOnlyDrag,
} from '../../tree/shared';
import {
  parsePromptExploderTreeNodeId,
  readPromptExploderTreeMetadata,
  toPromptExploderTreeNodeId,
  type PromptExploderTreeNodeKind,
} from '../../tree/types';

type PromptExploderTreeNodeRuntimeContextValue = {
  armDragHandle: (nodeId: string) => void;
  releaseDragHandle: () => void;
};

const {
  Context: PromptExploderTreeNodeRuntimeContext,
  useStrictContext: usePromptExploderTreeNodeRuntimeContext,
} = createStrictContext<PromptExploderTreeNodeRuntimeContextValue>({
  hookName: 'usePromptExploderTreeNodeRuntimeContext',
  providerName: 'a PromptExploderTreeNodeRuntimeProvider',
  displayName: 'PromptExploderTreeNodeRuntimeContext',
  errorFactory: (message) => internalError(message),
});

export { usePromptExploderTreeNodeRuntimeContext };

export function PromptExploderTreeNodeRuntimeProvider({
  value,
  children,
}: {
  value: PromptExploderTreeNodeRuntimeContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <PromptExploderTreeNodeRuntimeContext.Provider value={value}>
      {children}
    </PromptExploderTreeNodeRuntimeContext.Provider>
  );
}

type PromptExploderTreeNodeProps = FolderTreeViewportRenderNodeInput;

const resolveNodeIcon = (kind: PromptExploderTreeNodeKind | null) => {
  switch (kind) {
    case 'segment':
      return FileText;
    case 'subsection':
      return Folder;
    case 'subsection_item':
      return ListTree;
    case 'list_item':
    case 'hierarchy_item':
      return Waypoints;
    default:
      return Folder;
  }
};

function PromptExploderTreeNode(props: PromptExploderTreeNodeProps): React.JSX.Element {
  const {
    node,
    depth,
    hasChildren,
    isExpanded,
    isSelected,
    isMultiSelected,
    isDragging,
    dropPosition,
    select,
    toggleExpand,
  } = props;

  const { armDragHandle, releaseDragHandle } = usePromptExploderTreeNodeRuntimeContext();
  const metadata = readPromptExploderTreeMetadata(node);
  const Icon = resolveNodeIcon(metadata?.kind ?? null);
  const stateClassName = isSelected
    ? 'bg-blue-600/20 text-white ring-1 ring-inset ring-blue-400/40 shadow-sm'
    : isMultiSelected
      ? 'bg-blue-500/15 text-blue-100 ring-1 ring-inset ring-blue-400/25'
      : dropPosition === 'before'
        ? 'bg-blue-500/10 text-gray-100 ring-1 ring-inset ring-blue-500/60'
        : dropPosition === 'after'
          ? 'bg-blue-500/10 text-gray-100 ring-1 ring-inset ring-cyan-400/60'
          : isDragging
            ? 'opacity-50'
            : 'text-gray-300 hover:bg-muted/40';

  const badgeLabel =
    metadata?.kind === 'segment'
      ? (metadata.segmentType?.replaceAll('_', ' ') ?? 'segment')
      : metadata?.kind === 'subsection'
        ? metadata.code?.trim() || 'subsection'
        : metadata?.kind === 'subsection_item'
          ? metadata.logicalOperator?.replaceAll('_', ' ') || 'item'
          : metadata?.kind === 'list_item' || metadata?.kind === 'hierarchy_item'
            ? metadata.logicalOperator?.replaceAll('_', ' ') || 'item'
            : null;

  return (
    <div
      className={cn(
        'group flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-all',
        stateClassName
      )}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <button
        type='button'
        aria-label='Drag node'
        data-master-tree-drag-handle='true'
        onPointerDown={(): void => {
          armDragHandle(node.id);
        }}
        onPointerUp={releaseDragHandle}
        onPointerCancel={releaseDragHandle}
        onMouseDown={(): void => {
          armDragHandle(node.id);
        }}
        onMouseUp={releaseDragHandle}
        className='inline-flex size-5 shrink-0 items-center justify-center rounded cursor-grab text-gray-400 transition hover:bg-white/10 hover:text-gray-100 active:cursor-grabbing'
        title='Drag node'
      >
        <GripVertical className='size-3.5' />
      </button>
      {hasChildren ? (
        <Button
          variant='ghost'
          size='sm'
          className='size-4 p-0 text-gray-500 hover:bg-white/10 hover:text-gray-300'
          onClick={(event): void => {
            event.preventDefault();
            event.stopPropagation();
            toggleExpand();
          }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronDown className='size-3' /> : <ChevronRight className='size-3' />}
        </Button>
      ) : (
        <span className='inline-flex size-4 items-center justify-center text-xs opacity-40'>•</span>
      )}
      <button
        type='button'
        onClick={select}
        aria-pressed={isSelected}
        aria-label={`Select ${node.name}`}
        className='flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
      >
        <Icon className='size-4 shrink-0 text-sky-200/80' />
        <span className='min-w-0 flex-1 truncate'>{node.name}</span>
        {badgeLabel ? (
          <Badge
            variant='neutral'
            className='shrink-0 border-border/60 bg-card/40 text-[10px] h-4 px-1 uppercase tracking-wider'
          >
            {badgeLabel}
          </Badge>
        ) : null}
      </button>
    </div>
  );
}

export function PromptExploderSegmentsTreeEditor(): React.JSX.Element {
  const { documentState, selectedSegmentId } = useDocumentState();
  const { replaceSegments, setSelectedSegmentId } = useDocumentActions();
  const { addSegmentRelative } = useSegmentEditorActions();

  const segments = documentState?.segments ?? [];
  const segmentsRef = useRef(segments);
  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  const masterNodes = useMemo(() => buildPromptExploderSegmentMasterNodes(segments), [segments]);
  const treeRevision = useMemo(() => buildPromptExploderTreeRevision(masterNodes), [masterNodes]);
  const selectedNodeId = selectedSegmentId
    ? toPromptExploderTreeNodeId('segment', selectedSegmentId)
    : undefined;

  const adapter = useMemo(
    () =>
      createMasterFolderTreeTransactionAdapter({
        onApply: async (tx) => {
          const nextSegments = rebuildPromptExploderSegmentsFromMasterNodes({
            nodes: tx.nextNodes,
            previousSegments: segmentsRef.current,
          });
          replaceSegments(nextSegments);
        },
      }),
    [replaceSegments]
  );

  const {
    appearance: { rootDropUi },
    controller,
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: 'prompt_exploder_segments',
    nodes: masterNodes,
    selectedNodeId,
    externalRevision: treeRevision,
    adapter,
  });

  const { armDragHandle, releaseDragHandle, canStartHandleOnlyDrag } =
    usePromptExploderHandleOnlyDrag();
  const treeNodeRuntimeContextValue = useMemo(
    () => ({
      armDragHandle,
      releaseDragHandle,
    }),
    [armDragHandle, releaseDragHandle]
  );

  useEffect(() => {
    const parsedSelectedNode = controller.selectedNodeId
      ? parsePromptExploderTreeNodeId(controller.selectedNodeId)
      : null;
    const resolvedSegmentId =
      parsedSelectedNode?.kind === 'segment' ? parsedSelectedNode.entityId : null;
    if ((resolvedSegmentId ?? null) === (selectedSegmentId ?? null)) return;
    setSelectedSegmentId(resolvedSegmentId);
  }, [controller.selectedNodeId, selectedSegmentId, setSelectedSegmentId]);

  return (
    <Card variant='subtle' padding='sm' className='space-y-2 bg-card/20'>
      <div className='flex items-center justify-between gap-2'>
        <div>
          <div className='text-xs font-medium uppercase tracking-[0.08em] text-gray-400'>
            Segment Tree
          </div>
          <div className='text-[11px] text-gray-500'>
            Handle-only reorder on master tree runtime.
          </div>
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => {
            if (selectedSegmentId) {
              addSegmentRelative(selectedSegmentId, 'after');
              return;
            }
            const lastSegmentId = documentState?.segments.at(-1)?.id ?? null;
            if (lastSegmentId) {
              addSegmentRelative(lastSegmentId, 'after');
            }
          }}
          disabled={segments.length === 0}
        >
          Add Below
        </Button>
      </div>
      <PromptExploderTreeNodeRuntimeProvider value={treeNodeRuntimeContextValue}>
        <div className='max-h-[65vh] overflow-y-auto rounded border border-border/60 bg-card/30 p-2'>
          <FolderTreeViewportV2
            controller={controller}
            scrollToNodeRef={scrollToNodeRef}
            enableDnd
            className='space-y-0.5'
            emptyLabel='No segments yet'
            rootDropUi={rootDropUi}
            canStartDrag={canStartHandleOnlyDrag}
            canDrop={({ targetId, position, defaultAllowed }) => {
              if (targetId === null) return defaultAllowed;
              return defaultAllowed && position !== 'inside';
            }}
            renderNode={(input) => <PromptExploderTreeNode {...input} />}
            onNodeDrop={async (input, treeController) => {
              await handleMasterTreeDrop({
                input,
                controller: treeController,
                onInternalDrop: async ({ input: dropInput, controller: dropController }) => {
                  if (dropInput.targetId === null) {
                    const targetIndex = dropInput.rootDropZone === 'top' ? 0 : undefined;
                    await dropController.dropNodeToRoot(dropInput.draggedNodeId, targetIndex);
                    return true;
                  }

                  if (dropInput.position === 'inside') {
                    return true;
                  }

                  await dropController.reorderNode(
                    dropInput.draggedNodeId,
                    dropInput.targetId,
                    dropInput.position
                  );
                  return true;
                },
              });
            }}
          />
        </div>
      </PromptExploderTreeNodeRuntimeProvider>
      <div className='text-[11px] text-gray-500'>
        Select a segment on the left, edit details on the right.
      </div>
    </Card>
  );
}
