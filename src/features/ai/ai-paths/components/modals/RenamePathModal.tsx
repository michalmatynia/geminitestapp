'use client';

import React from 'react';

import type { EntityModalProps } from '@/shared/contracts/ui';
import {
  SettingsPanelBuilder,
  type SettingsPanelField,
} from '@/shared/contracts/ui';

interface RenamePathModalProps extends EntityModalProps<{ name: string }> {
  setDraftName: (value: string) => void;
  onSave: () => void;
}

type RenameFormState = {
  name: string;
};

const FIELDS: SettingsPanelField<RenameFormState>[] = [
  {
    key: 'name',
    label: 'Path Name',
    type: 'text',
    placeholder: 'e.g. My Automation Path',
    required: true,
  },
];

export function RenamePathModal(props: RenamePathModalProps): React.JSX.Element | null {
  const { isOpen, onClose, item, setDraftName, onSave } = props;

  const values: RenameFormState = { name: item?.name ?? '' };

  const handleChange = (vals: Partial<RenameFormState>) => {
    if (vals.name !== undefined) {
      setDraftName(vals.name);
    }
  };

  return (
    <SettingsPanelBuilder
      open={isOpen}
      onClose={onClose}
      title='Rename Path'
      size='sm'
      fields={FIELDS}
      values={values}
      onChange={handleChange}
      onSave={async () => onSave()}
    />
  );
}
