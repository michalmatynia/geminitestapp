'use client';

import React, { useMemo } from 'react';

import { useToast } from '@/shared/ui/primitives.public';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';
import type { SettingsPanelField } from '@/shared/contracts/ui/ui/settings';

import { useUsersData, useUsersDialogs } from '../../context/UsersContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


type MockSignInFormState = {
  email: string;
  password: string;
};

export function MockSignInModal(): React.JSX.Element | null {
  const { toast } = useToast();
  const { mutations } = useUsersData();
  const {
    mockOpen: isOpen,
    setMockOpen,
    mockEmail,
    setMockEmail,
    mockPassword,
    setMockPassword,
  } = useUsersDialogs();

  const isSaving = mutations.mockSignIn.isPending;
  const onClose = () => setMockOpen(false);

  const values = useMemo(
    () => ({ email: mockEmail, password: mockPassword }),
    [mockEmail, mockPassword]
  );

  const onSave = async () => {
    try {
      const res = await mutations.mockSignIn.mutateAsync({
        email: mockEmail,
        password: mockPassword,
      });
      if (res.ok) toast('Credentials valid', { variant: 'success' });
      else toast('Invalid credentials', { variant: 'error' });
    } catch (_e) {
      logClientError(_e);
      toast('Verification failed', { variant: 'error' });
    }
  };

  const fields: SettingsPanelField<MockSignInFormState>[] = useMemo(
    () => [
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
      },
    ],
    []
  );

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
