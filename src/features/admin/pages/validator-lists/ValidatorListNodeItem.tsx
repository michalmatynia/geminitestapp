'use client';
import { ExternalLink, GripVertical, Lock, Pencil, Trash2, Unlock } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import type { FolderTreeViewportRenderNodeInput as ValidatorListNodeItemProps } from '@/shared/lib/foldertree/public';
import { Badge } from '@/shared/ui/primitives.public';
import { TreeContextMenu, TreeRow } from '@/shared/ui/data-display.public';
import { cn } from '@/shared/utils/ui-utils';
import { VALIDATOR_SCOPE_LABELS } from '../validator-scope';
import { fromValidatorListNodeId } from './validator-list-master-tree';
import { useValidatorListTreeContext } from './ValidatorListTreeContext';

export type { ValidatorListNodeItemProps };
type ValidatorListItem = NonNullable<ReturnType<ReturnType<typeof useValidatorListTreeContext>['listById']['get']>>;
type ValidatorListHandlers = Pick<
  ReturnType<typeof useValidatorListTreeContext>,
  'isPending' | 'onEdit' | 'onRemove' | 'onToggleLock'
>;
const stopMouseEvent = (event: React.MouseEvent): void => event.stopPropagation();
const getDisplayListName = (name: string): string => {
  const trimmedName = name.trim();
  return trimmedName === '' ? 'Unnamed List' : trimmedName;
};

function ValidatorListStatusBadges({
  deletionLocked,
  scopeLabel,
}: {
  deletionLocked: boolean;
  scopeLabel: string;
}): React.JSX.Element {
  return (
    <>
      <Badge
        variant='outline'
        className='h-4 px-1 text-[10px] text-gray-400 border-gray-600/50'
      >
        {scopeLabel}
      </Badge>
      {deletionLocked ? (
        <Badge
          variant='outline'
          className='h-4 px-1 text-[10px] border-amber-400/40 text-amber-300'
        >
          Locked
        </Badge>
      ) : (
        <Badge
          variant='outline'
          className='h-4 px-1 text-[10px] border-emerald-400/40 text-emerald-300'
        >
          Unlocked
        </Badge>
      )}
    </>
  );
}

function ValidatorListActionButtons({
  isPending,
  list,
  listId,
  onEdit,
  onRemove,
  onToggleLock,
}: {
  isPending: ValidatorListHandlers['isPending'];
  list: ValidatorListItem;
  listId: string;
  onEdit: ValidatorListHandlers['onEdit'];
  onRemove: ValidatorListHandlers['onRemove'];
  onToggleLock: ValidatorListHandlers['onToggleLock'];
}): React.JSX.Element {
  return (
    <span className='ml-1 flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'>
      <EditListButton isPending={isPending} list={list} onEdit={onEdit} />
      <ToggleLockButton
        isPending={isPending}
        deletionLocked={list.deletionLocked}
        listId={listId}
        onToggleLock={onToggleLock}
      />
      <RemoveListButton isPending={isPending} list={list} onRemove={onRemove} />
      <EnterListLink listId={listId} />
    </span>
  );
}

function createContextMenuItems({
  list,
  listId,
  onEdit,
  onRemove,
  onToggleLock,
}: {
  list: ValidatorListItem;
  listId: string;
  onEdit: ValidatorListHandlers['onEdit'];
  onRemove: ValidatorListHandlers['onRemove'];
  onToggleLock: ValidatorListHandlers['onToggleLock'];
}): React.ComponentProps<typeof TreeContextMenu>['items'] {
  return [
    {
      id: 'enter-list',
      label: 'Enter list',
      onSelect: (): void => {
        // Navigation happens via the Link element
      },
    },
    {
      id: 'edit-list',
      label: 'Edit list',
      onSelect: (): void => onEdit(list),
    },
    {
      id: 'toggle-lock',
      label: list.deletionLocked ? 'Unlock' : 'Lock',
      onSelect: (): void => onToggleLock(listId),
    },
    {
      id: 'remove-list',
      label: 'Remove list',
      icon: <Trash2 className='size-3.5' />,
      tone: 'danger',
      onSelect: (): void => onRemove(list),
    },
  ];
}

function EditListButton({
  isPending,
  list,
  onEdit,
}: {
  isPending: ValidatorListHandlers['isPending'];
  list: ValidatorListItem;
  onEdit: ValidatorListHandlers['onEdit'];
}): React.JSX.Element {
  return (
    <button
      type='button'
      className={cn(
        'inline-flex items-center justify-center rounded p-0.5 transition',
        'hover:bg-gray-700/60 text-gray-400',
        isPending && 'pointer-events-none opacity-40'
      )}
      onMouseDown={stopMouseEvent}
      onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
        event.stopPropagation();
        onEdit(list);
      }}
      title='Edit list'
      aria-label='Edit list'
      disabled={isPending}
    >
      <Pencil className='size-3' />
    </button>
  );
}

function ToggleLockButton({
  deletionLocked,
  isPending,
  listId,
  onToggleLock,
}: {
  deletionLocked: boolean;
  isPending: ValidatorListHandlers['isPending'];
  listId: string;
  onToggleLock: ValidatorListHandlers['onToggleLock'];
}): React.JSX.Element {
  return (
    <button
      type='button'
      className={cn(
        'inline-flex items-center justify-center rounded p-0.5 transition',
        'text-gray-400',
        deletionLocked
          ? 'hover:bg-emerald-500/15 hover:text-emerald-300'
          : 'hover:bg-amber-500/15 hover:text-amber-300',
        isPending && 'pointer-events-none opacity-40'
      )}
      onMouseDown={stopMouseEvent}
      onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
        event.stopPropagation();
        onToggleLock(listId);
      }}
      title={deletionLocked ? 'Unlock' : 'Lock'}
      aria-label={deletionLocked ? 'Unlock list' : 'Lock list'}
      disabled={isPending}
    >
      {deletionLocked ? <Unlock className='size-3' /> : <Lock className='size-3' />}
    </button>
  );
}

function RemoveListButton({
  isPending,
  list,
  onRemove,
}: {
  isPending: ValidatorListHandlers['isPending'];
  list: ValidatorListItem;
  onRemove: ValidatorListHandlers['onRemove'];
}): React.JSX.Element {
  const removalDisabled = list.deletionLocked || isPending;
  const removeButtonClassName = list.deletionLocked
    ? 'text-gray-600 cursor-not-allowed'
    : 'text-gray-400 hover:bg-red-500/20 hover:text-red-300';

  return (
    <button
      type='button'
      className={cn(
        'inline-flex items-center justify-center rounded p-0.5 transition',
        removeButtonClassName,
        isPending && 'pointer-events-none opacity-40'
      )}
      onMouseDown={stopMouseEvent}
      onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
        event.stopPropagation();
        if (!list.deletionLocked) {
          onRemove(list);
        }
      }}
      title={list.deletionLocked ? 'Unlock list before removing' : 'Remove list'}
      aria-label={list.deletionLocked ? 'Unlock list before removing' : 'Remove list'}
      disabled={removalDisabled}
    >
      <Trash2 className='size-3' />
    </button>
  );
}

function EnterListLink({ listId }: { listId: string }): React.JSX.Element {
  return (
    <Link
      href={`/admin/validator?list=${encodeURIComponent(listId)}`}
      className={cn(
        'inline-flex items-center justify-center rounded p-0.5 transition',
        'text-gray-400 hover:bg-sky-500/15 hover:text-sky-300'
      )}
      onMouseDown={stopMouseEvent}
      onClick={stopMouseEvent}
      title='Enter list'
      aria-label='Enter list'
    >
      <ExternalLink className='size-3' />
    </Link>
  );
}

export function ValidatorListNodeItem(props: ValidatorListNodeItemProps): React.JSX.Element | null {
  const { node, depth, isSelected, isDragging, select } = props;

  const { listById, onEdit, onToggleLock, onRemove, isPending } = useValidatorListTreeContext();

  const listId = fromValidatorListNodeId(node.id);
  if (listId === null) {
    return null;
  }

  const list = listById.get(listId);
  if (list === undefined) {
    return null;
  }

  const displayListName = getDisplayListName(list.name);
  const scopeLabel = VALIDATOR_SCOPE_LABELS[list.scope];

  return (
    <TreeContextMenu
      items={createContextMenuItems({ list, listId, onEdit, onRemove, onToggleLock })}
    >
      <TreeRow
        asChild
        depth={depth}
        baseIndent={8}
        indent={12}
        tone='subtle'
        selected={isSelected}
        selectedClassName='bg-muted text-white hover:bg-muted'
        className={cn('relative h-8 text-xs', isDragging && 'opacity-50')}
      >
        <div className='flex h-full w-full min-w-0 items-center gap-1.5 text-left'>
          <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100'>
            <GripVertical className='size-3.5 shrink-0 cursor-grab text-gray-500' />
          </span>

          <button
            type='button'
            onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
              event.stopPropagation();
              select(event);
            }}
            aria-pressed={isSelected}
            aria-label={`Select validator list ${displayListName}`}
            className='flex min-w-0 flex-1 items-center gap-1.5 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
          >
            <span className='min-w-0 flex-1 truncate font-medium text-gray-100'>{displayListName}</span>
            <ValidatorListStatusBadges deletionLocked={list.deletionLocked} scopeLabel={scopeLabel} />
          </button>

          <ValidatorListActionButtons
            isPending={isPending}
            list={list}
            listId={listId}
            onEdit={onEdit}
            onRemove={onRemove}
            onToggleLock={onToggleLock}
          />
        </div>
      </TreeRow>
    </TreeContextMenu>
  );
}
