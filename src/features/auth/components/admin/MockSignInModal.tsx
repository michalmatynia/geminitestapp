'use client';

import React, { useMemo } from 'react';

import type { ModalStateProps } from '@/shared/types/modal-props';
import { SettingsPanelBuilder, type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';

interface MockSignInModalProps extends ModalStateProps {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  isSaving: boolean;
  onSave: () => void;
}

type MockSignInFormState = {
  email: string;
  password: string;
};

export function MockSignInModal({
  isOpen,
  onClose,
  email,
  setEmail,
  password,
  setPassword,
  isSaving,
  onSave,
}: MockSignInModalProps): React.JSX.Element | null {
  const values: MockSignInFormState = { email, password };

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
    if (vals.email !== undefined) setEmail(vals.email);
    if (vals.password !== undefined) setPassword(vals.password);
  };

  return (
    <SettingsPanelBuilder
      open={isOpen}
      onClose={onClose}
      title='Identity Validator'
      subtitle='Test authentication against the live identity provider without affecting your current session.'
      saveText='Verify Credentials'
      fields={fields}
      values={values}
      onChange={handleChange}
      onSave={async () => onSave()}
      isSaving={isSaving}
      size='sm'
    />
  );
}
