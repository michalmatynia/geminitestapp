'use client';

import React, { useMemo } from 'react';

import type { EntityModalProps } from '@/shared/contracts/ui';
import { type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';

import type { CaseResolverIdentifier } from '../../types';
import {
  CaseResolverEntitySettingsModal,
  CaseResolverEntitySettingsModalProvider,
} from './CaseResolverEntitySettingsModal';

type CaseIdentifierFormData = {
  name: string;
  color: string;
  parentId: string | null;
};

interface CaseResolverIdentifierModalProps extends EntityModalProps<CaseResolverIdentifier> {
  formData: CaseIdentifierFormData;
  setFormData: React.Dispatch<React.SetStateAction<CaseIdentifierFormData>>;
  parentIdentifierOptions: { value: string; label: string }[];
  isSaving: boolean;
  onSave: () => void;
}

export function CaseResolverIdentifierModal({
  isOpen,
  onClose,
  item,
  formData,
  setFormData,
  parentIdentifierOptions,
  isSaving,
  onSave,
}: CaseResolverIdentifierModalProps): React.JSX.Element | null {
  const fields: SettingsField<CaseIdentifierFormData>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        type: 'text',
        placeholder: 'Case identifier name',
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
        label: 'Parent Case Identifier',
        type: 'select',
        options: [
          { value: '__none__', label: 'No parent (root identifier)' },
          ...parentIdentifierOptions,
        ],
        placeholder: 'Select parent case identifier',
      },
    ],
    [parentIdentifierOptions]
  );

  const runtimeValue = useMemo(
    () => ({
      isOpen,
      onClose,
      item,
      createTitle: 'Create Case Identifier',
      editTitle: 'Edit Case Identifier',
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
