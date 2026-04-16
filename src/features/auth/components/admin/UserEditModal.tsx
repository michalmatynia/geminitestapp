'use client';

import React from 'react';

import type {
  AuthUser as AuthUserSummary,
  AuthUserSecurityProfile,
} from '@/shared/contracts/auth';
import { StatusToggle, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { MetadataItem, LoadingState } from '@/shared/ui/navigation-and-layout.public';
import { useToast } from '@/shared/ui/primitives.public';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';
import type { SettingsPanelField } from '@/shared/contracts/ui/settings';

import { useUsersData, useUsersDialogs } from '../../context/UsersContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const EMPTY_AUTH_USER_SUMMARY: AuthUserSummary = {
  id: '',
  createdAt: '',
  updatedAt: '',
  name: null,
  email: null,
  image: null,
  emailVerified: null,
  provider: '',
};

type UserSecurityMetadataFieldProps = {
  editingUser: AuthUserSummary | null;
  loadingSecurity: boolean;
  canManageSecurity: boolean;
  userSecurity: AuthUserSecurityProfile | undefined;
  setEditingUser: React.Dispatch<React.SetStateAction<AuthUserSummary | null>>;
};

function hasDisabledAt(userSecurity: AuthUserSecurityProfile | undefined): boolean {
  return (
    typeof userSecurity?.disabledAt === 'string' && userSecurity.disabledAt.trim().length > 0
  );
}

function UserSecurityMetadataField({
  editingUser,
  loadingSecurity,
  canManageSecurity,
  userSecurity,
  setEditingUser,
}: UserSecurityMetadataFieldProps): React.JSX.Element {
  const isDisabled = hasDisabledAt(userSecurity);

  if (loadingSecurity) {
    return <LoadingState message='Fetching security profile...' className='py-4' size='sm' />;
  }

  return (
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

      {canManageSecurity ? (
        <div className='grid gap-3 pt-2 border-t border-white/5'>
          <div className='flex items-center justify-between p-2 rounded bg-black/20'>
            <div className='flex flex-col'>
              <span className='text-xs font-medium text-gray-200'>Account Status</span>
              <span className='text-[10px] text-gray-500 uppercase'>
                {isDisabled ? 'Disabled' : 'Active'}
              </span>
            </div>
            <StatusToggle enabled={!isDisabled} onToggle={() => {}} disabled />
          </div>
        </div>
      ) : null}

      <MetadataItem label='System ID' value={editingUser?.id} mono className='p-3' />
    </div>
  );
}

function createUserEditFields(
  props: UserSecurityMetadataFieldProps
): SettingsPanelField<AuthUserSummary>[] {
  return [
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
          <UserSecurityMetadataField {...props} />
        </div>
      ),
    },
  ];
}

export function UserEditModal(): React.JSX.Element | null {
  const { toast } = useToast();
  const { mutations, loadingSecurity, canManageSecurity, userSecurity } = useUsersData();
  const { editingUser, setEditingUser } = useUsersDialogs();

  const isOpen = Boolean(editingUser);
  const onClose = (): void => setEditingUser(null);
  const isSaving = mutations.updateUser.isPending;

  const onSave = async (): Promise<void> => {
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

  const handleChange = (values: Partial<AuthUserSummary>): void => {
    setEditingUser((prev) => (prev ? { ...prev, ...values } : null));
  };

  const fields = createUserEditFields({
    editingUser,
    loadingSecurity,
    canManageSecurity,
    userSecurity,
    setEditingUser,
  });

  return (
    <SettingsPanelBuilder
      open={isOpen}
      onClose={onClose}
      title='Identity Inspector'
      fields={fields}
      values={editingUser ?? EMPTY_AUTH_USER_SUMMARY}
      onChange={handleChange}
      onSave={onSave}
      isSaving={isSaving}
      size='md'
    />
  );
}
