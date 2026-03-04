'use client';

import React from 'react';

import type { FolderTreeViewportRenderNodeInput } from '@/features/foldertree/v2';
import { TreeActionButton, TreeActionSlot, TreeCaret } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { fromCategoryMasterNodeId } from './category-master-tree';
import { useCategoryTreeNodeRuntimeContext } from './CategoryTreeNodeRuntimeContext';

export type CategoryTreeNodeRendererProps = FolderTreeViewportRenderNodeInput;

export function CategoryTreeNodeRenderer({
  node,
  depth,
  hasChildren,
  isExpanded,
  dropPosition,
  toggleExpand,
}: CategoryTreeNodeRendererProps): React.JSX.Element | null {
  const {
    categoryById,
    placeholderClasses,
    DragHandleIcon,
    onCreateCategory,
    onEditCategory,
    onDeleteCategory,
  } = useCategoryTreeNodeRuntimeContext();

  const categoryId = fromCategoryMasterNodeId(node.id);
  if (!categoryId) return null;
  const category = categoryById.get(categoryId);
  if (!category) return null;

  const showDropLine = dropPosition === 'before' || dropPosition === 'after';

  return (
    <div className='relative'>
      <div
        className={cn(
          'pointer-events-none absolute inset-x-2 h-px rounded-full transition-opacity duration-150',
          dropPosition === 'before' ? 'top-[2px]' : 'bottom-[2px]',
          placeholderClasses.lineActive,
          showDropLine ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        className={cn(
          'group flex w-full select-none items-center gap-1 rounded px-2 py-1.5 text-left text-sm transition',
          'text-gray-200 hover:bg-muted/40',
          dropPosition === 'inside' ? 'bg-blue-500/10 ring-1 ring-inset ring-blue-500/45' : ''
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        title={category.name}
      >
        <span className='inline-flex cursor-grab items-center justify-center opacity-0 transition group-hover:opacity-100 active:cursor-grabbing'>
          <DragHandleIcon className='size-3 shrink-0 text-gray-500' />
        </span>
        <TreeCaret
          isOpen={isExpanded}
          hasChildren={hasChildren}
          onToggle={hasChildren ? toggleExpand : undefined}
          ariaLabel={isExpanded ? `Collapse ${category.name}` : `Expand ${category.name}`}
          placeholderClassName='w-4'
          buttonClassName='hover:bg-gray-700'
          iconClassName='size-3.5'
        />
        <span className='flex-1 truncate'>{category.name}</span>

        <TreeActionSlot show='hover' align='inline'>
          <TreeActionButton
            onClick={(event: React.MouseEvent): void => {
              event.stopPropagation();
              onCreateCategory(category.id);
            }}
            size='sm'
            tone='muted'
            className='px-1.5 text-[11px]'
            title='Add subcategory'
          >
            Add
          </TreeActionButton>
          <TreeActionButton
            onClick={(event: React.MouseEvent): void => {
              event.stopPropagation();
              onEditCategory(category);
            }}
            size='sm'
            tone='muted'
            className='px-1.5 text-[11px]'
            title='Edit category'
          >
            Edit
          </TreeActionButton>
          <TreeActionButton
            onClick={(event: React.MouseEvent): void => {
              event.stopPropagation();
              onDeleteCategory(category);
            }}
            size='sm'
            tone='danger'
            className='px-1.5 text-[11px]'
            title='Delete category'
          >
            Delete
          </TreeActionButton>
        </TreeActionSlot>
      </div>
    </div>
  );
}
