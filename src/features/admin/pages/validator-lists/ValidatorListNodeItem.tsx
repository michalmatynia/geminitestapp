'use client';

import React from 'react';
import { ExternalLink, GripVertical, Lock, Pencil, Trash2, Unlock } from 'lucide-react';
import Link from 'next/link';

import { Badge, TreeContextMenu, TreeRow } from '@/shared/ui';
import { cn, type MasterTreeNode } from '@/shared/utils';

import { VALIDATOR_SCOPE_LABELS } from '../validator-scope';
import { fromValidatorListNodeId } from './validator-list-master-tree';
import { useValidatorListTreeContext } from './ValidatorListTreeContext';

export interface ValidatorListNodeItemProps {
  node: MasterTreeNode;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  isRenaming: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  dropPosition: 'inside' | 'before' | 'after' | null;
  select: () => void;
  toggleExpand: () => void;
}

export function ValidatorListNodeItem({
  node,
  depth,
  isSelected,
  isDragging,
  select,
}: ValidatorListNodeItemProps): React.JSX.Element | null {
  const { listById, onEdit, onToggleLock, onRemove, isPending } =
    useValidatorListTreeContext();

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
          onClick={(event: React.MouseEvent<HTMLDivElement>): void => {
            event.stopPropagation();
            select();
          }}
        >
          <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100'>
            <GripVertical className='size-3.5 shrink-0 cursor-grab text-gray-500' />
          </span>

          {/* List name — linked to the validator page for this list */}
          <Link
            href={`/admin/validator?list=${encodeURIComponent(listId)}`}
            className='min-w-0 flex-1 truncate font-medium text-gray-100 hover:text-white hover:underline'
            onClick={(event: React.MouseEvent): void => event.stopPropagation()}
            title={list.name || 'Unnamed List'}
          >
            {list.name.trim() || 'Unnamed List'}
          </Link>

          <span className='ml-1 flex shrink-0 items-center gap-1'>
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

            {/* Action icons — shown on hover */}
            <span
              className={cn(
                'inline-flex items-center justify-center rounded p-0.5 transition',
                'opacity-0 group-hover:opacity-100 hover:bg-gray-700/60 text-gray-400',
                isPending && 'pointer-events-none opacity-40'
              )}
              onMouseDown={(event: React.MouseEvent<HTMLSpanElement>): void => {
                event.stopPropagation();
              }}
              onClick={(event: React.MouseEvent<HTMLSpanElement>): void => {
                event.stopPropagation();
                onEdit(list);
              }}
              title='Edit list'
              aria-hidden='true'
            >
              <Pencil className='size-3' />
            </span>
            <span
              className={cn(
                'inline-flex items-center justify-center rounded p-0.5 transition',
                'opacity-0 group-hover:opacity-100 text-gray-400',
                list.deletionLocked
                  ? 'hover:bg-emerald-500/15 hover:text-emerald-300'
                  : 'hover:bg-amber-500/15 hover:text-amber-300',
                isPending && 'pointer-events-none opacity-40'
              )}
              onMouseDown={(event: React.MouseEvent<HTMLSpanElement>): void => {
                event.stopPropagation();
              }}
              onClick={(event: React.MouseEvent<HTMLSpanElement>): void => {
                event.stopPropagation();
                onToggleLock(listId);
              }}
              title={list.deletionLocked ? 'Unlock' : 'Lock'}
              aria-hidden='true'
            >
              {list.deletionLocked ? (
                <Unlock className='size-3' />
              ) : (
                <Lock className='size-3' />
              )}
            </span>
            <span
              className={cn(
                'inline-flex items-center justify-center rounded p-0.5 transition',
                'opacity-0 group-hover:opacity-100',
                list.deletionLocked
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:bg-red-500/20 hover:text-red-300',
                isPending && 'pointer-events-none opacity-40'
              )}
              onMouseDown={(event: React.MouseEvent<HTMLSpanElement>): void => {
                event.stopPropagation();
              }}
              onClick={(event: React.MouseEvent<HTMLSpanElement>): void => {
                event.stopPropagation();
                if (!list.deletionLocked) onRemove(list);
              }}
              title={
                list.deletionLocked
                  ? 'Unlock list before removing'
                  : 'Remove list'
              }
              aria-hidden='true'
            >
              <Trash2 className='size-3' />
            </span>
            <Link
              href={`/admin/validator?list=${encodeURIComponent(listId)}`}
              className={cn(
                'inline-flex items-center justify-center rounded p-0.5 transition',
                'opacity-0 group-hover:opacity-100 text-gray-400 hover:bg-sky-500/15 hover:text-sky-300'
              )}
              onMouseDown={(event: React.MouseEvent): void => {
                event.stopPropagation();
              }}
              onClick={(event: React.MouseEvent): void => {
                event.stopPropagation();
              }}
              title='Enter list'
              aria-hidden='true'
            >
              <ExternalLink className='size-3' />
            </Link>
          </span>
        </div>
      </TreeRow>
    </TreeContextMenu>
  );
}
