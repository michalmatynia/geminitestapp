/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
'use client';

import { UserPlusIcon, ShieldAlertIcon, ShieldCheck, Key, Users } from 'lucide-react';
import React, { useMemo } from 'react';

import type { AuthUser as AuthUserSummary } from '@/shared/contracts/auth';
import {
  StandardDataTablePanel,
  SelectSimple,
  StatusBadge,
  PanelHeader,
  SearchInput,
  EmptyState,
  ActionMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

import { MockSignInModal } from '../../components/admin/MockSignInModal';
import { UserCreateModal } from '../../components/admin/UserCreateModal';
import { UserEditModal } from '../../components/admin/UserEditModal';
import { UsersProvider, useUsers } from '../../context/UsersContext';

import type { AuthRole } from '@/features/auth/utils/auth-management';
import type { ColumnDef } from '@tanstack/react-table';

export default function AuthUsersPage(): React.JSX.Element {
  return (
    <UsersProvider>
      <AuthUsersPageContent />
    </UsersProvider>
  );
}

function AuthUsersPageContent(): React.JSX.Element {
  const {
    filteredUsers,
    search,
    setSearch,
    localUserRoles,
    handleRoleChange,
    dirtyRoles,
    saveRoles,
    setEditingUser,
    userToDelete,
    setUserToDelete,
    deleteUser,
    setCreateOpen,
    setMockOpen,
    canReadUsers,
    roles,
    provider,
    refetch,
    isFetching,
    isLoading,
  } = useUsers();

  const columns = useMemo<ColumnDef<AuthUserSummary>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'User',
        cell: ({ row }: { row: { original: AuthUserSummary } }) => (
          <div className='flex flex-col'>
            <span className='font-medium text-gray-200'>{row.original.name || 'Unnamed User'}</span>
            <span className='text-[10px] text-gray-500 font-mono'>{row.original.id}</span>
          </div>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }: { row: { original: AuthUserSummary } }) => (
          <span className='text-xs text-gray-400'>{row.original.email}</span>
        ),
      },
      {
        accessorKey: 'emailVerified',
        header: 'Verified',
        cell: ({ row }: { row: { original: AuthUserSummary } }) => (
          <StatusBadge
            status={row.original.emailVerified ? 'Verified' : 'Pending'}
            variant={row.original.emailVerified ? 'success' : 'warning'}
            className='text-[9px]'
          />
        ),
      },
      {
        id: 'role',
        header: 'Access Role',
        cell: ({ row }: { row: { original: AuthUserSummary } }) => {
          const currentRoleId = localUserRoles[row.original.id];
          return (
            <SelectSimple
              size='xs'
              value={currentRoleId ?? 'none'}
              onValueChange={(val) => handleRoleChange(row.original.id, val)}
              options={[
                { value: 'none', label: 'Unassigned' },
                ...roles.map((r: AuthRole) => ({ value: r.id, label: r.name })),
              ]}
              className='h-7 w-32 text-[10px]'
            />
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Tools</div>,
        cell: ({ row }: { row: { original: AuthUserSummary } }) => (
          <div className='flex justify-end'>
            <ActionMenu ariaLabel={`Actions for user ${row.original.email}`}>
              <DropdownMenuItem
                onSelect={(event: Event): void => {
                  event.preventDefault();
                  setEditingUser(row.original);
                }}
              >
                Edit Identity
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-destructive focus:text-destructive'
                onSelect={(event: Event): void => {
                  event.preventDefault();
                  setUserToDelete(row.original);
                }}
              >
                Destroy Record
              </DropdownMenuItem>
            </ActionMenu>
          </div>
        ),
      },
    ],
    [roles, localUserRoles, handleRoleChange, setEditingUser, setUserToDelete]
  );

  if (!canReadUsers) {
    return (
      <div className='container mx-auto py-20'>
        <EmptyState
          icon={<ShieldAlertIcon className='size-12 text-rose-500' />}
          title='Access Restricted'
          description='You do not have the required permissions to view the user management console. Please contact a system administrator.'
        />
      </div>
    );
  }

  return (
    <div className='mx-auto w-full max-w-none py-10 space-y-6'>
      <PanelHeader
        title='Identity Management'
        description={`Active directory console using ${provider} provider.`}
        icon={<Users className='size-4' />}
        refreshable={true}
        isRefreshing={isFetching}
        onRefresh={refetch}
        actions={[
          {
            key: 'mock',
            label: 'Mock Sign-in',
            icon: <Key className='size-3.5' />,
            variant: 'outline',
            onClick: () => setMockOpen(true),
          },
          {
            key: 'new',
            label: 'New User',
            icon: <UserPlusIcon className='size-3.5' />,
            variant: 'outline',
            onClick: () => setCreateOpen(true),
          },
          {
            key: 'save',
            label: dirtyRoles ? 'Save Changes' : 'Permissions Up-to-date',
            icon: <ShieldCheck className='size-3.5' />,
            disabled: !dirtyRoles,
            onClick: () => {
              void saveRoles();
            },
          },
        ]}
      />

      <StandardDataTablePanel
        variant='default'
        columns={columns}
        data={filteredUsers}
        isLoading={isLoading}
        filters={
          <div className='flex items-center gap-4'>
            <div className='flex-1 max-w-sm'>
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
                placeholder='Search users...'
                size='sm'
              />
            </div>
            {dirtyRoles && (
              <StatusBadge status='Unsaved Permission Changes' variant='warning' className='py-1' />
            )}
          </div>
        }
        emptyState={
          <EmptyState
            title={search ? 'No users found' : 'Directory empty'}
            description={
              search
                ? 'Try adjusting your search terms.'
                : 'No users have been provisioned in the current directory.'
            }
          />
        }
      />

      <UserEditModal />

      <UserCreateModal />

      <MockSignInModal />

      <ConfirmModal
        isOpen={Boolean(userToDelete)}
        onClose={() => setUserToDelete(null)}
        title='Permanently Delete User?'
        message={`This will terminate all active sessions for ${userToDelete?.email} and remove their identity record. This action is irreversible.`}
        confirmText='Destroy Record'
        isDangerous={true}
        onConfirm={deleteUser}
      />
    </div>
  );
}
