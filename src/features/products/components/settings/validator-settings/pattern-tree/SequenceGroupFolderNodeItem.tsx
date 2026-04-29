'use client';

import { GripVertical, Layers } from 'lucide-react';
import React from 'react';

import type { FolderTreeViewportRenderNodeInput as SequenceGroupFolderNodeItemProps } from '@/shared/lib/foldertree/public';
import { TreeCaret, TreeContextMenu, TreeRow } from '@/shared/ui/tree';

import { focusOnMount } from '@/shared/utils/focus-on-mount';
import { cn } from '@/shared/utils/ui-utils';

import { fromSeqGroupMasterNodeId } from '../validator-pattern-master-tree';
import { useValidatorPatternTreeContext } from '../ValidatorPatternTreeContext';

export type { SequenceGroupFolderNodeItemProps };

type SequenceGroupNodeRuntime = {
  childCount: number;
  commitRename: () => void;
  debounceMs: number;
  groupId: string;
  handleUngroup: () => void;
  showInlineDrop: boolean;
};

const resolveChildCount = (group: { patternIds: readonly unknown[] } | null): number =>
  group === null ? 0 : group.patternIds.length;

const resolveDebounceMs = (group: { debounceMs: number } | null): number =>
  group === null ? 0 : group.debounceMs;

const isInsideDropTarget = (props: SequenceGroupFolderNodeItemProps): boolean =>
  props.isDropTarget === true && props.dropPosition === 'inside';

function useSequenceGroupNodeRuntime(
  props: SequenceGroupFolderNodeItemProps
): SequenceGroupNodeRuntime | null {
  const {
    controller,
    sequenceGroupById,
    getGroupDraft,
    setGroupDrafts,
    onSaveSequenceGroup,
    onUngroup,
  } = useValidatorPatternTreeContext();
  const groupId = fromSeqGroupMasterNodeId(props.node.id);
  if (groupId === null || groupId === '') return null;

  const group = sequenceGroupById.get(groupId) ?? null;
  const draft = getGroupDraft(groupId);
  const commitRename = (): void => {
    const newLabel = controller.renameDraft.trim();
    if (newLabel !== '') {
      setGroupDrafts((prev) => ({ ...prev, [groupId]: { ...draft, label: newLabel } }));
      void onSaveSequenceGroup(groupId);
    }
    controller.cancelRename();
  };

  return {
    childCount: resolveChildCount(group),
    commitRename,
    debounceMs: resolveDebounceMs(group),
    groupId,
    handleUngroup: () => {
      void onUngroup(groupId);
    },
    showInlineDrop: isInsideDropTarget(props),
  };
}

function SequenceGroupTreeCaret({
  hasChildren,
  isExpanded,
  nodeName,
  toggleExpand,
}: Pick<SequenceGroupFolderNodeItemProps, 'hasChildren' | 'isExpanded' | 'toggleExpand'> & {
  nodeName: string;
}): React.JSX.Element {
  return (
    <TreeCaret
      isOpen={isExpanded}
      hasChildren={hasChildren}
      ariaLabel={isExpanded ? `Collapse ${nodeName}` : `Expand ${nodeName}`}
      onToggle={hasChildren ? toggleExpand : undefined}
      className='w-3 text-gray-400'
      buttonClassName='hover:bg-gray-700'
      placeholderClassName='w-3'
    />
  );
}

function SequenceGroupRenameRow({
  commitRename,
  props,
}: {
  commitRename: () => void;
  props: SequenceGroupFolderNodeItemProps;
}): React.JSX.Element {
  const { controller } = useValidatorPatternTreeContext();

  return (
    <TreeRow depth={props.depth} baseIndent={8} indent={12} tone='subtle' selected={props.isSelected} selectedClassName='bg-muted text-white hover:bg-muted' className='relative h-8 text-xs'>
      <div className='flex h-full w-full min-w-0 items-center gap-1' onMouseDownCapture={(event: React.MouseEvent<HTMLDivElement>): void => event.stopPropagation()} onClickCapture={(event: React.MouseEvent<HTMLDivElement>): void => event.stopPropagation()}>
        <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center' />
        <SequenceGroupTreeCaret
          isExpanded={props.isExpanded}
          hasChildren={props.hasChildren}
          nodeName={props.node.name}
          toggleExpand={props.toggleExpand}
        />
        <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center'>
          <Layers className='size-3.5 text-cyan-400' />
        </span>
        <input
          ref={focusOnMount}
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
          onPointerDown={(event: React.PointerEvent<HTMLInputElement>): void => event.stopPropagation()}
          onClick={(event: React.MouseEvent<HTMLInputElement>): void => event.stopPropagation()}
          className='h-6 w-full rounded border border-border/70 bg-card/80 px-2 text-xs text-gray-100 outline-none ring-0 focus:border-cyan-400'
          aria-label='Rename sequence group'
        />
      </div>
    </TreeRow>
  );
}

function SequenceGroupDisplayRow({
  props,
  runtime,
}: {
  props: SequenceGroupFolderNodeItemProps;
  runtime: SequenceGroupNodeRuntime;
}): React.JSX.Element {
  const { isPending } = useValidatorPatternTreeContext();

  return (
    <TreeRow depth={props.depth} baseIndent={8} indent={12} tone='subtle' selected={props.isSelected} selectedClassName='bg-muted text-white hover:bg-muted' dragOver={runtime.showInlineDrop} dragOverClassName='bg-transparent text-gray-100 ring-0' className={cn('relative h-8 text-xs', props.isDragging && 'opacity-50')}>
      <div className='flex h-full w-full min-w-0 items-center gap-1 text-left'>
        <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'>
          <GripVertical className='size-3.5 shrink-0 cursor-grab text-gray-500' />
        </span>
        <SequenceGroupTreeCaret
          isExpanded={props.isExpanded}
          hasChildren={props.hasChildren}
          nodeName={props.node.name}
          toggleExpand={props.toggleExpand}
        />
        <SequenceGroupSelectButton props={props} runtime={runtime} />
        <SequenceGroupDeleteButton
          handleUngroup={runtime.handleUngroup}
          isPending={isPending}
        />
      </div>
    </TreeRow>
  );
}

function SequenceGroupSelectButton({
  props,
  runtime,
}: {
  props: SequenceGroupFolderNodeItemProps;
  runtime: SequenceGroupNodeRuntime;
}): React.JSX.Element {
  return (
    <button
      type='button'
      className='flex min-w-0 flex-1 items-center gap-1 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
      onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
        event.stopPropagation();
        props.select(event);
      }}
      onDoubleClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
        event.preventDefault();
        event.stopPropagation();
        props.startRename();
      }}
      aria-pressed={props.isSelected}
      aria-label={`Select sequence group ${props.node.name}`}
      title={props.node.name}
    >
      <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center'>
        <Layers className='size-3.5 text-cyan-400' />
      </span>
      <span className='min-w-0 flex-1 truncate font-medium text-cyan-200'>{props.node.name}</span>
      <span className='ml-1 flex shrink-0 items-center gap-1.5 pr-2'>
        <span className='text-[10px] text-gray-500'>
          {runtime.childCount} pattern{runtime.childCount === 1 ? '' : 's'}
        </span>
        {runtime.debounceMs > 0 ? <span className='text-[10px] text-cyan-700'>{runtime.debounceMs}ms</span> : null}
      </span>
    </button>
  );
}

function SequenceGroupDeleteButton({
  handleUngroup,
  isPending,
}: {
  handleUngroup: () => void;
  isPending: boolean;
}): React.JSX.Element {
  return (
    <button
      type='button'
      className={cn(
        'rounded px-1 py-0.5 text-[10px] text-amber-300 transition',
        'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-amber-500/15',
        isPending && 'pointer-events-none opacity-40'
      )}
      onMouseDown={(event: React.MouseEvent<HTMLButtonElement>): void => event.stopPropagation()}
      onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
        event.stopPropagation();
        handleUngroup();
      }}
      title='Delete sequence — keep patterns as standalone rules'
      aria-label='Delete sequence group'
      disabled={isPending}
    >
      Delete
    </button>
  );
}

export function SequenceGroupFolderNodeItem(
  props: SequenceGroupFolderNodeItemProps
): React.JSX.Element | null {
  const runtime = useSequenceGroupNodeRuntime(props);
  if (runtime === null) return null;

  return (
    <TreeContextMenu
      items={[
        { id: 'rename-group', label: 'Rename group', onSelect: props.startRename },
        { id: 'ungroup', label: 'Delete sequence', onSelect: runtime.handleUngroup },
      ]}
    >
      {props.isRenaming ? (
        <SequenceGroupRenameRow props={props} commitRename={runtime.commitRename} />
      ) : (
        <SequenceGroupDisplayRow props={props} runtime={runtime} />
      )}
    </TreeContextMenu>
  );
}
