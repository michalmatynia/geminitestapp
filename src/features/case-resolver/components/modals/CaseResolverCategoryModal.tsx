'use client';

import React, { useMemo } from 'react';

import type { EntityModalProps } from '@/shared/contracts/ui';
import { SettingsPanelBuilder, type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';

import type { CaseResolverCategory } from '../../types';

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
  item: editableCategory,
  formData,
  setFormData,
  parentOptions,
  isSaving,
  onSave,
}: CaseResolverCategoryModalProps): React.JSX.Element | null {
  const fields: SettingsField<CategoryFormData>[] = useMemo(() => [
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
      options: [
        { value: '__root__', label: 'Root' },
        ...parentOptions,
      ],
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
    }
  ], [parentOptions]);

  const handleChange = (vals: Partial<CategoryFormData>) => {
    setFormData(prev => {
      const next = { ...prev, ...vals };
      if (vals.parentId === '__root__') next.parentId = null;
      return next;
    });
  };

  return (
    <SettingsPanelBuilder
      open={isOpen}
      onClose={onClose}
      title={editableCategory ? 'Edit Category' : 'Create Category'}
      fields={fields}
      values={formData}
      onChange={handleChange}
      onSave={async () => onSave()}
      isSaving={isSaving}
      size='md'
    />
  );
}
