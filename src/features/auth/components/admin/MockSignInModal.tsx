'use client';

import React, { useMemo } from 'react';

import { useToast } from '@/shared/ui';
import { SettingsPanelBuilder, type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';

import { useUsers } from '../../context/UsersContext';

type MockSignInFormState = {
  email: string;
  password: string;
};

export function MockSignInModal(): React.JSX.Element | null {
  const { toast } = useToast();
  const {
    mockOpen: isOpen,
    setMockOpen,
    mockEmail,
    setMockEmail,
    mockPassword,
    setMockPassword,
    mutations,
  } = useUsers();

  const isSaving = mutations.mockSignIn.isPending;
  const onClose = () => setMockOpen(false);

  const values = useMemo(() => ({ email: mockEmail, password: mockPassword }), [mockEmail, mockPassword]);

  const onSave = async () => {
    try {
      const res = await mutations.mockSignIn.mutateAsync({ email: mockEmail, password: mockPassword });
      if (res.ok) toast('Credentials valid', { variant: 'success' });
      else toast('Invalid credentials', { variant: 'error' });
    } catch (_e) {
      toast('Verification failed', { variant: 'error' });
    }
  };

  const fields: SettingsField<MockSignInFormState>[] = useMemo(() => [
    {
      key: 'email',
      label: 'Email',
      type: 'email',
      required: true,
    },
    {
      key: 'password',
      label: 'Password',
      type: 'password',
      required: true,
    }
  ], []);

  const handleChange = (vals: Partial<MockSignInFormState>) => {
    if (vals.email !== undefined) setMockEmail(vals.email);
    if (vals.password !== undefined) setMockPassword(vals.password);
  };

  return (
    <SettingsPanelBuilder
      open={isOpen}
      onClose={onClose}
      title='Identity Validator'
      subtitle='Test authentication against the live identity provider without affecting your current session.'
      saveText='Verify Credentials'
      fields={fields}
      values={values ?? { email: '', password: '' }}
      onChange={handleChange}
      onSave={async () => onSave()}
      isSaving={isSaving}
      size='sm'
    />
  );
}
