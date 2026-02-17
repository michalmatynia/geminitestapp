'use client';

import { 
  UserPlusIcon, 
  ShieldAlertIcon, 
  Trash2, 
  Edit2, 
  ShieldCheck,
  Key,
  Users
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { 
  Button, 
  DataTable, 
  SelectSimple, 
  ListPanel, 
  StatusBadge,
  useToast,
  PanelHeader,
  SearchInput,
  EmptyState
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

import { MockSignInModal } from '../../components/admin/MockSignInModal';
import { UserCreateModal } from '../../components/admin/UserCreateModal';
import { UserEditModal } from '../../components/admin/UserEditModal';
import { useUsersState } from '../../hooks/useUsersState';


import type { AuthUserSummary } from '../../types';
import type { AuthRole } from '../../utils/auth-management';
import type { ColumnDef } from '@tanstack/react-table';

export default function AuthUsersPage(): React.JSX.Element {
  const { toast } = useToast();
  const {
    filteredUsers,
    search,
    setSearch,
    localUserRoles,
    handleRoleChange,
    dirtyRoles,
    saveRoles,
    editingUser,
    setEditingUser,
    userToDelete,
    setUserToDelete,
    deleteUser,
    createOpen,
    setCreateOpen,
    createForm,
    setCreateForm,
    canReadUsers,
    canManageSecurity,
    roles,
    provider,
    refetch,
    isFetching,
    isLoading,
    mutations,
    userSecurity,
    loadingSecurity
  } = useUsersState();

  const [mockOpen, setMockOpen] = useState(false);
  const [mockEmail, setMockEmail] = useState('');
  const [mockPassword, setMockPassword] = useState('');

  const columns = useMemo<ColumnDef<AuthUserSummary>[]>(() => [
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
      cell: ({ row }: { row: { original: AuthUserSummary } }) => <span className='text-xs text-gray-400'>{row.original.email}</span>,
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
              ...roles.map((r: AuthRole) => ({ value: r.id, label: r.name }))
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
        <div className='flex justify-end gap-2'>
          <Button variant='ghost' size='xs' className='h-7 w-7 p-0' onClick={() => setEditingUser(row.original)}>
            <Edit2 className='size-3.5' />
          </Button>
          <Button 
            variant='ghost' 
            size='xs' 
            className='h-7 w-7 p-0 text-rose-400 hover:text-rose-300' 
            onClick={() => setUserToDelete(row.original)}
          >
            <Trash2 className='size-3.5' />
          </Button>
        </div>
      ),
    },
  ], [roles, localUserRoles, handleRoleChange, setEditingUser, setUserToDelete]);

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
            onClick: () => { void saveRoles(); },
          }
        ]}
      />

      <ListPanel
        variant='default'
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
      >
        <DataTable
          columns={columns}
          data={filteredUsers}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              title={search ? 'No users found' : 'Directory empty'}
              description={search ? 'Try adjusting your search terms.' : 'No users have been provisioned in the current directory.'}
            />
          }
        />
      </ListPanel>

      <UserEditModal
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        item={editingUser}
        setEditingUser={setEditingUser}
        isSaving={mutations.updateUser.isPending}
        loadingSecurity={loadingSecurity}
        canManageSecurity={canManageSecurity}
        userSecurity={userSecurity}
        onSave={() => {
          const handleSave = async () => {
            if (!editingUser) return;
            try {
              await mutations.updateUser.mutateAsync({
                userId: editingUser.id,
                input: { name: editingUser.name, email: editingUser.email }
              });
              setEditingUser(null);
              toast('Identity updated successfully', { variant: 'success' });
            } catch (_e) {
              toast('Failed to update identity', { variant: 'error' });
            }
          };
          void handleSave();
        }}
      />

      <UserCreateModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {}}
        createForm={createForm}
        setCreateForm={setCreateForm}
        isSaving={mutations.register.isPending}
        onSave={() => {
          const handleSave = async () => {
            if (!createForm.email || !createForm.password) {
              toast('Email and password required', { variant: 'error' });
              return;
            }
            try {
              await mutations.register.mutateAsync({
                email: createForm.email,
                password: createForm.password,
                name: createForm.name
              });
              setCreateOpen(false);
              setCreateForm({ name: '', email: '', password: '', roleId: 'none', verified: false });
              toast('User provisioned successfully', { variant: 'success' });
              refetch();
            } catch (_e) {
              toast('Provisioning failed', { variant: 'error' });
            }
          };
          void handleSave();
        }}
      />

      <MockSignInModal
        isOpen={mockOpen}
        onClose={() => setMockOpen(false)}
        onSuccess={() => {}}
        email={mockEmail}
        setEmail={setMockEmail}
        password={mockPassword}
        setPassword={setMockPassword}
        isSaving={mutations.mockSignIn.isPending}
        onSave={() => {
          const handleSave = async () => {
            try {
              const res = await mutations.mockSignIn.mutateAsync({ email: mockEmail, password: mockPassword });
              if (res.ok) toast('Credentials valid', { variant: 'success' });
              else toast('Invalid credentials', { variant: 'error' });
            } catch (_e) {
              toast('Verification failed', { variant: 'error' });
            }
          };
          void handleSave();
        }}
      />

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
