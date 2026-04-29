'use client';

import React from 'react';

import { FormModal } from '@/shared/ui/FormModal';

import { CategoryFormFields } from './CategoryFormFields';
import { useCategoryFormContext } from './CategoryFormContext';

export function CategoryForm(): React.JSX.Element | null {
  const {
    open,
    onClose,
    isEditing,
    onSave,
    saving,
  } = useCategoryFormContext();

  if (!open) return null;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Category' : 'Create Category'}
      onSave={onSave}
      isSaving={saving}
      size='md'
    >
      <CategoryFormFields />
    </FormModal>
  );
}
