'use client';

import { 
  RefreshCwIcon, 
  UserPlusIcon, 
  ShieldAlertIcon, 
  SearchIcon, 
  Trash2, 
  Edit2, 
  ShieldCheck,
  Key
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { 
  Button, 
  DataTable, 
  Badge, 
  SelectSimple, 
  SectionHeader, 
  ListPanel, 
  Input, 
  ConfirmDialog,
  StatusBadge,
  useToast
} from '@/shared/ui';

import { useUsersState } from '../../hooks/useUsersState';

import { UserEditModal } from '../../components/admin/UserEditModal';
import { UserCreateModal } from '../../components/admin/UserCreateModal';
import { MockSignInModal } from '../../components/admin/MockSignInModal';

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
      <div className='p-12 text-center'>
        <ShieldAlertIcon className='size-12 text-rose-500 mx-auto mb-4' />
        <h2 className='text-lg font-bold text-white mb-2'>Access Restricted</h2>
        <p className='text-sm text-gray-500 max-w-md mx-auto'>You do not have the required permissions to view the user management console. Please contact a system administrator.</p>
      </div>
    );
  }

  return (
    <div className='mx-auto w-full max-w-none py-10 space-y-6'>
      <SectionHeader
        title='Identity Management'
        description={`Active directory console using ${provider} provider.`}
        actions={
          <div className='flex gap-2'>
            <Button variant='outline' size='xs' className='h-8' onClick={refetch} disabled={isFetching}>
              <RefreshCwIcon className={`size-3.5 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant='outline' size='xs' className='h-8' onClick={() => setMockOpen(true)}>
              <Key className='size-3.5 mr-2' />
              Mock Sign-in
            </Button>
            <Button variant='outline' size='xs' className='h-8' onClick={() => setCreateOpen(true)}>
              <UserPlusIcon className='size-3.5 mr-2' />
              New User
            </Button>
            <Button size='xs' className='h-8' onClick={() => { void saveRoles(); }} disabled={!dirtyRoles}>
              <ShieldCheck className='size-3.5 mr-2' />
              {dirtyRoles ? 'Save Changes' : 'Permissions Up-to-date'}
            </Button>
          </div>
        }
      />

      <ListPanel
        variant='flat'
        filters={
          <div className='flex items-center gap-4'>
            <div className='relative flex-1 max-w-sm'>
              <SearchIcon className='absolute left-2.5 top-2.5 size-4 text-gray-500' />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Search users...'
                className='pl-9 h-9 text-sm'
              />
            </div>
            {dirtyRoles && (
              <Badge variant='outline' className='bg-amber-500/10 text-amber-400 border-amber-500/20 py-1'>
                Unsaved Permission Changes
              </Badge>
            )}
          </div>
        }
      >
        <div className='rounded-md border border-border bg-gray-950/20'>
          <DataTable
            columns={columns}
            data={filteredUsers}
            isLoading={isLoading}
          />
        </div>
      </ListPanel>

      <UserEditModal
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        onSuccess={() => {}}
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

      <ConfirmDialog
        open={Boolean(userToDelete)}
        onOpenChange={(open) => !open && setUserToDelete(null)}
        title='Permanently Delete User?'
        description={`This will terminate all active sessions for ${userToDelete?.email} and remove their identity record. This action is irreversible.`}
        confirmText='Destroy Record'
        variant='destructive'
        onConfirm={() => { void deleteUser(); }}
      />
    </div>
  );
}
