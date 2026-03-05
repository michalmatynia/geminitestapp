'use client';

import React from 'react';
import { GripVertical, Layers } from 'lucide-react';

import type { FolderTreeViewportRenderNodeInput as SequenceGroupFolderNodeItemProps } from '@/features/foldertree/v2';
import { TreeCaret, TreeContextMenu, TreeRow, Button } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { fromSeqGroupMasterNodeId } from '../validator-pattern-master-tree';
import { useValidatorPatternTreeContext } from '../ValidatorPatternTreeContext';

export type { SequenceGroupFolderNodeItemProps };

export function SequenceGroupFolderNodeItem(
  props: SequenceGroupFolderNodeItemProps
): React.JSX.Element | null {
  const {
    node,
    depth,
    hasChildren,
    isExpanded,
    isSelected,
    isRenaming,
    isDragging,
    isDropTarget,
    dropPosition,
    select,
    toggleExpand,
    startRename,
  } = props;

  const {
    controller,
    sequenceGroupById,
    getGroupDraft,
    setGroupDrafts,
    onSaveSequenceGroup,
    onUngroup,
    isPending,
  } = useValidatorPatternTreeContext();

  const groupId = fromSeqGroupMasterNodeId(node.id);
  if (!groupId) return null;

  const group = sequenceGroupById.get(groupId) ?? null;
  const draft = getGroupDraft(groupId);
  const showInlineDrop = isDropTarget && dropPosition === 'inside';

  const commitRename = (): void => {
    const newLabel = controller.renameDraft.trim();
    if (newLabel) {
      setGroupDrafts((prev) => ({
        ...prev,
        [groupId]: { ...draft, label: newLabel },
      }));
      void onSaveSequenceGroup(groupId);
    }
    controller.cancelRename();
  };

  const handleUngroup = (): void => {
    void onUngroup(groupId);
  };

  const childCount = group?.patternIds.length ?? 0;
  const debounceMs = group?.debounceMs ?? 0;

  return (
    <TreeContextMenu
      items={[
        {
          id: 'rename-group',
          label: 'Rename group',
          onSelect: startRename,
        },
        {
          id: 'ungroup',
          label: 'Ungroup',
          onSelect: handleUngroup,
        },
      ]}
    >
      {isRenaming ? (
        <TreeRow
          depth={depth}
          baseIndent={8}
          indent={12}
          tone='subtle'
          selected={isSelected}
          selectedClassName='bg-muted text-white hover:bg-muted'
          className='relative h-8 text-xs'
        >
          <div
            className='flex h-full w-full min-w-0 items-center gap-1'
            onClick={(event: React.MouseEvent<HTMLDivElement>): void => {
              event.stopPropagation();
            }}
          >
            <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center' />
            <TreeCaret
              isOpen={isExpanded}
              hasChildren={hasChildren}
              ariaLabel={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
              onToggle={hasChildren ? toggleExpand : undefined}
              className='w-3 text-gray-400'
              buttonClassName='hover:bg-gray-700'
              placeholderClassName='w-3'
            />
            <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center'>
              <Layers className='size-3.5 text-cyan-400' />
            </span>
            <input
              autoFocus
              value={controller.renameDraft}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                controller.updateRenameDraft(event.target.value);
              }}
              onBlur={commitRename}
              onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>): void => {
                event.stopPropagation();
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitRename();
                  return;
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  controller.cancelRename();
                }
              }}
              onPointerDown={(event: React.PointerEvent<HTMLInputElement>): void => {
                event.stopPropagation();
              }}
              onClick={(event: React.MouseEvent<HTMLInputElement>): void => {
                event.stopPropagation();
              }}
              className='h-6 w-full rounded border border-border/70 bg-card/80 px-2 text-xs text-gray-100 outline-none ring-0 focus:border-cyan-400'
              aria-label='Rename sequence group'
            />
          </div>
        </TreeRow>
      ) : (
        <TreeRow
          asChild
          depth={depth}
          baseIndent={8}
          indent={12}
          tone='subtle'
          selected={isSelected}
          selectedClassName='bg-muted text-white hover:bg-muted'
          dragOver={showInlineDrop}
          dragOverClassName='bg-transparent text-gray-100 ring-0'
          className={cn('relative h-8 text-xs', isDragging && 'opacity-50')}
        >
          <Button
            variant='ghost'
            className='flex h-full w-full min-w-0 cursor-pointer items-center gap-1 text-left p-0 font-normal hover:bg-transparent justify-start'
            onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
              event.stopPropagation();
              select(event);
            }}
            onDoubleClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
              event.preventDefault();
              event.stopPropagation();
              startRename();
            }}
            title={node.name}
          >
            <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100'>
              <GripVertical className='size-3.5 shrink-0 cursor-grab text-gray-500' />
            </span>
            <TreeCaret
              isOpen={isExpanded}
              hasChildren={hasChildren}
              ariaLabel={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
              onToggle={toggleExpand}
              className='w-3 text-gray-400'
              buttonClassName='hover:bg-gray-700'
              placeholderClassName='w-3'
            />
            <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center'>
              <Layers className='size-3.5 text-cyan-400' />
            </span>
            <span className='min-w-0 flex-1 truncate font-medium text-cyan-200'>{node.name}</span>
            <span className='ml-1 flex shrink-0 items-center gap-1.5 pr-2'>
              <span className='text-[10px] text-gray-500'>
                {childCount} pattern{childCount === 1 ? '' : 's'}
              </span>
              {debounceMs > 0 && <span className='text-[10px] text-cyan-700'>{debounceMs}ms</span>}
              <span
                className={cn(
                  'rounded px-1 py-0.5 text-[10px] text-amber-300 transition',
                  'opacity-0 group-hover:opacity-100 hover:bg-amber-500/15',
                  isPending && 'pointer-events-none opacity-40'
                )}
                onMouseDown={(event: React.MouseEvent<HTMLSpanElement>): void => {
                  event.stopPropagation();
                }}
                onClick={(event: React.MouseEvent<HTMLSpanElement>): void => {
                  event.stopPropagation();
                  handleUngroup();
                }}
                title='Ungroup — move all patterns to standalone'
                aria-hidden='true'
              >
                Ungroup
              </span>
            </span>
          </Button>
        </TreeRow>
      )}
    </TreeContextMenu>
  );
}
