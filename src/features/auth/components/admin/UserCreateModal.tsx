'use client';

import React from 'react';

import { useToast } from '@/shared/ui';
import {
  SettingsPanelBuilder,
  type SettingsField,
} from '@/shared/ui/templates/SettingsPanelBuilder';

import { useUsersData, useUsersDialogs } from '../../context/UsersContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export interface UserCreateFormState {
  name: string;
  email: string;
  password: string;
  roleId: string;
  verified: boolean;
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

export function UserCreateModal(): React.JSX.Element | null {
  const { toast } = useToast();
  const { mutations, refetch } = useUsersData();
  const { createOpen: isOpen, setCreateOpen, createForm, setCreateForm } = useUsersDialogs();

  const isSaving = mutations.register.isPending;
  const onClose = () => setCreateOpen(false);

  const onSave = async () => {
    if (!createForm.email || !createForm.password) {
      toast('Email and password required', { variant: 'error' });
      return;
    }
    try {
      await mutations.register.mutateAsync({
        email: createForm.email,
        password: createForm.password,
        name: createForm.name,
      });
      setCreateOpen(false);
      setCreateForm({ name: '', email: '', password: '', roleId: 'none', verified: false });
      toast('User provisioned successfully', { variant: 'success' });
      refetch();
    } catch (_e) {
      logClientError(_e);
      toast('Provisioning failed', { variant: 'error' });
    }
  };

  const handleChange = (values: Partial<UserCreateFormState>) => {
    setCreateForm((prev) => {
      if (!prev) return prev;
      return { ...prev, ...values };
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
