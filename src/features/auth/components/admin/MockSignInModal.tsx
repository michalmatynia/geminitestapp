'use client';

import React from 'react';

import { FormField, FormModal, Input } from '@/shared/ui';
import type { ModalStateProps } from '@/shared/types/modal-props';

interface MockSignInModalProps extends ModalStateProps {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  isSaving: boolean;
  onSave: () => void;
}

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
  if (!isOpen) return null;

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title='Identity Validator'
      saveText='Verify Credentials'
      onSave={onSave}
      isSaving={isSaving}
      size='sm'
    >
      <div className='space-y-4'>
        <p className='text-xs text-gray-500'>Test authentication against the live identity provider without affecting your current session.</p>
        <FormField label='Email'>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        <FormField label='Password'>
          <Input type='password' value={password} onChange={(e) => setPassword(e.target.value)} />
        </FormField>
      </div>
    </FormModal>
  );
}
