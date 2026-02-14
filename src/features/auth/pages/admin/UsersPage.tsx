'use client';

import { 
  RefreshCwIcon, 
  UserPlusIcon, 
  ShieldAlertIcon, 
  SearchIcon, 
  Trash2, 
  Edit2, 
  ShieldCheck,
  UserCheck,
  Shield,
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
  FormField, 
  Input, 
  ConfirmDialog,
  StatusBadge,
  FormModal,
  Checkbox,
  Label,
  Textarea,
  FormSection,
  useToast
} from '@/shared/ui';

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
      cell: ({ row }) => (
        <div className='flex flex-col'>
          <span className='font-medium text-gray-200'>{row.original.name || 'Unnamed User'}</span>
          <span className='text-[10px] text-gray-500 font-mono'>{row.original.id}</span>
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => <span className='text-xs text-gray-400'>{row.original.email}</span>,
    },
    {
      accessorKey: 'emailVerified',
      header: 'Verified',
      cell: ({ row }) => (
        <StatusBadge 
          status={row.original.emailVerified ? 'success' : 'warning'} 
          label={row.original.emailVerified ? 'Verified' : 'Pending'} 
          className='text-[9px]' 
        />
      ),
    },
    {
      id: 'role',
      header: 'Access Role',
      cell: ({ row }) => {
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
      cell: ({ row }) => (
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
    <div className='container mx-auto py-10 space-y-6'>
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
            <Button size='xs' className='h-8' onClick={saveRoles} disabled={!dirtyRoles}>
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

      {/* Edit User Modal */}
      <FormModal
        open={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title='Identity Inspector'
        onSave={async () => {
          if (!editingUser) return;
          try {
            await mutations.updateUser.mutateAsync({
              userId: editingUser.id,
              input: { name: editingUser.name, email: editingUser.email }
            });
            setEditingUser(null);
            toast('Identity updated successfully', { variant: 'success' });
          } catch (e) {
            toast('Failed to update identity', { variant: 'error' });
          }
        }}
        isSaving={mutations.updateUser.isPending}
        size='md'
      >
        <div className='space-y-6'>
          <div className='grid gap-4 md:grid-cols-2'>
            <FormField label='Full Name'>
              <Input
                value={editingUser?.name ?? ''}
                onChange={(e) => setEditingUser(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder='Display name'
              />
            </FormField>
            <FormField label='Email Address'>
              <Input
                value={editingUser?.email ?? ''}
                onChange={(e) => setEditingUser(prev => prev ? { ...prev, email: e.target.value } : null)}
                placeholder='user@example.com'
              />
            </FormField>
          </div>

          <FormSection title='Security & Access' variant='subtle' className='p-4'>
            {loadingSecurity ? (
              <div className='py-4 text-center text-xs text-gray-500 animate-pulse'>Fetching security profile...</div>
            ) : (
              <div className='space-y-4'>
                <div className='flex items-center gap-3'>
                  <Checkbox 
                    id='verified' 
                    checked={Boolean(editingUser?.emailVerified)}
                    onCheckedChange={(v) => setEditingUser(prev => prev ? { ...prev, emailVerified: v ? new Date().toISOString() : null } : null)}
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
          </FormSection>
        </div>
      </FormModal>

      {/* Create User Modal */}
      <FormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title='Provision New Account'
        onSave={async () => {
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
          } catch (e) {
            toast('Provisioning failed', { variant: 'error' });
          }
        }}
        isSaving={mutations.register.isPending}
        size='sm'
      >
        <div className='space-y-4'>
          <FormField label='Full Name'>
            <Input 
              value={createForm.name} 
              onChange={(e) => setCreateForm(p => ({ ...p, name: e.target.value }))}
              placeholder='Optional display name' 
            />
          </FormField>
          <FormField label='Email Address'>
            <Input 
              value={createForm.email} 
              onChange={(e) => setCreateForm(p => ({ ...p, email: e.target.value }))}
              placeholder='user@example.com' 
            />
          </FormField>
          <FormField label='Initial Password'>
            <Input 
              type='password' 
              value={createForm.password} 
              onChange={(e) => setCreateForm(p => ({ ...p, password: e.target.value }))}
              placeholder='Minimum 8 characters' 
            />
          </FormField>
          <div className='p-3 rounded border border-amber-500/20 bg-amber-500/5 text-[11px] text-amber-300'>
            New users will be created with the Default Access Policy. You can adjust their specific roles after creation.
          </div>
        </div>
      </FormModal>

      {/* Mock Sign-in Modal */}
      <FormModal
        open={mockOpen}
        onClose={() => setMockOpen(false)}
        title='Identity Validator'
        saveText='Verify Credentials'
        onSave={async () => {
          try {
            const res = await mutations.mockSignIn.mutateAsync({ email: mockEmail, password: mockPassword });
            if (res.ok) toast('Credentials valid', { variant: 'success' });
            else toast('Invalid credentials', { variant: 'error' });
          } catch (e) {
            toast('Verification failed', { variant: 'error' });
          }
        }}
        isSaving={mutations.mockSignIn.isPending}
        size='sm'
      >
        <div className='space-y-4'>
          <p className='text-xs text-gray-500'>Test authentication against the live identity provider without affecting your current session.</p>
          <FormField label='Email'>
            <Input value={mockEmail} onChange={(e) => setMockEmail(e.target.value)} />
          </FormField>
          <FormField label='Password'>
            <Input type='password' value={mockPassword} onChange={(e) => setMockPassword(e.target.value)} />
          </FormField>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(userToDelete)}
        onOpenChange={(open) => !open && setUserToDelete(null)}
        title='Permanently Delete User?'
        description={`This will terminate all active sessions for ${userToDelete?.email} and remove their identity record. This action is irreversible.`}
        confirmText='Destroy Record'
        variant='destructive'
        onConfirm={deleteUser}
      />
    </div>
  );
}
