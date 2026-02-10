'use client';

import { GripVertical } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import type { ProductCategoryWithChildren } from '@/features/products/types';
import { TreeActionButton, TreeActionSlot, TreeCaret, TreeRow } from '@/shared/ui';
import { DRAG_KEYS, getFirstDragValue, resolveVerticalDropPosition, setDragData } from '@/shared/utils/drag-drop';

export type CategoryNodeProps = {
  category: ProductCategoryWithChildren;
  level: number;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onEdit: (category: ProductCategoryWithChildren) => void;
  onDelete: (category: ProductCategoryWithChildren) => void;
  onCreateChild: (parentId: string) => void;
  draggedId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (
    draggedId: string,
    target: {
      parentId: string | null;
      position: 'inside' | 'before' | 'after';
      targetId: string | null;
    }
  ) => void;
  allCategories: ProductCategoryWithChildren[];
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
}: CategoryNodeProps): React.JSX.Element {
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
  const showBeforeBoundary: boolean = dropTarget === 'before' && canDropAsSibling;
  const showAfterBoundary: boolean = dropTarget === 'after' && canDropAsSibling;

  return (
    <div className='relative transition-[transform,opacity] duration-200 ease-out'>
      <TreeRow
        tone='primary'
        depth={level}
        data-category-row-id={category.id}
        className='cursor-pointer active:cursor-grabbing gap-1 transition-[background-color,color,transform,box-shadow] duration-200 ease-out'
        dragOver={dropTarget === 'inside' && canDropInside}
        dragOverClassName='bg-emerald-500/18 text-emerald-100 ring-1 ring-emerald-400/45'
        onDragOver={(event: React.DragEvent<HTMLDivElement>): void => {
          const droppedId =
            getFirstDragValue(event.dataTransfer, [DRAG_KEYS.CATEGORY_ID], draggedId ?? '') || '';
          if (!droppedId) return;

          event.preventDefault();
          event.stopPropagation();

          const rect = event.currentTarget.getBoundingClientRect();
          const position = resolveVerticalDropPosition(event.clientY, rect, {
            thresholdRatio: 0.35,
            thresholdPx: 10,
          });

          let nextDropTarget: DropTarget = null;
          if (position === 'before' || position === 'after') {
            nextDropTarget = canDropAsSibling ? position : null;
          } else {
            nextDropTarget = canDropInside ? 'inside' : null;
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
        {showBeforeBoundary && (
          <div className='pointer-events-none absolute inset-x-2 -top-2 h-4 overflow-hidden rounded-md'>
            <div className='h-full w-full bg-gradient-to-b from-emerald-300/70 via-emerald-300/30 to-transparent' />
          </div>
        )}
        {showAfterBoundary && (
          <div className='pointer-events-none absolute inset-x-2 -bottom-2 h-4 overflow-hidden rounded-md'>
            <div className='h-full w-full bg-gradient-to-t from-emerald-300/70 via-emerald-300/30 to-transparent' />
          </div>
        )}

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
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreateChild={onCreateChild}
              draggedId={draggedId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDrop={onDrop}
              allCategories={allCategories}
            />
          ))}
        </div>
      )}
    </div>
  );
}
