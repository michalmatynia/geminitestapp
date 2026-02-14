'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useCallback, useEffect } from 'react';

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
  type AuthUserRoleMap,
} from '@/features/auth/utils/auth-management';
import { serializeSetting } from '@/shared/utils/settings-json';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/features/observability';
import { invalidateUsers } from '@/shared/lib/query-invalidation';

type CreateUserForm = { name: string; email: string; password: string; roleId: string; verified: boolean };
const EMPTY_CREATE: CreateUserForm = { name: '', email: '', password: '', roleId: 'none', verified: false };

export function useUsersState() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
  const [editingUser, setEditingUser] = useState<AuthUserSummary | null>(null);
  const [userToDelete, setUserToDelete] = useState<AuthUserSummary | null>(null);
  
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>(EMPTY_CREATE);

  const authUsersQuery = useAuthUsers(canReadUsers);
  const userSecurityQuery = useAuthUserSecurity(canManageSecurity ? editingUser?.id : null);
  
  const updateAuthUserMutation = useUpdateAuthUser();
  const updateAuthUserSecurityMutation = useUpdateAuthUserSecurity();
  const deleteAuthUserMutation = useDeleteAuthUser();
  const registerUserMutation = useRegisterUser();
  const mockSignInMutation = useMockSignIn();

  useEffect(() => {
    setLocalUserRoles(userRoles);
    setDirtyRoles(false);
  }, [userRoles]);

  const users = authUsersQuery.data?.users ?? [];
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => 
      u.email?.toLowerCase().includes(q) || 
      u.name?.toLowerCase().includes(q) || 
      u.id.toLowerCase().includes(q)
    );
  }, [search, users]);

  const handleRoleChange = useCallback((userId: string, roleId: string) => {
    setLocalUserRoles(prev => {
      const next = { ...prev };
      if (!roleId || roleId === 'none') delete next[userId];
      else next[userId] = roleId;
      return next;
    });
    setDirtyRoles(true);
  }, []);

  const saveRoles = async () => {
    try {
      await updateSetting.mutateAsync({
        key: AUTH_SETTINGS_KEYS.userRoles,
        value: serializeSetting(localUserRoles),
      });
      setDirtyRoles(false);
      toast('User roles updated', { variant: 'success' });
    } catch (e) {
      toast('Failed to save roles', { variant: 'error' });
    }
  };

  const deleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteAuthUserMutation.mutateAsync({ userId: userToDelete.id });
      await invalidateUsers(queryClient);
      toast('User deleted', { variant: 'success' });
      setUserToDelete(null);
    } catch (e) {
      toast('Failed to delete user', { variant: 'error' });
    }
  };

  return {
    users,
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
    isLoading: authUsersQuery.isPending || authLoading,
    isFetching: authUsersQuery.isFetching,
    canReadUsers,
    canManageSecurity,
    roles,
    provider: authUsersQuery.data?.provider ?? 'mongodb',
    refetch: () => {
      authUsersQuery.refetch();
      refetchSettings();
    },
    userSecurity: userSecurityQuery.data,
    loadingSecurity: userSecurityQuery.isPending,
    mutations: {
      updateUser: updateAuthUserMutation,
      updateSecurity: updateAuthUserSecurityMutation,
      deleteUser: deleteAuthUserMutation,
      register: registerUserMutation,
      mockSignIn: mockSignInMutation,
    }
  };
}
