'use client';

import { useQueryClient } from '@tanstack/react-query';
import React, { useState, useEffect, useMemo } from 'react';

import { useAuth } from '@/features/auth/context/AuthContext';
import {
  useAuthUsers,
  useAuthUserSecurity,
  useMockSignIn,
  useRegisterUser,
  useDeleteAuthUser,
  useUpdateAuthUser,
  useUpdateAuthUserSecurity,
} from '@/features/auth/hooks/useAuthQueries';
import type { AuthUserSummary } from '@/features/auth/types';
import {
  AUTH_SETTINGS_KEYS,
  type AuthRole,
  type AuthUserRoleMap,
} from '@/features/auth/utils/auth-management';
import { DEFAULT_AUTH_SECURITY_POLICY } from '@/features/auth/utils/auth-security';
import { logClientError } from '@/features/observability';
import { ApiError } from '@/shared/lib/api-client';
import { invalidateUsers } from '@/shared/lib/query-invalidation';
import { Badge, Button, Checkbox, ConfirmDialog, EmptyState, Input, Label, ListPanel, SectionHeader,  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea, UnifiedSelect, useToast, FormSection, FormModal, FormField } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

type CreateUserForm = typeof EMPTY_CREATE;

const EMPTY_CREATE = { name: '', email: '', password: '', roleId: 'none', verified: false };

const roleOptions = [
  { value: 'none', label: 'Unassigned' },
];

const getSessionUserId = (sessionValue: unknown): string | null => {
  if (typeof sessionValue !== 'object' || sessionValue === null) return null;
  const sessionObject = sessionValue as { user?: unknown };
  if (typeof sessionObject.user !== 'object' || sessionObject.user === null) return null;
  const userObject = sessionObject.user as { id?: unknown };
  return typeof userObject.id === 'string' ? userObject.id : null;
};

export default function AuthUsersPage(): React.JSX.Element {
  const { toast } = useToast();
  const {
    session,
    roles,
    userRoles,
    canReadUsers,
    canManageSecurity,
    isLoading: authLoading,
    updateSetting,
    refetchSettings,
  } = useAuth();

  const [localUserRoles, setLocalUserRoles] = useState<AuthUserRoleMap>({});
  const [search, setSearch] = useState('');
  const [dirtyRoles, setDirtyRoles] = useState(false);
  const queryClient = useQueryClient();

  const [editingUser, setEditingUser] = useState<AuthUserSummary | null>(null);
  const [userToDelete, setUserToDelete] = useState<AuthUserSummary | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editVerified, setEditVerified] = useState(false);
  const [editDisabled, setEditDisabled] = useState(false);
  const [editBanned, setEditBanned] = useState(false);
  const [editAllowedIps, setEditAllowedIps] = useState('');
  const [editMfaEnabled, setEditMfaEnabled] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>(EMPTY_CREATE);

  const [mockEmail, setMockEmail] = useState('');
  const [mockPassword, setMockPassword] = useState('');
  const [mockStatus, setMockStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [mockMessage, setMockMessage] = useState('');
  const [mockOpen, setMockOpen] = useState(false);

  const authUsersQuery = useAuthUsers(canReadUsers);
  const updateAuthUserMutation = useUpdateAuthUser();
  const updateAuthUserSecurityMutation = useUpdateAuthUserSecurity();
  const deleteAuthUserMutation = useDeleteAuthUser();
  const registerUserMutation = useRegisterUser();
  const mockSignInMutation = useMockSignIn();

  const userSecurityQuery = useAuthUserSecurity(canManageSecurity ? editingUser?.id : null);
  const loading = (canReadUsers && authUsersQuery.isPending) || authLoading;
  const loadingSecurity = canManageSecurity && userSecurityQuery.isPending;
  const provider = authUsersQuery.data?.provider ?? 'mongodb';
  const users = useMemo(
    (): AuthUserSummary[] => authUsersQuery.data?.users ?? [],
    [authUsersQuery.data]
  );
  const currentSessionUserId = useMemo(() => getSessionUserId(session), [session]);

  useEffect(() => {
    if (!authUsersQuery.error || !canReadUsers) return;
    logClientError(authUsersQuery.error, { context: { source: 'AuthUsersPage', action: 'loadUsers' } });
    toast('Failed to load users', { variant: 'error' });
  }, [authUsersQuery.error, toast, canReadUsers]);

  useEffect(() => {
    if (!userSecurityQuery.error || !canManageSecurity) return;
    logClientError(userSecurityQuery.error, { context: { source: 'AuthUsersPage', action: 'loadSecurityProfile', userId: editingUser?.id } });
  }, [userSecurityQuery.error, editingUser?.id, canManageSecurity]);

  useEffect(() => {
    setLocalUserRoles(userRoles);
    setDirtyRoles(false);
  }, [userRoles]);

  const filteredUsers = useMemo<AuthUserSummary[]>(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user: AuthUserSummary) => {
      return (
        user.email?.toLowerCase().includes(query) ||
        user.name?.toLowerCase().includes(query) ||
        user.id.toLowerCase().includes(query)
      );
    });
  }, [search, users]);

  const handleRoleChange = (userId: string, roleId: string): void => {
    setLocalUserRoles((prev: AuthUserRoleMap) => {
      const next = { ...prev };
      if (!roleId || roleId === 'none') {
        delete next[userId];
      } else {
        next[userId] = roleId;
      }
      return next;
    });
    setDirtyRoles(true);
  };

  const handleSaveRoles = async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({
        key: AUTH_SETTINGS_KEYS.userRoles,
        value: serializeSetting(localUserRoles),
      });
      setDirtyRoles(false);
      toast('User roles updated', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AuthUsersPage', action: 'saveRoles' } });
      toast('Failed to save user roles', { variant: 'error' });
    }
  };

  const handleOpenEdit = (user: AuthUserSummary): void => {
    setEditingUser(user);
    setEditName(user.name ?? '');
    setEditEmail(user.email ?? '');
    setEditVerified(Boolean(user.emailVerified));
    setEditDisabled(false);
    setEditBanned(false);
    setEditAllowedIps('');
    setEditMfaEnabled(false);
  };

  useEffect(() => {
    if (!userSecurityQuery.data || !editingUser) return;
    setEditDisabled(Boolean(userSecurityQuery.data.disabledAt));
    setEditBanned(Boolean(userSecurityQuery.data.bannedAt));
    setEditAllowedIps((userSecurityQuery.data.allowedIps ?? []).join('\n'));
    setEditMfaEnabled(Boolean(userSecurityQuery.data.mfaEnabled));
  }, [userSecurityQuery.data, editingUser]);

  const handleSaveUser = async (): Promise<void> => {
    if (!editingUser) return;
    if (!editEmail.trim()) {
      toast('Email is required', { variant: 'error' });
      return;
    }
    try {
      const payload: { name?: string | null; email: string | null; emailVerified?: boolean | null } = {
        email: editEmail.trim(),
      };
      if (editName.trim()) {
        payload.name = editName.trim();
      }
      if (editVerified !== Boolean(editingUser.emailVerified)) {
        payload.emailVerified = editVerified;
      }
      await updateAuthUserMutation.mutateAsync({
        userId: editingUser.id,
        input: payload,
      });
      const securityPayload = {
        disabled: editDisabled,
        banned: editBanned,
        allowedIps: editAllowedIps
          .split(/\r?\n|,/)
          .map((entry: string) => entry.trim())
          .filter(Boolean),
      };
      if (canManageSecurity) {
        await updateAuthUserSecurityMutation.mutateAsync({
          userId: editingUser.id,
          input: securityPayload,
        });
      }
      await invalidateUsers(queryClient);
      toast('User updated', { variant: 'success' });
      setEditingUser(null);
    } catch (error) {
      logClientError(error, { context: { source: 'AuthUsersPage', action: 'saveUser', userId: editingUser.id } });
      toast('Failed to update user', { variant: 'error' });
    }
  };

  const handleDisableMfa = async (): Promise<void> => {
    if (!editingUser || !canManageSecurity) return;
    try {
      await updateAuthUserSecurityMutation.mutateAsync({
        userId: editingUser.id,
        input: { disableMfa: true },
      });
      setEditMfaEnabled(false);
      toast('MFA disabled for user', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AuthUsersPage', action: 'disableMfa', userId: editingUser.id } });
      toast('Failed to disable MFA', { variant: 'error' });
    }
  };

  const handleDeleteUser = async (): Promise<void> => {
    if (!userToDelete) return;
    if (userToDelete.id === currentSessionUserId) {
      toast('You cannot delete your own account while signed in.', { variant: 'error' });
      return;
    }
    try {
      await deleteAuthUserMutation.mutateAsync({ userId: userToDelete.id });
      await invalidateUsers(queryClient);
      if (localUserRoles[userToDelete.id]) {
        const nextRoles: AuthUserRoleMap = { ...localUserRoles };
        delete nextRoles[userToDelete.id];
        setLocalUserRoles(nextRoles);
        try {
          await updateSetting.mutateAsync({
            key: AUTH_SETTINGS_KEYS.userRoles,
            value: serializeSetting(nextRoles),
          });
          setDirtyRoles(false);
        } catch (roleUpdateError) {
          logClientError(roleUpdateError, {
            context: {
              source: 'AuthUsersPage',
              action: 'cleanupRoleAfterDelete',
              userId: userToDelete.id,
            },
          });
          setDirtyRoles(true);
        }
      }
      if (editingUser?.id === userToDelete.id) {
        setEditingUser(null);
      }
      toast('User deleted', { variant: 'success' });
      setUserToDelete(null);
    } catch (error) {
      logClientError(error, {
        context: { source: 'AuthUsersPage', action: 'deleteUser', userId: userToDelete.id },
      });
      toast('Failed to delete user', { variant: 'error' });
    }
  };

  const handleCreateUser = async (): Promise<void> => {
    if (!createForm.email.trim() || !createForm.password.trim()) {
      toast('Email and password are required', { variant: 'error' });
      return;
    }
    if (createForm.password.trim().length < DEFAULT_AUTH_SECURITY_POLICY.minPasswordLength) {
      toast(`Password must be at least ${DEFAULT_AUTH_SECURITY_POLICY.minPasswordLength} characters`, {
        variant: 'error',
      });
      return;
    }
    try {
      const registerInput: { email: string; password: string; name?: string } = {
        email: createForm.email.trim(),
        password: createForm.password.trim(),
      };
      const trimmedName: string = createForm.name.trim();
      if (trimmedName) {
        registerInput.name = trimmedName;
      }
      const res = (await registerUserMutation.mutateAsync(registerInput)) as { ok: boolean; payload: { id: string; email: string; name?: string | null; error?: string; details?: { issues?: string[] } } };

      if (!res.ok) {
        const errorPayload = res.payload;
        const details = errorPayload?.details?.issues?.join(' ') ?? '';
        toast(
          errorPayload?.error
            ? `${errorPayload.error}${details ? ` ${details}` : ''}`
            : 'Failed to create user',
          { variant: 'error' }
        );
        return;
      }
      const created = res.payload;

      if (createForm.roleId && createForm.roleId !== 'none') {
        const nextRoles = { ...localUserRoles, [created.id]: createForm.roleId };
        try {
          await updateSetting.mutateAsync({
            key: AUTH_SETTINGS_KEYS.userRoles,
            value: serializeSetting(nextRoles),
          });
          setLocalUserRoles(nextRoles);
          setDirtyRoles(false);
          await refetchSettings();
        } catch (roleError) {
          logClientError(roleError, { context: { source: 'AuthUsersPage', action: 'assignRoleAfterCreate', userId: created.id, roleId: createForm.roleId } });
        }
      }

      if (createForm.verified) {
        await updateAuthUserMutation.mutateAsync({
          userId: created.id,
          input: { emailVerified: true },
        });
      }

      toast('User created', { variant: 'success' });
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      void authUsersQuery.refetch();
    } catch (error) {
      logClientError(error, { context: { source: 'AuthUsersPage', action: 'createUser' } });
      toast('Failed to create user', { variant: 'error' });
    }
  };

  const handleMockSignIn = async (): Promise<void> => {
    if (!mockEmail.trim() || !mockPassword.trim()) {
      setMockStatus('error');
      setMockMessage('Email and password are required.');
      return;
    }
    try {
      setMockStatus('idle');
      setMockMessage('');
      const res = await mockSignInMutation.mutateAsync({
        email: mockEmail.trim(),
        password: mockPassword,
      });
      if (!res.ok) {
        throw new ApiError('Mock sign-in failed', 400);
      }
      const payload = res.payload as { ok?: boolean; message?: string };
      if (payload.ok) {
        setMockStatus('success');
        setMockMessage(payload.message ?? 'Credentials are valid.');
      } else {
        setMockStatus('error');
        setMockMessage(payload.message ?? 'Sign-in failed. Check credentials.');
      }
    } catch (error) {
      logClientError(error, { context: { source: 'AuthUsersPage', action: 'mockSignIn', email: mockEmail } });
      setMockStatus('error');
      setMockMessage('Sign-in failed. Check server logs.');
    }
  };

  if (!canReadUsers) {
    return (
      <div className='rounded-lg border border-amber-500/40 bg-amber-500/10 p-6 text-sm text-amber-300'>
        You don&apos;t have permission to view user accounts. Ask an admin to grant
        `auth.users.read` or elevate your account.
      </div>
    );
  }

  return (
    <>
      <ListPanel
        header={
          <SectionHeader
            title='Users'
            description={`Manage user accounts and assign roles (provider: ${provider}).`}
            actions={
              <>
                <Button
                  variant='outline'
                  onClick={() => {
                    void authUsersQuery.refetch();
                    void refetchSettings();
                  }}
                  disabled={loading}
                >
                  Refresh
                </Button>
                <Button variant='outline' onClick={() => setMockOpen(true)}>
                  Mock Sign-in
                </Button>
                <Button variant='outline' onClick={() => setCreateOpen(true)}>
                  Create User
                </Button>
                <Button
                  onClick={() => void handleSaveRoles()}
                  disabled={!dirtyRoles || updateSetting.isPending}
                >
                  {updateSetting.isPending ? 'Saving...' : 'Save Roles'}
                </Button>
              </>
            }
          />
        }
        filters={
          <FormSection className='p-4'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <Input
                value={search}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
                placeholder='Search by name, email, or ID'
                className='h-8 text-sm sm:max-w-xs'
              />
              <div className='text-xs text-gray-500'>
                {dirtyRoles ? 'Unsaved role changes' : 'Roles are up to date'}
              </div>
            </div>
          </FormSection>
        }
      >
        {loading ? (
          <div className='rounded-md border border-dashed border-border p-6 text-center text-gray-400'>
            Loading users...
          </div>
        ) : (
          <Table className='text-gray-200'>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className='p-0'>
                    <EmptyState
                      title='No users found'
                      description='Create your first user to get started!'
                      className='border-none'
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user: AuthUserSummary) => (
                  <TableRow key={user.id}>
                    <TableCell className='font-medium'>{user.name ?? 'Unnamed'}</TableCell>
                    <TableCell className='text-gray-300'>{user.email ?? 'No email'}</TableCell>
                    <TableCell>
                      {user.emailVerified ? (
                        <Badge variant='success'>
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant='warning'>
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className='min-w-[180px]'>
                      {(() : React.ReactNode => {
                        const currentRoleId = localUserRoles[user.id];
                        const isValidRole = currentRoleId && roles.some((r: AuthRole) => r.id === currentRoleId);
                        const selectValue = isValidRole ? currentRoleId : 'none';
                        return (
                          <UnifiedSelect
                            options={roleOptions.concat(
                              roles.map((role: AuthRole) => ({ value: role.id, label: role.name }))
                            )}
                            value={selectValue}
                            onValueChange={(value: string) => handleRoleChange(user.id, value)}
                            placeholder='Select role'
                            className='h-8'
                          />
                        );
                      })()}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button variant='ghost' size='sm' onClick={() => handleOpenEdit(user)}>
                        Edit
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='text-red-300 hover:text-red-200'
                        onClick={() => setUserToDelete(user)}
                        disabled={
                          deleteAuthUserMutation.isPending ||
                          user.id === currentSessionUserId
                        }
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </ListPanel>

      <FormModal
        open={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title='Edit User'
        onSave={() => void handleSaveUser()}
        isSaving={updateAuthUserMutation.isPending || updateAuthUserSecurityMutation.isPending}
        size='md'
        actions={
          <Button
            variant='destructive'
            onClick={() => setUserToDelete(editingUser)}
            disabled={
              !editingUser ||
              deleteAuthUserMutation.isPending ||
              editingUser.id === currentSessionUserId
            }
          >
            Delete user
          </Button>
        }
      >
        <div className='space-y-4'>
          <FormField label='Name'>
            <Input
              id='edit-name'
              value={editName}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEditName(event.target.value)}
              className='bg-gray-900 border text-white'
            />
          </FormField>
          <FormField label='Email'>
            <Input
              id='edit-email'
              value={editEmail}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEditEmail(event.target.value)}
              className='bg-gray-900 border text-white'
            />
          </FormField>
          <div className='flex items-center gap-2'>
            <Checkbox
              id='edit-verified'
              checked={editVerified} onCheckedChange={(checked: boolean | 'indeterminate') => setEditVerified(Boolean(checked))}
              className='h-4 w-4 rounded border bg-gray-900'
            />
            <Label htmlFor='edit-verified' className='text-xs text-gray-300 cursor-pointer'>
              Email verified
            </Label>
          </div>
          <FormSection title='Security controls' variant='subtle' className='p-3 space-y-3'>
            {loadingSecurity ? (
              <div className='text-xs text-gray-500'>Loading security profile...</div>
            ) : null}
            {!canManageSecurity ? (
              <div className='text-xs text-amber-300'>
                You don&apos;t have permission to view or edit security controls.
              </div>
            ) : null}
            <div className='flex items-center gap-2'>
              <Checkbox
                id='edit-disabled'
                checked={editDisabled}
                onCheckedChange={(checked: boolean | 'indeterminate') => setEditDisabled(Boolean(checked))}
                disabled={!canManageSecurity}
                className='h-4 w-4 rounded border bg-gray-900'
              />
              <Label htmlFor='edit-disabled' className='text-xs text-gray-300 cursor-pointer'>
                Disable account
              </Label>
            </div>
            <div className='flex items-center gap-2'>
              <Checkbox
                id='edit-banned'
                checked={editBanned}
                onCheckedChange={(checked: boolean | 'indeterminate') => setEditBanned(Boolean(checked))}
                disabled={!canManageSecurity}
                className='h-4 w-4 rounded border bg-gray-900'
              />
              <Label htmlFor='edit-banned' className='text-xs text-gray-300 cursor-pointer'>
                Ban account
              </Label>
            </div>
            <FormField label='Allowed IPs (optional)'>
              <Textarea
                id='edit-allowed-ips'
                value={editAllowedIps}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setEditAllowedIps(event.target.value)}
                disabled={!canManageSecurity}
                className='min-h-[80px] w-full rounded-md border bg-gray-900 px-3 py-2 text-xs text-white'
                placeholder='One IP per line or comma-separated'
              />
            </FormField>
            <div className='flex items-center justify-between'>
              <div className='text-xs text-gray-500'>
                MFA status: {editMfaEnabled ? 'enabled' : 'disabled'}
              </div>
              {editMfaEnabled ? (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => void handleDisableMfa()}
                  disabled={!canManageSecurity}
                >
                  Disable MFA
                </Button>
              ) : null}
            </div>
          </FormSection>
        </div>
      </FormModal>

      <FormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title='Create User'
        onSave={() => void handleCreateUser()}
        isSaving={registerUserMutation.isPending}
        size='sm'
      >
        <div className='space-y-4'>
          <FormField label='Name'>
            <Input
              id='create-name'
              value={createForm.name}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setCreateForm((prev: CreateUserForm) => ({ ...prev, name: event.target.value }))
              }
              className='bg-gray-900 border text-white'
            />
          </FormField>
          <FormField label='Email'>
            <Input
              id='create-email'
              value={createForm.email}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setCreateForm((prev: CreateUserForm) => ({ ...prev, email: event.target.value }))
              }
              className='bg-gray-900 border text-white'
            />
          </FormField>
          <FormField label='Temporary password'>
            <Input
              id='create-password'
              type='password'
              value={createForm.password}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setCreateForm((prev: CreateUserForm) => ({ ...prev, password: event.target.value }))
              }
              className='bg-gray-900 border text-white'
            />
          </FormField>
          <FormField label='Role'>
            <UnifiedSelect
              options={roleOptions.concat(
                roles.map((role: AuthRole) => ({ value: role.id, label: role.name }))
              )}
              value={createForm.roleId}
              onValueChange={(value: string) =>
                setCreateForm((prev: CreateUserForm) => ({ ...prev, roleId: value }))
              }
              placeholder='Select role'
            />
          </FormField>
          <div className='flex items-center gap-2'>
            <Checkbox
              id='create-verified'
              checked={createForm.verified} onCheckedChange={(checked: boolean | 'indeterminate') =>
                setCreateForm((prev: CreateUserForm) => ({
                  ...prev,
                  verified: Boolean(checked),
                }))
              }
              className='h-4 w-4 rounded border bg-gray-900'
            />
            <Label htmlFor='create-verified' className='text-xs text-gray-300 cursor-pointer'>
              Mark email as verified
            </Label>
          </div>
        </div>
      </FormModal>

      <FormModal
        open={mockOpen}
        onClose={() => setMockOpen(false)}
        title='Mock Sign-in'
        onSave={() => void handleMockSignIn()}
        isSaving={mockSignInMutation.isPending}
        saveText='Test Sign-in'
        size='sm'
      >
        <div className='space-y-4'>
          <p className='text-xs text-gray-400'>
            Verify credentials against MongoDB without changing your session.
          </p>
          <FormField label='Email'>
            <Input
              id='mock-email'
              value={mockEmail}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setMockEmail(event.target.value)}
              className='bg-gray-900 border text-white'
            />
          </FormField>
          <FormField label='Password'>
            <Input
              id='mock-password'
              type='password'
              value={mockPassword}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setMockPassword(event.target.value)}
              className='bg-gray-900 border text-white'
            />
          </FormField>
          {mockStatus !== 'idle' ? (
            <div
              className={`rounded-md border px-3 py-2 text-xs ${
                mockStatus === 'success'
                  ? 'border-green-500/40 bg-green-500/10 text-green-200'
                  : 'border-red-500/40 bg-red-500/10 text-red-200'
              }`}
            >
              {mockMessage}
            </div>
          ) : null}
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(userToDelete)}
        onOpenChange={(open: boolean) => {
          if (!open) setUserToDelete(null);
        }}
        title='Delete user'
        description={
          userToDelete?.email
            ? `Delete ${userToDelete.email}? This action is permanent and will sign the user out from active sessions.`
            : 'Delete this user? This action is permanent and will sign the user out from active sessions.'
        }
        onConfirm={() => {
          void handleDeleteUser();
        }}
        onCancel={() => setUserToDelete(null)}
        confirmText='Delete user'
        cancelText='Cancel'
        variant='destructive'
        loading={deleteAuthUserMutation.isPending}
      />
    </>
  );
}
