'use client';

import React from 'react';

import { FormField, FormModal, Input } from '@/shared/ui';
import type { ModalStateProps } from '@/shared/types/modal-props';

interface UserCreateModalProps extends ModalStateProps {
  createForm: any;
  setCreateForm: React.Dispatch<React.SetStateAction<any>>;
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
              setCreateForm((p: any) => ({ ...p, name: e.target.value }));
            }}
            placeholder='Optional display name' 
          />
        </FormField>
        <FormField label='Email Address'>
          <Input 
            value={createForm.email} 
            onChange={(e) => {
              setCreateForm((p: any) => ({ ...p, email: e.target.value }));
            }}
            placeholder='user@example.com' 
          />
        </FormField>
        <FormField label='Initial Password'>
          <Input 
            type='password' 
            value={createForm.password} 
            onChange={(e) => {
              setCreateForm((p: any) => ({ ...p, password: e.target.value }));
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
