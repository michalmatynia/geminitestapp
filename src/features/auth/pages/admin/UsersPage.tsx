'use client';

import { UserPlusIcon, ShieldAlertIcon, ShieldCheck, Key, Users } from 'lucide-react';
import React, { useMemo } from 'react';

import type { AuthRole } from '@/features/auth/utils/auth-management';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { AuthUser as AuthUserSummary } from '@/shared/contracts/auth';
import {
  Button,
  StandardDataTablePanel,
  SelectSimple,
  StatusBadge,
  SearchInput,
  EmptyState,
  ActionMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  PageLayout,
  UI_CENTER_ROW_RELAXED_CLASSNAME,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

import { MockSignInModal } from '../../components/admin/MockSignInModal';
import { UserCreateModal } from '../../components/admin/UserCreateModal';
import { UserEditModal } from '../../components/admin/UserEditModal';
import {
  UsersProvider,
  useUsersData,
  useUsersDialogs,
  useUsersRoles,
  useUsersSearch,
} from '../../context/UsersContext';

import type { ColumnDef } from '@tanstack/react-table';

const ROLE_PLACEHOLDER_OPTION: LabeledOptionDto<string> = {
  value: 'none',
  label: 'Unassigned',
};

export default function AuthUsersPage(): React.JSX.Element {
  return (
    <UsersProvider>
      <AuthUsersPageContent />
    </UsersProvider>
  );
}

function AuthUsersPageContent(): React.JSX.Element {
  const { filteredUsers, isFetching, isLoading, canReadUsers, roles, provider, refetch } =
    useUsersData();
  const { search, setSearch } = useUsersSearch();
  const { localUserRoles, handleRoleChange, dirtyRoles, saveRoles } = useUsersRoles();
  const { setEditingUser, userToDelete, setUserToDelete, deleteUser, setCreateOpen, setMockOpen } =
    useUsersDialogs();
  const roleOptions = useMemo(
    (): Array<LabeledOptionDto<string>> => [
      ROLE_PLACEHOLDER_OPTION,
      ...roles.map((role: AuthRole) => ({ value: role.id, label: role.name })),
    ],
    [roles]
  );

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
              options={roleOptions}
              className='h-7 w-32 text-[10px]'
             ariaLabel='Select option' title='Select option'/>
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
    [localUserRoles, handleRoleChange, roleOptions, setEditingUser, setUserToDelete]
  );

  if (!canReadUsers) {
    return (
      <div className='page-section-tall'>
        <EmptyState
          icon={<ShieldAlertIcon className='size-12 text-rose-500' />}
          title='Access Restricted'
          description='You do not have the required permissions to view the user management console. Please contact a system administrator.'
        />
      </div>
    );
  }

  return (
    <PageLayout
      title='Identity Management'
      description={`Active directory console using ${provider} provider.`}
      icon={<Users className='size-4' />}
      refresh={{
        onRefresh: refetch,
        isRefreshing: isFetching,
      }}
      headerActions={
        <>
          <Button type='button' variant='outline' size='sm' onClick={() => setMockOpen(true)}>
            <Key className='mr-1 size-3.5' />
            Mock Sign-in
          </Button>
          <Button type='button' variant='outline' size='sm' onClick={() => setCreateOpen(true)}>
            <UserPlusIcon className='mr-1 size-3.5' />
            New User
          </Button>
          <Button
            type='button'
            size='sm'
            disabled={!dirtyRoles}
            onClick={() => {
              void saveRoles();
            }}
          >
            <ShieldCheck className='mr-1 size-3.5' />
            {dirtyRoles ? 'Save Changes' : 'Permissions Up-to-date'}
          </Button>
        </>
      }
      containerClassName='mx-auto w-full max-w-none py-10'
    >
      <StandardDataTablePanel
        variant='default'
        columns={columns}
        data={filteredUsers}
        isLoading={isLoading}
        filters={
          <div className={UI_CENTER_ROW_RELAXED_CLASSNAME}>
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
    </PageLayout>
  );
}
