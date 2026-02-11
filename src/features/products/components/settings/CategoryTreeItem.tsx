'use client';

import { GripVertical } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import type { ProductCategoryWithChildren } from '@/features/products/types';
import { TreeActionButton, TreeActionSlot, TreeCaret, TreeRow } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { DRAG_KEYS, getFirstDragValue, resolveVerticalDropPosition, setDragData } from '@/shared/utils/drag-drop';

import { useCategoryTreeContext } from './CategoryTreeContext';

export type CategoryNodeProps = {
  category: ProductCategoryWithChildren;
  level: number;
};

type DropTarget = 'before' | 'inside' | 'after' | null;

const findCategoryById = (
  categories: ProductCategoryWithChildren[],
  id: string
): ProductCategoryWithChildren | null => {
  for (const category of categories) {
    if (category.id === id) return category;
    const found = findCategoryById(category.children, id);
    if (found) return found;
  }
  return null;
};

const isDescendant = (
  category: ProductCategoryWithChildren,
  targetId: string
): boolean => {
  if (category.id === targetId) return true;
  return category.children.some((child: ProductCategoryWithChildren): boolean =>
    isDescendant(child, targetId)
  );
};

export function CategoryTreeItem({
  category,
  level,
}: CategoryNodeProps): React.JSX.Element {
  const {
    expandedIds,
    onToggleExpand,
    onEdit,
    onDelete,
    onCreateChild,
    draggedId,
    onDragStart,
    onDragEnd,
    onDrop,
    allCategories,
  } = useCategoryTreeContext();
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const hasChildren: boolean = category.children.length > 0;
  const isExpanded: boolean = expandedIds.has(category.id);

  const draggedCategory = useMemo(
    (): ProductCategoryWithChildren | null =>
      draggedId ? findCategoryById(allCategories, draggedId) : null,
    [allCategories, draggedId]
  );

  const canDropToParent = (targetParentId: string | null): boolean => {
    if (!draggedId) return true;
    if (targetParentId === draggedId) return false;
    if (!draggedCategory) return true;
    if (!targetParentId) return true;
    return !isDescendant(draggedCategory, targetParentId);
  };

  const canDropInside: boolean =
    Boolean(draggedId) &&
    draggedId !== category.id &&
    canDropToParent(category.id);
  const siblingParentId = category.parentId ?? null;
  const canDropAsSibling: boolean = Boolean(draggedId) && canDropToParent(siblingParentId);
  const canShowDropIndicator =
    dropTarget === 'inside' ? canDropInside : dropTarget === 'before' || dropTarget === 'after' ? canDropAsSibling : false;
  const dropIndicatorPositionClass =
    dropTarget === 'before'
      ? 'top-[2px]'
      : dropTarget === 'after'
        ? 'bottom-[2px]'
        : 'top-1/2 -translate-y-1/2';
  const dropIndicatorSpanClass =
    dropTarget === 'inside'
      ? 'left-2 right-auto w-9'
      : 'inset-x-3';
  const dragMotionClassName = draggedId ? 'duration-0' : 'duration-200';

  return (
    <div className={`relative transition-[transform,opacity] ease-out ${dragMotionClassName}`}>
      <TreeRow
        tone='primary'
        depth={level}
        data-category-row-id={category.id}
        className={`cursor-pointer active:cursor-grabbing gap-1 transform-gpu transition-[background-color,color,transform,box-shadow] ease-out ${dragMotionClassName}`}
        dragOver={dropTarget === 'inside' && canDropInside}
        dragOverClassName='bg-transparent'
        onDragOver={(event: React.DragEvent<HTMLDivElement>): void => {
          const droppedId =
            getFirstDragValue(event.dataTransfer, [DRAG_KEYS.CATEGORY_ID], draggedId ?? '') || '';
          if (!droppedId) return;

          event.preventDefault();
          event.stopPropagation();

          const rect = event.currentTarget.getBoundingClientRect();
          const position = resolveVerticalDropPosition(event.clientY, rect, {
            thresholdRatio: 0.36,
          });

          let nextDropTarget: DropTarget = null;
          if (position === 'before' || position === 'after') {
            nextDropTarget = canDropAsSibling ? position : null;
          } else {
            nextDropTarget = canDropInside ? 'inside' : null;
          }

          // Keep before/after state sticky near row edges to avoid boundary flapping.
          if (
            (dropTarget === 'before' || dropTarget === 'after') &&
            (nextDropTarget === 'inside' || nextDropTarget === null)
          ) {
            const stickyInset = Math.max(10, rect.height * 0.18);
            const keepBefore = dropTarget === 'before' && event.clientY - rect.top <= stickyInset;
            const keepAfter = dropTarget === 'after' && rect.bottom - event.clientY <= stickyInset;
            if (keepBefore || keepAfter) {
              nextDropTarget = dropTarget;
            }
          }

          setDropTarget((prev: DropTarget): DropTarget => {
            if (prev === nextDropTarget) return prev;
            return nextDropTarget;
          });
          if (nextDropTarget === null) {
            event.dataTransfer.dropEffect = 'none';
          } else {
            event.dataTransfer.dropEffect = 'move';
          }
        }}
        onDragLeave={(event: React.DragEvent<HTMLDivElement>): void => {
          event.stopPropagation();
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
          setDropTarget(null);
        }}
        onDrop={(event: React.DragEvent<HTMLDivElement>): void => {
          event.preventDefault();
          event.stopPropagation();
          const droppedId =
            getFirstDragValue(event.dataTransfer, [DRAG_KEYS.CATEGORY_ID], draggedId ?? '') || '';
          if (!droppedId || droppedId === category.id) {
            setDropTarget(null);
            return;
          }

          const target =
            dropTarget === 'inside'
              ? { parentId: category.id, position: 'inside' as const, targetId: category.id }
              : dropTarget === 'before'
                ? { parentId: siblingParentId, position: 'before' as const, targetId: category.id }
                : dropTarget === 'after'
                  ? { parentId: siblingParentId, position: 'after' as const, targetId: category.id }
                  : null;

          if (!target) {
            setDropTarget(null);
            return;
          }

          if (target.parentId === category.id && !canDropInside) {
            setDropTarget(null);
            return;
          }

          if (target.parentId === siblingParentId && (dropTarget === 'before' || dropTarget === 'after') && !canDropAsSibling) {
            setDropTarget(null);
            return;
          }

          onDrop(droppedId, target);
          setDropTarget(null);
        }}
      >
        <div
          className={cn(
            'pointer-events-none absolute h-px rounded-full bg-slate-200 transition-all duration-150',
            dropIndicatorSpanClass,
            dropIndicatorPositionClass,
            canShowDropIndicator ? 'scale-x-100 opacity-45' : 'scale-x-95 opacity-0'
          )}
        />

        <div
          draggable
          onDragStart={(event: React.DragEvent): void => {
            event.stopPropagation();
            setDragData(
              event.dataTransfer,
              { [DRAG_KEYS.CATEGORY_ID]: category.id },
              { effectAllowed: 'move' }
            );
            onDragStart(category.id);
          }}
          onDragEnd={(): void => {
            setDropTarget(null);
            onDragEnd();
          }}
          onMouseDown={(event: React.MouseEvent): void => event.stopPropagation()}
          onClick={(event: React.MouseEvent): void => event.stopPropagation()}
          className='flex items-center justify-center opacity-0 group-hover:opacity-100'
          aria-label='Drag category'
        >
          <GripVertical className='size-3 shrink-0 cursor-grab text-gray-600 active:cursor-grabbing' />
        </div>

        <TreeCaret
          isOpen={isExpanded}
          hasChildren={hasChildren}
          ariaLabel={isExpanded ? `Collapse ${category.name}` : `Expand ${category.name}`}
          onToggle={hasChildren ? (): void => onToggleExpand(category.id) : undefined}
          placeholderClassName='w-5'
          iconClassName='size-4'
          buttonClassName='hover:bg-gray-700'
        />

        <span className='flex-1 truncate text-sm'>{category.name}</span>

        <TreeActionSlot show='hover' align='inline'>
          <TreeActionButton
            onClick={(event: React.MouseEvent): void => {
              event.stopPropagation();
              onCreateChild(category.id);
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
              onEdit(category);
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
              onDelete(category);
            }}
            size='sm'
            tone='danger'
            className='px-1.5 text-[11px]'
            title='Delete category'
          >
            Delete
          </TreeActionButton>
        </TreeActionSlot>
      </TreeRow>

      {isExpanded && hasChildren && (
        <div>
          {category.children.map((child: ProductCategoryWithChildren): React.JSX.Element => (
            <CategoryTreeItem
              key={child.id}
              category={child}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
