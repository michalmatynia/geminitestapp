'use client';

import { useState, type SetStateAction, type Dispatch } from 'react';
import { type UseMutationResult } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/context/AuthContext';
import {
  useAuthUsers,
  useAuthUserSecurity,
} from '@/features/auth/hooks/useAuthQueries';
import { type AuthUserRoleMap } from '@/features/auth/utils/auth-management';
import type {
  RegisterResponse,
  AuthUserSecurityProfile,
  AuthUser as AuthUserSummary,
  AuthRole,
} from '@/shared/contracts/auth';

import {
  type CreateUserForm,
  useUserActions,
  useCreateUserState,
  useMockSignInState,
  useUserMutations,
  useUserSearchState,
  useUserRolesState,
} from './useUsersStateHelpers';

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

const useUserQueriesState = (canReadUsers: boolean, canManageSecurity: boolean, editingUserId: string | null | undefined): {
  authUsersQuery: ReturnType<typeof useAuthUsers>;
  userSecurityQuery: ReturnType<typeof useAuthUserSecurity>;
} => {
  const authUsersQuery = useAuthUsers(canReadUsers);
  const userSecurityQuery = useAuthUserSecurity(canManageSecurity ? (editingUserId ?? null) : null);
  return { authUsersQuery, userSecurityQuery };
};

export function useUsersState(): UseUsersStateReturn {
  const { session, roles, userRoles, canReadUsers, canManageSecurity, isLoading: authLoading, refetchSettings } = useAuth();
  const [editingUser, setEditingUser] = useState<AuthUserSummary | null>(null);
  const [userToDelete, setUserToDelete] = useState<AuthUserSummary | null>(null);
  const { createOpen, setCreateOpen, createForm, setCreateForm } = useCreateUserState();
  const { mockOpen, setMockOpen, mockEmail, setMockEmail, mockPassword, setMockPassword } = useMockSignInState();
  const mutations = useUserMutations();
  const { authUsersQuery, userSecurityQuery } = useUserQueriesState(canReadUsers, canManageSecurity, editingUser?.id);
  const users = authUsersQuery.data?.users ?? [];
  const { search, setSearch, filteredUsers } = useUserSearchState(users);
  const { localUserRoles, dirtyRoles, setDirtyRoles, handleRoleChange } = useUserRolesState(userRoles);
  const { saveRoles, deleteUser } = useUserActions({
    localUserRoles, setDirtyRoles, updateUserRolesMutation: mutations.updateUserRolesMutation,
    deleteAuthUserMutation: mutations.deleteAuthUserMutation, userToDelete, setUserToDelete, session,
  });
  return {
    users, filteredUsers, search, setSearch, localUserRoles, handleRoleChange,
    dirtyRoles, saveRoles, editingUser, setEditingUser, userToDelete, setUserToDelete,
    deleteUser, createOpen, setCreateOpen, createForm, setCreateForm,
    mockOpen, setMockOpen, mockEmail, setMockEmail, mockPassword, setMockPassword,
    isLoading: authUsersQuery.isPending || authLoading,
    isFetching: authUsersQuery.isFetching,
    canReadUsers, canManageSecurity, roles,
    provider: authUsersQuery.data?.provider ?? 'mongodb',
    refetch: () => { void authUsersQuery.refetch(); void refetchSettings(); },
    userSecurity: userSecurityQuery.data, loadingSecurity: userSecurityQuery.isPending,
    mutations: {
      updateUser: mutations.updateAuthUserMutation,
      updateSecurity: mutations.updateAuthUserSecurityMutation,
      deleteUser: mutations.deleteAuthUserMutation,
      register: mutations.registerUserMutation,
      mockSignIn: mutations.mockSignInMutation,
    },
  };
}
