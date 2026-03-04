'use client';

import React, { useMemo } from 'react';

import type { EntityModalProps } from '@/shared/contracts/ui';
import { type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';

import type { CaseResolverTag } from '../../types';
import {
  CaseResolverEntitySettingsModal,
  CaseResolverEntitySettingsModalProvider,
} from './CaseResolverEntitySettingsModal';

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
  item,
  formData,
  setFormData,
  parentTagOptions,
  isSaving,
  onSave,
}: CaseResolverTagModalProps): React.JSX.Element | null {
  const fields: SettingsField<TagFormData>[] = useMemo(
    () => [
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
        options: [{ value: '__none__', label: 'No parent (root tag)' }, ...parentTagOptions],
        placeholder: 'Select parent tag',
      },
    ],
    [parentTagOptions]
  );

  const runtimeValue = useMemo(
    () => ({
      isOpen,
      onClose,
      item,
      createTitle: 'Create Tag',
      editTitle: 'Edit Tag',
      fields,
      formData,
      setFormData,
      onSave,
      isSaving,
      parentNullSentinel: '__none__',
    }),
    [fields, formData, isOpen, isSaving, item, onClose, onSave, setFormData]
  );

  return (
    <CaseResolverEntitySettingsModalProvider value={runtimeValue}>
      <CaseResolverEntitySettingsModal />
    </CaseResolverEntitySettingsModalProvider>
  );
}
