'use client';

import React, { useMemo } from 'react';

import type { EntityModalProps } from '@/shared/contracts/ui';
import { SettingsPanelBuilder, type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';

import type { CaseResolverIdentifier } from '../../types';

type CaseIdentifierFormData = {
  name: string;
  color: string;
  parentId: string | null;
};

interface CaseResolverIdentifierModalProps
  extends EntityModalProps<CaseResolverIdentifier> {
  formData: CaseIdentifierFormData;
  setFormData: React.Dispatch<React.SetStateAction<CaseIdentifierFormData>>;
  parentIdentifierOptions: { value: string; label: string }[];
  isSaving: boolean;
  onSave: () => void;
}

export function CaseResolverIdentifierModal({
  isOpen,
  onClose,
  item: editingIdentifier,
  formData,
  setFormData,
  parentIdentifierOptions,
  isSaving,
  onSave,
}: CaseResolverIdentifierModalProps): React.JSX.Element | null {
  const fields: SettingsField<CaseIdentifierFormData>[] = useMemo(() => [
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
    }
  ], [parentIdentifierOptions]);

  const handleChange = (vals: Partial<CaseIdentifierFormData>) => {
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
      title={editingIdentifier ? 'Edit Case Identifier' : 'Create Case Identifier'}
      fields={fields}
      values={formData}
      onChange={handleChange}
      onSave={async () => onSave()}
      isSaving={isSaving}
      size='md'
    />
  );
}
