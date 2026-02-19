'use client';

import React, { useMemo } from 'react';

import type { EntityModalProps } from '@/shared/types/modal-props';
import { SettingsPanelBuilder, type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';

interface MockSignInModalProps extends EntityModalProps<MockSignInFormState> {
  setEmail: (value: string) => void;
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
  item: values,
  setEmail,
  setPassword,
  isSaving,
  onSave,
}: MockSignInModalProps): React.JSX.Element | null {

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
      values={values ?? { email: '', password: '' }}
      onChange={handleChange}
      onSave={async () => onSave()}
      isSaving={isSaving}
      size='sm'
    />
  );
}
