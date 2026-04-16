'use client';

import React, { useMemo } from 'react';

import { useToast } from '@/shared/ui/primitives.public';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';
import type { SettingsPanelField } from '@/shared/contracts/ui/settings';

import { useUsersData, useUsersDialogs } from '../../context/UsersContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


type MockSignInFormState = {
  email: string;
  password: string;
};

const MOCK_SIGN_IN_FIELDS: SettingsPanelField<MockSignInFormState>[] = [
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
];

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
  const onClose = (): void => setMockOpen(false);

  const values = useMemo(
    () => ({ email: mockEmail, password: mockPassword }),
    [mockEmail, mockPassword]
  );

  const onSave = async (): Promise<void> => {
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

  const handleChange = (vals: Partial<MockSignInFormState>): void => {
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
      fields={MOCK_SIGN_IN_FIELDS}
      values={values}
      onChange={handleChange}
      onSave={onSave}
      isSaving={isSaving}
      size='sm'
    />
  );
}
