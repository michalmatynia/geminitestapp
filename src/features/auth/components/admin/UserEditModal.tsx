'use client';

import React from 'react';

import type { AuthUser as AuthUserSummary } from '@/shared/contracts/auth';
import { StatusToggle, MetadataItem, LoadingState, ToggleRow, useToast } from '@/shared/ui';
import {
  SettingsPanelBuilder,
  type SettingsField,
} from '@/shared/ui/templates/SettingsPanelBuilder';

import { useUsersData, useUsersDialogs } from '../../context/UsersContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export function UserEditModal(): React.JSX.Element | null {
  const { toast } = useToast();
  const { mutations, loadingSecurity, canManageSecurity, userSecurity } = useUsersData();
  const { editingUser, setEditingUser } = useUsersDialogs();

  const isOpen = Boolean(editingUser);
  const onClose = () => setEditingUser(null);
  const isSaving = mutations.updateUser.isPending;

  const onSave = async () => {
    if (!editingUser) return;
    try {
      await mutations.updateUser.mutateAsync({
        userId: editingUser.id,
        input: { name: editingUser.name, email: editingUser.email },
      });
      setEditingUser(null);
      toast('Identity updated successfully', { variant: 'success' });
    } catch (_e) {
      logClientError(_e);
      toast('Failed to update identity', { variant: 'error' });
    }
  };

  const handleChange = (values: Partial<AuthUserSummary>) => {
    setEditingUser((prev) => (prev ? { ...prev, ...values } : null));
  };

  const fields: SettingsField<AuthUserSummary>[] = [
    {
      key: 'name',
      label: 'Full Name',
      type: 'text',
      placeholder: 'Display name',
    },
    {
      key: 'email',
      label: 'Email Address',
      type: 'email',
      placeholder: 'user@example.com',
    },
    {
      key: 'id',
      label: 'Security & Metadata',
      type: 'custom',
      render: () => (
        <div className='p-4 rounded-md border border-white/5 bg-white/5 space-y-4'>
          {loadingSecurity ? (
            <LoadingState message='Fetching security profile...' className='py-4' size='sm' />
          ) : (
            <div className='space-y-4'>
              <ToggleRow
                label='Manually verify email address'
                checked={Boolean(editingUser?.emailVerified)}
                onCheckedChange={(v) => {
                  setEditingUser((prev: AuthUserSummary | null) =>
                    prev ? { ...prev, emailVerified: v ? new Date().toISOString() : null } : null
                  );
                }}
                className='p-2 bg-transparent border-white/10'
                variant='checkbox'
              />

              {canManageSecurity && (
                <div className='grid gap-3 pt-2 border-t border-white/5'>
                  <div className='flex items-center justify-between p-2 rounded bg-black/20'>
                    <div className='flex flex-col'>
                      <span className='text-xs font-medium text-gray-200'>Account Status</span>
                      <span className='text-[10px] text-gray-500 uppercase'>
                        {userSecurity?.disabledAt ? 'Disabled' : 'Active'}
                      </span>
                    </div>
                    <StatusToggle
                      enabled={!userSecurity?.disabledAt}
                      onToggle={() => {}}
                      disabled
                    />
                  </div>
                </div>
              )}

              <MetadataItem label='System ID' value={editingUser?.id} mono className='p-3' />
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <SettingsPanelBuilder
      open={isOpen}
      onClose={onClose}
      title='Identity Inspector'
      fields={fields}
      values={editingUser || ({} as AuthUserSummary)}
      onChange={handleChange}
      onSave={async () => onSave()}
      isSaving={isSaving}
      size='md'
    />
  );
}
