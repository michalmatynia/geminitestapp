'use client';

import {
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Trash2,
} from 'lucide-react';
import React, { useState, useMemo } from 'react';

import type { ProductCategoryWithChildren } from '@/features/products/types';
import {
  Button,
} from '@/shared/ui';
import { DRAG_KEYS, getFirstDragValue, setDragData } from '@/shared/utils/drag-drop';

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
  onDrop: (draggedId: string, targetId: string | null) => void;
  allCategories: ProductCategoryWithChildren[];
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
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const hasChildren: boolean = category.children.length > 0;
  const isExpanded: boolean = expandedIds.has(category.id);

  const canDropHere: boolean = useMemo((): boolean => {
    if (!draggedId) return true;
    if (draggedId === category.id) return false;

    const isDescendant = (
      cat: ProductCategoryWithChildren,
      targetId: string
    ): boolean => {
      if (cat.id === targetId) return true;
      return cat.children.some((child: ProductCategoryWithChildren): boolean => isDescendant(child, targetId));
    };

    const findCategory = (
      cats: ProductCategoryWithChildren[],
      id: string
    ): ProductCategoryWithChildren | null => {
      for (const cat of cats) {
        if (cat.id === id) return cat;
        const found: ProductCategoryWithChildren | null = findCategory(cat.children, id);
        if (found) return found;
      }
      return null;
    };

    const draggedCategory: ProductCategoryWithChildren | null = findCategory(allCategories, draggedId);
    if (!draggedCategory) return true;

    return !isDescendant(draggedCategory, category.id);
  }, [draggedId, category.id, allCategories]);

  return (
    <div>
      <div
        draggable
        onDragStart={(e: React.DragEvent): void => {
          e.stopPropagation();
          setDragData(e.dataTransfer, { [DRAG_KEYS.CATEGORY_ID]: category.id }, { effectAllowed: 'move' });
          onDragStart(category.id);
          const target: HTMLElement = e.currentTarget as HTMLElement;
          target.style.opacity = '0.5';
        }}
        onDragEnd={(e: React.DragEvent): void => {
          const target: HTMLElement = e.currentTarget as HTMLElement;
          target.style.opacity = '1';
          onDragEnd();
        }}
        onDragOver={(e: React.DragEvent): void => {
          e.preventDefault();
          e.stopPropagation();
          if (canDropHere) {
            setIsDragOver(true);
          }
        }}
        onDragLeave={(e: React.DragEvent): void => {
          e.stopPropagation();
          setIsDragOver(false);
        }}
        onDrop={(e: React.DragEvent): void => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          const droppedId: string = getFirstDragValue(e.dataTransfer, [DRAG_KEYS.CATEGORY_ID], draggedId ?? '') || '';
          if (droppedId && canDropHere) {
            onDrop(droppedId, category.id);
          }
        }}
        className={`group flex items-center gap-1 rounded px-2 py-1.5 cursor-pointer active:cursor-grabbing transition ${
          isDragOver && canDropHere
            ? 'bg-emerald-600 text-white'
            : 'text-gray-300 hover:bg-muted/50'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren ? (
          <Button
            onClick={(): void => onToggleExpand(category.id)}
            className='p-0.5 hover:bg-gray-700 rounded'
          >
            {isExpanded ? (
              <ChevronDown className='size-4' />
            ) : (
              <ChevronRight className='size-4' />
            )}
          </Button>
        ) : (
          <div className='w-5' />
        )}

        <div className='flex items-center gap-2 flex-1 min-w-0'>
          <span className='text-sm truncate'>{category.name}</span>
        </div>

        <div className='flex items-center gap-1'>
          <Button
            onClick={(e: React.MouseEvent): void => {
              e.stopPropagation();
              onCreateChild(category.id);
            }}
            className='p-1 hover:bg-gray-700 rounded'
            title='Add subcategory'
          >
            <FolderPlus className='size-3' />
          </Button>
          <Button
            onClick={(e: React.MouseEvent): void => {
              e.stopPropagation();
              onEdit(category);
            }}
            className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-100 hover:bg-gray-700'
            title='Edit category'
          >
            Edit
          </Button>
          <Button
            onClick={(e: React.MouseEvent): void => {
              e.stopPropagation();
              onDelete(category);
            }}
            className='p-1 hover:bg-red-600 rounded'
            title='Delete category'
          >
            <Trash2 className='size-3' />
          </Button>
        </div>
      </div>

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
