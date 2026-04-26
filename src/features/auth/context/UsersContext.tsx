'use client';

import React, { useMemo } from 'react';

import type { AuthUserRoleMap } from '@/features/auth/utils/auth-management';
import type {
  AuthUser as AuthUserSummary,
  AuthRole,
  AuthUserSecurityProfile,
} from '@/shared/contracts/auth';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import { useUsersState, type UseUsersStateReturn } from '../hooks/useUsersState';

const createUsersStrictContext = <T,>(hookName: string, displayName: string): {
  Context: React.Context<T | undefined>;
  useStrictContext: () => T;
} =>
  createStrictContext<T>({
    hookName,
    providerName: 'a UsersProvider',
    displayName,
    errorFactory: internalError,
  });

// --- Granular Contexts ---

export interface UsersData {
  users: AuthUserSummary[];
  filteredUsers: AuthUserSummary[];
  isLoading: boolean;
  isFetching: boolean;
  canReadUsers: boolean;
  canManageSecurity: boolean;
  roles: AuthRole[];
  provider: string;
  refetch: () => void;
  userSecurity: AuthUserSecurityProfile | undefined;
  loadingSecurity: boolean;
  mutations: UseUsersStateReturn['mutations'];
}
export const {
  Context: DataContext,
  useStrictContext: useUsersData,
} = createUsersStrictContext<UsersData>('useUsersData', 'UsersDataContext');

export interface UsersSearch {
  search: string;
  setSearch: (query: string) => void;
}
export const {
  Context: SearchContext,
  useStrictContext: useUsersSearch,
} = createUsersStrictContext<UsersSearch>('useUsersSearch', 'UsersSearchContext');

export interface UsersRoles {
  localUserRoles: AuthUserRoleMap;
  handleRoleChange: (userId: string, roleId: string) => void;
  dirtyRoles: boolean;
  saveRoles: () => Promise<void>;
}
export const {
  Context: RolesContext,
  useStrictContext: useUsersRoles,
} = createUsersStrictContext<UsersRoles>('useUsersRoles', 'UsersRolesContext');

export interface UsersDialogs {
  editingUser: AuthUserSummary | null;
  setEditingUser: React.Dispatch<React.SetStateAction<AuthUserSummary | null>>;
  userToDelete: AuthUserSummary | null;
  setUserToDelete: React.Dispatch<React.SetStateAction<AuthUserSummary | null>>;
  deleteUser: () => Promise<void>;
  createOpen: boolean;
  setCreateOpen: React.Dispatch<React.SetStateAction<boolean>>;
  createForm: UseUsersStateReturn['createForm'];
  setCreateForm: React.Dispatch<React.SetStateAction<UseUsersStateReturn['createForm']>>;
  mockOpen: boolean;
  setMockOpen: React.Dispatch<React.SetStateAction<boolean>>;
  mockEmail: string;
  setMockEmail: (email: string) => void;
  mockPassword: string;
  setMockPassword: (password: string) => void;
}
export const {
  Context: DialogsContext,
  useStrictContext: useUsersDialogs,
} = createUsersStrictContext<UsersDialogs>('useUsersDialogs', 'UsersDialogsContext');

const UsersProviderInternal = ({
  state,
  children,
}: {
  state: UseUsersStateReturn;
  children: React.ReactNode;
}): React.JSX.Element => {
  const dataValue = useMemo<UsersData>(
    () => ({
      users: state.users, filteredUsers: state.filteredUsers, isLoading: state.isLoading,
      isFetching: state.isFetching, canReadUsers: state.canReadUsers, canManageSecurity: state.canManageSecurity,
      roles: state.roles, provider: state.provider, refetch: state.refetch,
      userSecurity: state.userSecurity, loadingSecurity: state.loadingSecurity, mutations: state.mutations,
    }),
    [state.users, state.filteredUsers, state.isLoading, state.isFetching, state.canReadUsers, state.canManageSecurity, state.roles, state.provider, state.refetch, state.userSecurity, state.loadingSecurity, state.mutations]
  );

  const searchValue = useMemo<UsersSearch>(
    () => ({ search: state.search, setSearch: state.setSearch }),
    [state.search, state.setSearch]
  );

  const rolesValue = useMemo<UsersRoles>(
    () => ({ localUserRoles: state.localUserRoles, handleRoleChange: state.handleRoleChange, dirtyRoles: state.dirtyRoles, saveRoles: state.saveRoles }),
    [state.localUserRoles, state.handleRoleChange, state.dirtyRoles, state.saveRoles]
  );

  const dialogsValue = useMemo<UsersDialogs>(
    () => ({
      editingUser: state.editingUser, setEditingUser: state.setEditingUser, userToDelete: state.userToDelete, setUserToDelete: state.setUserToDelete,
      deleteUser: state.deleteUser, createOpen: state.createOpen, setCreateOpen: state.setCreateOpen, createForm: state.createForm, setCreateForm: state.setCreateForm,
      mockOpen: state.mockOpen, setMockOpen: state.setMockOpen, mockEmail: state.mockEmail, setMockEmail: state.setMockEmail, mockPassword: state.mockPassword, setMockPassword: state.setMockPassword,
    }),
    [state.editingUser, state.setEditingUser, state.userToDelete, state.setUserToDelete, state.deleteUser, state.createOpen, state.setCreateOpen, state.createForm, state.setCreateForm, state.mockOpen, state.setMockOpen, state.mockEmail, state.setMockEmail, state.mockPassword, state.setMockPassword]
  );

  return (
    <DataContext.Provider value={dataValue}>
      <SearchContext.Provider value={searchValue}>
        <RolesContext.Provider value={rolesValue}>
          <DialogsContext.Provider value={dialogsValue}>{children}</DialogsContext.Provider>
        </RolesContext.Provider>
      </SearchContext.Provider>
    </DataContext.Provider>
  );
};

export function UsersProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const state = useUsersState();
  return <UsersProviderInternal state={state}>{children}</UsersProviderInternal>;
}
