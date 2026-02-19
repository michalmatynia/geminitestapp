'use client';

import React from 'react';

import type { EntityModalProps } from '@/shared/types/modal-props';
import { SettingsPanelBuilder, type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';

export interface UserCreateFormState {
  name: string;
  email: string;
  password: string;
  roleId: string;
  verified: boolean;
}

interface UserCreateModalProps extends EntityModalProps<UserCreateFormState> {
  setCreateForm: React.Dispatch<React.SetStateAction<UserCreateFormState>>;
  isSaving: boolean;
  onSave: () => void;
}

const FIELDS: SettingsField<UserCreateFormState>[] = [
  {
    key: 'name',
    label: 'Full Name',
    type: 'text',
    placeholder: 'Optional display name',
  },
  {
    key: 'email',
    label: 'Email Address',
    type: 'email',
    placeholder: 'user@example.com',
    required: true,
  },
  {
    key: 'password',
    label: 'Initial Password',
    type: 'password',
    placeholder: 'Minimum 8 characters',
    required: true,
  },
];

export function UserCreateModal({
  isOpen,
  onClose,
  item: createForm,
  setCreateForm,
  isSaving,
  onSave,
}: UserCreateModalProps): React.JSX.Element | null {
  const handleChange = (values: Partial<UserCreateFormState>) => {
    setCreateForm(prev => {
      if (!prev) return prev;
      return ({ ...prev, ...values });
    });
  };

  return (
    <SettingsPanelBuilder
      open={isOpen}
      onClose={onClose}
      title='Provision New Account'
      subtitle='New users will be created with the Default Access Policy. You can adjust their specific roles after creation.'
      fields={FIELDS}
      values={createForm || ({} as UserCreateFormState)}
      onChange={handleChange}
      onSave={async () => onSave()}
      isSaving={isSaving}
      size='sm'
    />
  );
}
