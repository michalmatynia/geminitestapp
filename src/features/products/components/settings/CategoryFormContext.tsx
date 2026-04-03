'use client';

import React from 'react';

import type { Catalog } from '@/shared/contracts/products';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

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

const {
  Context: CategoryFormContext,
  useStrictContext: useCategoryFormContext,
} = createStrictContext<CategoryFormContextValue>({
  hookName: 'useCategoryFormContext',
  providerName: 'CategoryFormProvider',
  displayName: 'CategoryFormContext',
  errorFactory: internalError,
});

export function CategoryFormProvider({
  value,
  children,
}: {
  value: CategoryFormContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return <CategoryFormContext.Provider value={value}>{children}</CategoryFormContext.Provider>;
}

export { useCategoryFormContext };
