'use client';

import React from 'react';

import type { ModalStateProps } from '@/shared/types/modal-props';
import { FormField, FormModal, Input } from '@/shared/ui';

export interface UserCreateFormState {
  name: string;
  email: string;
  password: string;
  roleId: string;
  verified: boolean;
}

interface UserCreateModalProps extends ModalStateProps {
  createForm: UserCreateFormState;
  setCreateForm: React.Dispatch<React.SetStateAction<UserCreateFormState>>;
  isSaving: boolean;
  onSave: () => void;
}

export function UserCreateModal({
  isOpen,
  onClose,
  createForm,
  setCreateForm,
  isSaving,
  onSave,
}: UserCreateModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title='Provision New Account'
      onSave={onSave}
      isSaving={isSaving}
      size='sm'
    >
      <div className='space-y-4'>
        <FormField label='Full Name'>
          <Input 
            value={createForm.name} 
            onChange={(e) => {
              setCreateForm((p) => ({ ...p, name: e.target.value }));
            }}
            placeholder='Optional display name' 
          />
        </FormField>
        <FormField label='Email Address'>
          <Input 
            value={createForm.email} 
            onChange={(e) => {
              setCreateForm((p) => ({ ...p, email: e.target.value }));
            }}
            placeholder='user@example.com' 
          />
        </FormField>
        <FormField label='Initial Password'>
          <Input 
            type='password' 
            value={createForm.password} 
            onChange={(e) => {
              setCreateForm((p) => ({ ...p, password: e.target.value }));
            }}
            placeholder='Minimum 8 characters' 
          />
        </FormField>
        <div className='p-3 rounded border border-amber-500/20 bg-amber-500/5 text-[11px] text-amber-300'>
          New users will be created with the Default Access Policy. You can adjust their specific roles after creation.
        </div>
      </div>
    </FormModal>
  );
}
