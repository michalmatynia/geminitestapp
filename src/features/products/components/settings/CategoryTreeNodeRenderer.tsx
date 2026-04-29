'use client';

import React from 'react';

import type { ProductCategoryWithChildren } from '@/shared/contracts/products/categories';
import type { FolderTreeViewportRenderNodeInput as CategoryTreeNodeRendererProps } from '@/shared/lib/foldertree/public';
import { TreeActionButton, TreeActionSlot, TreeCaret } from '@/shared/ui/tree';

import { cn } from '@/shared/utils/ui-utils';

import { fromCategoryMasterNodeId } from './category-master-tree';
import {
  type CategoryTreeNodeRuntimeContextValue,
  useCategoryTreeNodeRuntimeContext,
} from './CategoryTreeNodeRuntimeContext';

export type { CategoryTreeNodeRendererProps };

const normalizeTranslatedLabel = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveCategoryTranslatedSubtext = (args: {
  name: string;
  namePl?: string | null;
  nameDe?: string | null;
  nameEn?: string | null;
}): string | null => {
  const baseName = normalizeTranslatedLabel(args.name) ?? args.name.trim();
  const translatedCandidates = [args.namePl, args.nameDe, args.nameEn]
    .map((value) => normalizeTranslatedLabel(value))
    .filter((value): value is string => value !== null);

  return (
    translatedCandidates.find(
      (candidate: string) => candidate.localeCompare(baseName, undefined, { sensitivity: 'accent' }) !== 0
    ) ?? null
  );
};

const hasCategoryMasterId = (value: string | null): value is string =>
  value !== null && value !== '';

export function CategoryTreeNodeRenderer(
  props: CategoryTreeNodeRendererProps
): React.JSX.Element | null {
  const runtime = useCategoryTreeNodeRuntimeContext();

  const categoryId = fromCategoryMasterNodeId(props.node.id);
  if (!hasCategoryMasterId(categoryId)) return null;
  const category = runtime.categoryById.get(categoryId);
  if (category === undefined) return null;

  return <CategoryTreeNodeContent {...props} category={category} runtime={runtime} />;
}

function CategoryTreeNodeContent({
  depth,
  hasChildren,
  isExpanded,
  dropPosition,
  toggleExpand,
  category,
  runtime,
}: CategoryTreeNodeRendererProps & {
  category: ProductCategoryWithChildren;
  runtime: CategoryTreeNodeRuntimeContextValue;
}): React.JSX.Element {
  const showDropLine = dropPosition === 'before' || dropPosition === 'after';
  const translatedSubtext = resolveCategoryTranslatedSubtext({
    name: category.name,
    namePl: category.name_pl,
    nameDe: category.name_de,
    nameEn: category.name_en,
  });
  const title = translatedSubtext !== null ? `${category.name}\n${translatedSubtext}` : category.name;

  return (
    <div className='relative'>
      <div
        className={cn(
          'pointer-events-none absolute inset-x-2 h-px rounded-full transition-opacity duration-150',
          dropPosition === 'before' ? 'top-[2px]' : 'bottom-[2px]',
          runtime.placeholderClasses.lineActive,
          showDropLine ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        data-master-tree-drag-surface='category'
        className={cn(
          'group flex w-full select-none items-center gap-1 rounded px-2 py-1.5 text-left text-sm transition',
          'text-gray-200 hover:bg-muted/40',
          dropPosition === 'inside' ? 'bg-blue-500/10 ring-1 ring-inset ring-blue-500/45' : ''
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        title={title}
      >
        <CategoryDragHandle categoryName={category.name} DragHandleIcon={runtime.DragHandleIcon} />
        <TreeCaret
          isOpen={isExpanded}
          hasChildren={hasChildren}
          onToggle={hasChildren ? toggleExpand : undefined}
          ariaLabel={isExpanded ? `Collapse ${category.name}` : `Expand ${category.name}`}
          placeholderClassName='w-4'
          buttonClassName='hover:bg-gray-700'
          iconClassName='size-3.5'
        />
        <CategoryTreeLabel categoryName={category.name} translatedSubtext={translatedSubtext} />
        <CategoryTreeActions category={category} runtime={runtime} />
      </div>
    </div>
  );
}

function CategoryDragHandle({
  categoryName,
  DragHandleIcon,
}: {
  categoryName: string;
  DragHandleIcon: React.ComponentType<{ className?: string }>;
}): React.JSX.Element {
  return (
    <span
      data-master-tree-drag-handle='category'
      title={`Drag ${categoryName}`}
      className='inline-flex cursor-grab items-center justify-center opacity-0 transition group-hover:opacity-100 active:cursor-grabbing'
    >
      <DragHandleIcon className='size-3 shrink-0 text-gray-500' />
    </span>
  );
}

function CategoryTreeLabel({
  categoryName,
  translatedSubtext,
}: {
  categoryName: string;
  translatedSubtext: string | null;
}): React.JSX.Element {
  return (
    <div className='min-w-0 flex-1'>
      <div className='truncate leading-tight'>{categoryName}</div>
      {translatedSubtext !== null ? (
        <div className='truncate pt-0.5 text-[11px] leading-tight text-gray-400'>
          {translatedSubtext}
        </div>
      ) : null}
    </div>
  );
}

function CategoryTreeActions({
  category,
  runtime,
}: {
  category: ProductCategoryWithChildren;
  runtime: CategoryTreeNodeRuntimeContextValue;
}): React.JSX.Element {
  return (
    <TreeActionSlot show='hover' align='inline'>
      <TreeActionButton
        onClick={(event: React.MouseEvent): void => {
          event.stopPropagation();
          runtime.onCreateCategory(category.id);
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
          runtime.onEditCategory(category);
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
          runtime.onDeleteCategory(category);
        }}
        size='sm'
        tone='danger'
        className='px-1.5 text-[11px]'
        title='Delete category'
      >
        Delete
      </TreeActionButton>
    </TreeActionSlot>
  );
}
