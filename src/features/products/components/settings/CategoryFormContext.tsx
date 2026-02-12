'use client';

import { createContext, useContext } from 'react';

import type { Catalog } from '@/features/products/types';
import { internalError } from '@/shared/errors/app-error';

export type CategoryFormData = {
  name: string;
  description: string;
  color: string;
  parentId: string | null;
  catalogId: string;
};

export type CategoryParentOption = { id: string; name: string; level: number };

type CategoryFormContextValue = {
  open: boolean;
  onClose: () => void;
  isEditing: boolean;
  formData: CategoryFormData;
  onFormDataChange: (updater: (prev: CategoryFormData) => CategoryFormData) => void;
  onSave: () => void;
  saving: boolean;
  catalogs: Catalog[];
  onCatalogChange: (catalogId: string) => void;
  parentOptions: CategoryParentOption[];
  loadingCategories: boolean;
  modalCatalogName: string | undefined;
};

const CategoryFormContext = createContext<CategoryFormContextValue | null>(null);

export function CategoryFormProvider({
  value,
  children,
}: {
  value: CategoryFormContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <CategoryFormContext.Provider value={value}>
      {children}
    </CategoryFormContext.Provider>
  );
}

export function useCategoryFormContext(): CategoryFormContextValue {
  const context = useContext(CategoryFormContext);
  if (!context) {
    throw internalError('useCategoryFormContext must be used within CategoryFormProvider');
  }
  return context;
}
