'use client';

import React, { useMemo } from 'react';

import type { EntityModalProps } from '@/shared/types/modal-props';
import { SettingsPanelBuilder, type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';

import type { CaseResolverTag } from '../../types';

type TagFormData = {
  name: string;
  color: string;
  parentId: string | null;
};

interface CaseResolverTagModalProps extends EntityModalProps<CaseResolverTag> {
  formData: TagFormData;
  setFormData: React.Dispatch<React.SetStateAction<TagFormData>>;
  parentTagOptions: { value: string; label: string }[];
  isSaving: boolean;
  onSave: () => void;
}

export function CaseResolverTagModal({
  isOpen,
  onClose,
  item: editingTag,
  formData,
  setFormData,
  parentTagOptions,
  isSaving,
  onSave,
}: CaseResolverTagModalProps): React.JSX.Element | null {
  const fields: SettingsField<TagFormData>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Name',
      type: 'text',
      placeholder: 'Tag name',
      required: true,
    },
    {
      key: 'color',
      label: 'Color',
      type: 'color',
      required: true,
    },
    {
      key: 'parentId',
      label: 'Parent Tag',
      type: 'select',
      options: [
        { value: '__none__', label: 'No parent (root tag)' },
        ...parentTagOptions,
      ],
      placeholder: 'Select parent tag',
    }
  ], [parentTagOptions]);

  const handleChange = (vals: Partial<TagFormData>) => {
    setFormData(prev => {
      const next = { ...prev, ...vals };
      if (vals.parentId === '__none__') next.parentId = null;
      return next;
    });
  };

  return (
    <SettingsPanelBuilder
      open={isOpen}
      onClose={onClose}
      title={editingTag ? 'Edit Tag' : 'Create Tag'}
      fields={fields}
      values={formData}
      onChange={handleChange}
      onSave={async () => onSave()}
      isSaving={isSaving}
      size='md'
    />
  );
}
