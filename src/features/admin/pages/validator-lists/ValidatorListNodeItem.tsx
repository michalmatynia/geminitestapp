'use client';

import { ExternalLink, GripVertical, Lock, Pencil, Trash2, Unlock } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import type { FolderTreeViewportRenderNodeInput as ValidatorListNodeItemProps } from '@/features/foldertree/public';
import { Badge, TreeContextMenu, TreeRow } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { VALIDATOR_SCOPE_LABELS } from '../validator-scope';
import { fromValidatorListNodeId } from './validator-list-master-tree';
import { useValidatorListTreeContext } from './ValidatorListTreeContext';

export type { ValidatorListNodeItemProps };

export function ValidatorListNodeItem(props: ValidatorListNodeItemProps): React.JSX.Element | null {
  const { node, depth, isSelected, isDragging, select } = props;

  const { listById, onEdit, onToggleLock, onRemove, isPending } = useValidatorListTreeContext();

  const listId = fromValidatorListNodeId(node.id);
  const list = listId ? (listById.get(listId) ?? null) : null;
  if (!list || !listId) return null;

  const scopeLabel = VALIDATOR_SCOPE_LABELS[list.scope] ?? list.scope;

  return (
    <TreeContextMenu
      items={[
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
      ]}
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
        <div
          className='flex h-full w-full min-w-0 items-center gap-1.5 text-left'
        >
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
            aria-label={`Select validator list ${list.name.trim() || 'Unnamed List'}`}
            className='flex min-w-0 flex-1 items-center gap-1.5 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
          >
            <span className='min-w-0 flex-1 truncate font-medium text-gray-100'>
              {list.name.trim() || 'Unnamed List'}
            </span>
            <Badge
              variant='outline'
              className='h-4 px-1 text-[10px] text-gray-400 border-gray-600/50'
            >
              {scopeLabel}
            </Badge>
            {list.deletionLocked ? (
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
          </button>

          <span className='ml-1 flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'>
            <button
              type='button'
              className={cn(
                'inline-flex items-center justify-center rounded p-0.5 transition',
                'hover:bg-gray-700/60 text-gray-400',
                isPending && 'pointer-events-none opacity-40'
              )}
              onMouseDown={(event: React.MouseEvent<HTMLButtonElement>): void => {
                event.stopPropagation();
              }}
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
            <button
              type='button'
              className={cn(
                'inline-flex items-center justify-center rounded p-0.5 transition',
                'text-gray-400',
                list.deletionLocked
                  ? 'hover:bg-emerald-500/15 hover:text-emerald-300'
                  : 'hover:bg-amber-500/15 hover:text-amber-300',
                isPending && 'pointer-events-none opacity-40'
              )}
              onMouseDown={(event: React.MouseEvent<HTMLButtonElement>): void => {
                event.stopPropagation();
              }}
              onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                event.stopPropagation();
                onToggleLock(listId);
              }}
              title={list.deletionLocked ? 'Unlock' : 'Lock'}
              aria-label={list.deletionLocked ? 'Unlock list' : 'Lock list'}
              disabled={isPending}
            >
              {list.deletionLocked ? <Unlock className='size-3' /> : <Lock className='size-3' />}
            </button>
            <button
              type='button'
              className={cn(
                'inline-flex items-center justify-center rounded p-0.5 transition',
                list.deletionLocked
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:bg-red-500/20 hover:text-red-300',
                isPending && 'pointer-events-none opacity-40'
              )}
              onMouseDown={(event: React.MouseEvent<HTMLButtonElement>): void => {
                event.stopPropagation();
              }}
              onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                event.stopPropagation();
                if (!list.deletionLocked) onRemove(list);
              }}
              title={list.deletionLocked ? 'Unlock list before removing' : 'Remove list'}
              aria-label={list.deletionLocked ? 'Unlock list before removing' : 'Remove list'}
              disabled={list.deletionLocked || isPending}
            >
              <Trash2 className='size-3' />
            </button>
            <Link
              href={`/admin/validator?list=${encodeURIComponent(listId)}`}
              className={cn(
                'inline-flex items-center justify-center rounded p-0.5 transition',
                'text-gray-400 hover:bg-sky-500/15 hover:text-sky-300'
              )}
              onMouseDown={(event: React.MouseEvent): void => {
                event.stopPropagation();
              }}
              onClick={(event: React.MouseEvent): void => {
                event.stopPropagation();
              }}
              title='Enter list'
              aria-label='Enter list'
            >
              <ExternalLink className='size-3' />
            </Link>
          </span>
        </div>
      </TreeRow>
    </TreeContextMenu>
  );
}
