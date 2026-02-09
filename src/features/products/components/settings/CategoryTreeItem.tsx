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

  return (
    <div>
      <TreeRow
        tone='primary'
        depth={level}
        className='cursor-pointer active:cursor-grabbing gap-1'
        dragOver={dropTarget === 'inside' && canDropInside}
        dragOverClassName='bg-emerald-600 text-white'
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

          if (position === 'before' || position === 'after') {
            setDropTarget(canDropAsSibling ? position : null);
          } else {
            setDropTarget(canDropInside ? 'inside' : null);
          }
          event.dataTransfer.dropEffect = 'move';
        }}
        onDragLeave={(event: React.DragEvent<HTMLDivElement>): void => {
          event.stopPropagation();
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
        {dropTarget === 'before' && (
          <div className='pointer-events-none absolute inset-x-2 top-0 h-0.5 rounded bg-blue-400/90' />
        )}
        {dropTarget === 'after' && (
          <div className='pointer-events-none absolute inset-x-2 bottom-0 h-0.5 rounded bg-blue-400/90' />
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
