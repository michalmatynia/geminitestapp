'use client';

import React, { useEffect, useMemo, useRef } from 'react';

import {
  createMasterFolderTreeTransactionAdapter,
  FolderTreeViewportV2,
  handleMasterTreeDrop,
  useMasterFolderTreeShell,
} from '@/features/foldertree';
import { Button, Card } from '@/shared/ui';

import { PromptExploderTreeNode } from './PromptExploderTreeNode';
import { PromptExploderTreeNodeRuntimeProvider } from './PromptExploderTreeNodeRuntimeContext';
import { useDocumentActions, useDocumentState } from '../../context/hooks/useDocument';
import { useSegmentEditorActions } from '../../context/hooks/useSegmentEditor';
import {
  buildPromptExploderSegmentMasterNodes,
  rebuildPromptExploderSegmentsFromMasterNodes,
} from '../../tree/segment-master-tree';
import {
  buildPromptExploderTreeRevision,
  usePromptExploderHandleOnlyDrag,
} from '../../tree/shared';
import { parsePromptExploderTreeNodeId, toPromptExploderTreeNodeId } from '../../tree/types';

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
