'use client';

import { createContext, useContext } from 'react';

import type { ProductCategoryWithChildren } from '@/features/products/types';

export type CategoryDropTarget = {
  parentId: string | null;
  position: 'inside' | 'before' | 'after';
  targetId: string | null;
};

type CategoryTreeContextValue = {
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onEdit: (category: ProductCategoryWithChildren) => void;
  onDelete: (category: ProductCategoryWithChildren) => void;
  onCreateChild: (parentId: string) => void;
  draggedId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (draggedId: string, target: CategoryDropTarget) => void;
  allCategories: ProductCategoryWithChildren[];
};

const CategoryTreeContext = createContext<CategoryTreeContextValue | null>(null);

export const CategoryTreeProvider = ({
  value,
  children,
}: {
  value: CategoryTreeContextValue;
  children: React.ReactNode;
}): React.JSX.Element => (
  <CategoryTreeContext.Provider value={value}>
    {children}
  </CategoryTreeContext.Provider>
);

export const useCategoryTreeContext = (): CategoryTreeContextValue => {
  const context = useContext(CategoryTreeContext);
  if (!context) {
    throw new Error('useCategoryTreeContext must be used within CategoryTreeProvider');
  }
  return context;
};
