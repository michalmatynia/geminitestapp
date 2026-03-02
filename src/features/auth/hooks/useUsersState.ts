'use client';

 

import { useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useState, useMemo, useCallback, useEffect, Dispatch, SetStateAction } from 'react';

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
import { AUTH_SETTINGS_KEYS, type AuthUserRoleMap } from '@/features/auth/utils/auth-management';
import type {
  RegisterResponse,
  AuthUserSecurityProfile,
  AuthUser as AuthUserSummary,
  AuthRole,
} from '@/shared/contracts/auth';
import { invalidateUsers } from '@/shared/lib/query-invalidation';
import { useToast } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

type CreateUserForm = {
  name: string;
  email: string;
  password: string;
  roleId: string;
  verified: boolean;
};
const EMPTY_CREATE: CreateUserForm = {
  name: '',
  email: '',
  password: '',
  roleId: 'none',
  verified: false,
};

export interface UseUsersStateReturn {
  users: AuthUserSummary[];
  filteredUsers: AuthUserSummary[];
  search: string;
  setSearch: (query: string) => void;
  localUserRoles: AuthUserRoleMap;
  handleRoleChange: (userId: string, roleId: string) => void;
  dirtyRoles: boolean;
  saveRoles: () => Promise<void>;
  editingUser: AuthUserSummary | null;
  setEditingUser: Dispatch<SetStateAction<AuthUserSummary | null>>;
  userToDelete: AuthUserSummary | null;
  setUserToDelete: Dispatch<SetStateAction<AuthUserSummary | null>>;
  deleteUser: () => Promise<void>;
  createOpen: boolean;
  setCreateOpen: Dispatch<SetStateAction<boolean>>;
  createForm: CreateUserForm;
  setCreateForm: Dispatch<SetStateAction<CreateUserForm>>;
  mockOpen: boolean;
  setMockOpen: Dispatch<SetStateAction<boolean>>;
  mockEmail: string;
  setMockEmail: (email: string) => void;
  mockPassword: string;
  setMockPassword: (password: string) => void;
  isLoading: boolean;
  isFetching: boolean;
  canReadUsers: boolean;
  canManageSecurity: boolean;
  roles: AuthRole[];
  provider: string;
  refetch: () => void;
  userSecurity: AuthUserSecurityProfile | undefined;
  loadingSecurity: boolean;
  mutations: {
    updateUser: UseMutationResult<
      AuthUserSummary,
      Error,
      {
        userId: string;
        input: { name?: string | null; email?: string | null; emailVerified?: boolean | null };
      }
    >;
    updateSecurity: UseMutationResult<
      AuthUserSecurityProfile,
      Error,
      {
        userId: string;
        input: {
          disabled?: boolean;
          banned?: boolean;
          allowedIps?: string[];
          disableMfa?: boolean;
        };
      }
    >;
    deleteUser: UseMutationResult<{ id: string; deleted: boolean }, Error, { userId: string }>;
    register: UseMutationResult<
      { ok: boolean; payload: RegisterResponse },
      Error,
      {
        email: string;
        password: string;
        name?: string | undefined;
        emailVerified?: boolean | undefined;
      }
    >;
    mockSignIn: UseMutationResult<
      { ok: boolean; payload: { ok?: boolean; message?: string } },
      Error,
      { email: string; password: string }
    >;
  };
}

export function useUsersState(): UseUsersStateReturn {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
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

  const [mockOpen, setMockOpen] = useState(false);
  const [mockEmail, setMockEmail] = useState('');
  const [mockPassword, setMockPassword] = useState('');

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
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.name?.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
    );
  }, [users, search]);


  const handleRoleChange = useCallback((userId: string, roleId: string) => {
    setLocalUserRoles((prev) => {
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
    } catch (_e) {
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
    } catch (_e) {
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
    mockOpen,
    setMockOpen,
    mockEmail,
    setMockEmail,
    mockPassword,
    setMockPassword,
    isLoading: authUsersQuery.isPending || authLoading,
    isFetching: authUsersQuery.isFetching,
    canReadUsers,
    canManageSecurity,
    roles,
    provider: authUsersQuery.data?.provider ?? 'mongodb',
    refetch: () => {
      void authUsersQuery.refetch();
      void refetchSettings();
    },
    userSecurity: userSecurityQuery.data,
    loadingSecurity: userSecurityQuery.isPending,
    mutations: {
      updateUser: updateAuthUserMutation,
      updateSecurity: updateAuthUserSecurityMutation,
      deleteUser: deleteAuthUserMutation,
      register: registerUserMutation,
      mockSignIn: mockSignInMutation,
    },
  };
}
