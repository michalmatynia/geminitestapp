'use client';

import React, { useEffect, useMemo, useRef } from 'react';

import { FolderTreeViewportV2, useMasterFolderTreeShell } from '@/features/foldertree/v2';
import type {
  MasterFolderTreeAdapterV3,
  MasterFolderTreeTransaction,
} from '@/shared/contracts/master-folder-tree';
import { Button, Card } from '@/shared/ui';

import { useDocumentActions, useDocumentState } from '../../context/hooks/useDocument';
import { useSegmentEditorActions } from '../../context/hooks/useSegmentEditor';
import { PromptExploderTreeNode } from './PromptExploderTreeNode';
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
  toPromptExploderTreeNodeId,
} from '../../tree/types';

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

  const adapter = useMemo<MasterFolderTreeAdapterV3>(
    () => ({
      prepare: async (tx: MasterFolderTreeTransaction) => ({
        tx,
        preparedAt: Date.now(),
      }),
      apply: async (tx: MasterFolderTreeTransaction) => {
        const nextSegments = rebuildPromptExploderSegmentsFromMasterNodes({
          nodes: tx.nextNodes,
          previousSegments: segmentsRef.current,
        });
        replaceSegments(nextSegments);
        return {
          tx,
          appliedAt: Date.now(),
        };
      },
      commit: async () => {},
      rollback: async () => {},
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

  useEffect(() => {
    const parsedSelectedNode =
      controller.selectedNodeId ? parsePromptExploderTreeNodeId(controller.selectedNodeId) : null;
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
          <div className='text-[11px] text-gray-500'>Handle-only reorder on master tree runtime.</div>
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
          renderNode={(input) => (
            <PromptExploderTreeNode
              {...input}
              armDragHandle={armDragHandle}
              releaseDragHandle={releaseDragHandle}
            />
          )}
          onNodeDrop={async (input) => {
            if (input.targetId === null) {
              const targetIndex = input.rootDropZone === 'top' ? 0 : undefined;
              await controller.dropNodeToRoot(input.draggedNodeId, targetIndex);
              return;
            }
            await controller.reorderNode(
              input.draggedNodeId,
              input.targetId,
              input.position as 'before' | 'after'
            );
          }}
        />
      </div>
      <div className='text-[11px] text-gray-500'>Select a segment on the left, edit details on the right.</div>
    </Card>
  );
}
