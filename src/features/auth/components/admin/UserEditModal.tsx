'use client';

import React from 'react';

import type { AuthUserSecurityProfile } from '@/features/auth/api/users';
import type { EntityModalProps } from '@/shared/types/modal-props';
import { Checkbox, FormField, FormModal, Input, Label, StatusToggle } from '@/shared/ui';

import type { AuthUserSummary } from '../../types';

interface UserEditModalProps extends EntityModalProps<AuthUserSummary> {
  setEditingUser: React.Dispatch<React.SetStateAction<AuthUserSummary | null>>;
  isSaving: boolean;
  loadingSecurity: boolean;
  canManageSecurity: boolean;
  userSecurity: AuthUserSecurityProfile | undefined;
  onSave: () => void;
}

export function UserEditModal({
  isOpen,
  onClose,
  item: editingUser,
  setEditingUser,
  isSaving,
  loadingSecurity,
  canManageSecurity,
  userSecurity,
  onSave,
}: UserEditModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title='Identity Inspector'
      onSave={onSave}
      isSaving={isSaving}
      size='md'
    >
      <div className='space-y-6'>
        <div className='grid gap-4 md:grid-cols-2'>
          <FormField label='Full Name'>
            <Input
              value={editingUser?.name ?? ''}
              onChange={(e) => {
                setEditingUser((prev: AuthUserSummary | null) => prev ? { ...prev, name: e.target.value } : null);
              }}
              placeholder='Display name'
            />
          </FormField>
          <FormField label='Email Address'>
            <Input
              value={editingUser?.email ?? ''}
              onChange={(e) => {
                setEditingUser((prev: AuthUserSummary | null) => prev ? { ...prev, email: e.target.value } : null);
              }}
              placeholder='user@example.com'
            />
          </FormField>
        </div>

        <div className='p-4 rounded-md border border-white/5 bg-white/5'>
          {loadingSecurity ? (
            <div className='py-4 text-center text-xs text-gray-500 animate-pulse'>Fetching security profile...</div>
          ) : (
            <div className='space-y-4'>
              <div className='flex items-center gap-3'>
                <Checkbox 
                  id='verified' 
                  checked={Boolean(editingUser?.emailVerified)}
                  onCheckedChange={(v) => {
                    setEditingUser((prev: AuthUserSummary | null) => prev ? { ...prev, emailVerified: v ? new Date().toISOString() : null } : null);
                  }}
                />
                <Label htmlFor='verified' className='text-xs font-medium cursor-pointer text-gray-300'>Manually verify email address</Label>
              </div>
              
              {canManageSecurity && (
                <div className='grid gap-3 pt-2 border-t border-white/5'>
                  <div className='flex items-center justify-between p-2 rounded bg-black/20'>
                    <div className='flex flex-col'>
                      <span className='text-xs font-medium text-gray-200'>Account Status</span>
                      <span className='text-[10px] text-gray-500 uppercase'>{userSecurity?.disabledAt ? 'Disabled' : 'Active'}</span>
                    </div>
                    <StatusToggle enabled={!userSecurity?.disabledAt} onToggle={() => {}} disabled />
                  </div>
                </div>
              )}

              <div className='p-3 rounded border border-white/5 bg-black/20 text-[10px] text-gray-500 uppercase font-bold flex justify-between items-center'>
                <span>System ID</span>
                <span className='font-mono text-gray-400 select-all'>{editingUser?.id}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </FormModal>
  );
}
