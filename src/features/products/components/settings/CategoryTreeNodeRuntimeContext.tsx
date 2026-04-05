'use client';

import React from 'react';

import type { ProductCategoryWithChildren } from '@/shared/contracts/products/categories';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import type { FolderTreePlaceholderClassSet } from '@/shared/utils/folder-tree-profiles-v2';

export type CategoryTreeNodeRuntimeContextValue = {
  categoryById: Map<string, ProductCategoryWithChildren>;
  placeholderClasses: FolderTreePlaceholderClassSet;
  DragHandleIcon: React.ComponentType<{ className?: string }>;
  onCreateCategory: (parentId: string | null) => void;
  onEditCategory: (category: ProductCategoryWithChildren) => void;
  onDeleteCategory: (category: ProductCategoryWithChildren) => void;
};

const {
  Context: CategoryTreeNodeRuntimeContext,
  useStrictContext: useCategoryTreeNodeRuntimeContext,
} = createStrictContext<CategoryTreeNodeRuntimeContextValue>({
  hookName: 'useCategoryTreeNodeRuntimeContext',
  providerName: 'CategoryTreeNodeRuntimeProvider',
  displayName: 'CategoryTreeNodeRuntimeContext',
  errorFactory: internalError,
});

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

export { useCategoryTreeNodeRuntimeContext };
