'use client';

import React, { createContext, useContext } from 'react';

import type { ProductCategoryWithChildren } from '@/shared/contracts/products';
import type { FolderTreePlaceholderClassSet } from '@/shared/utils';

export type CategoryTreeNodeRuntimeContextValue = {
  categoryById: Map<string, ProductCategoryWithChildren>;
  placeholderClasses: FolderTreePlaceholderClassSet;
  DragHandleIcon: React.ComponentType<{ className?: string }>;
  onCreateCategory: (parentId: string | null) => void;
  onEditCategory: (category: ProductCategoryWithChildren) => void;
  onDeleteCategory: (category: ProductCategoryWithChildren) => void;
};

const CategoryTreeNodeRuntimeContext = createContext<CategoryTreeNodeRuntimeContextValue | null>(
  null
);

export function CategoryTreeNodeRuntimeProvider({
  value,
  children,
}: {
  value: CategoryTreeNodeRuntimeContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <CategoryTreeNodeRuntimeContext.Provider value={value}>
      {children}
    </CategoryTreeNodeRuntimeContext.Provider>
  );
}

export function useCategoryTreeNodeRuntimeContext(): CategoryTreeNodeRuntimeContextValue {
  const context = useContext(CategoryTreeNodeRuntimeContext);
  if (!context) {
    throw new Error(
      'useCategoryTreeNodeRuntimeContext must be used within CategoryTreeNodeRuntimeProvider'
    );
  }
  return context;
}
