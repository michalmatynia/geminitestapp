'use client';

import React, { useMemo } from 'react';

import type { EntityModalProps } from '@/shared/contracts/ui';
import { type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';

import type { CaseResolverCategory } from '../../types';
import {
  CaseResolverEntitySettingsModal,
  CaseResolverEntitySettingsModalProvider,
} from './CaseResolverEntitySettingsModal';

type CategoryFormData = {
  name: string;
  description: string;
  color: string;
  parentId: string | null;
};

interface CaseResolverCategoryModalProps extends EntityModalProps<CaseResolverCategory> {
  formData: CategoryFormData;
  setFormData: React.Dispatch<React.SetStateAction<CategoryFormData>>;
  parentOptions: { value: string; label: string }[];
  isSaving: boolean;
  onSave: () => void;
}

export function CaseResolverCategoryModal({
  isOpen,
  onClose,
  item,
  formData,
  setFormData,
  parentOptions,
  isSaving,
  onSave,
}: CaseResolverCategoryModalProps): React.JSX.Element | null {
  const fields: SettingsField<CategoryFormData>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        type: 'text',
        placeholder: 'Category name',
        required: true,
      },
      {
        key: 'parentId',
        label: 'Parent Category',
        type: 'select',
        options: [{ value: '__root__', label: 'Root' }, ...parentOptions],
        placeholder: 'Root',
      },
      {
        key: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'Optional description',
      },
      {
        key: 'color',
        label: 'Color',
        type: 'color',
        required: true,
      },
    ],
    [parentOptions]
  );

  const runtimeValue = useMemo(
    () => ({
      isOpen,
      onClose,
      item,
      createTitle: 'Create Category',
      editTitle: 'Edit Category',
      fields,
      formData,
      setFormData,
      onSave,
      isSaving,
      parentNullSentinel: '__root__',
    }),
    [fields, formData, isOpen, isSaving, item, onClose, onSave, setFormData]
  );

  return (
    <CaseResolverEntitySettingsModalProvider value={runtimeValue}>
      <CaseResolverEntitySettingsModal />
    </CaseResolverEntitySettingsModalProvider>
  );
}
