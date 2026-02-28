 
'use client';

import React, { createContext, useContext, useMemo } from 'react';

import { useUsersState, type UseUsersStateReturn } from '../hooks/useUsersState';
import type {
  AuthUser as AuthUserSummary,
  AuthRole,
  AuthUserSecurityProfile,
} from '@/shared/contracts/auth';
import type { AuthUserRoleMap } from '@/features/auth/utils/auth-management';

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
const DataContext = createContext<UsersData | null>(null);
export const useUsersData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useUsersData must be used within UsersProvider');
  return context;
};

export interface UsersSearch {
  search: string;
  setSearch: (query: string) => void;
}
const SearchContext = createContext<UsersSearch | null>(null);
export const useUsersSearch = () => {
  const context = useContext(SearchContext);
  if (!context) throw new Error('useUsersSearch must be used within UsersProvider');
  return context;
};

export interface UsersRoles {
  localUserRoles: AuthUserRoleMap;
  handleRoleChange: (userId: string, roleId: string) => void;
  dirtyRoles: boolean;
  saveRoles: () => Promise<void>;
}
const RolesContext = createContext<UsersRoles | null>(null);
export const useUsersRoles = () => {
  const context = useContext(RolesContext);
  if (!context) throw new Error('useUsersRoles must be used within UsersProvider');
  return context;
};

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
const DialogsContext = createContext<UsersDialogs | null>(null);
export const useUsersDialogs = () => {
  const context = useContext(DialogsContext);
  if (!context) throw new Error('useUsersDialogs must be used within UsersProvider');
  return context;
};

// --- Legacy Aggregator ---

const UsersContext = createContext<UseUsersStateReturn | undefined>(undefined);

export function UsersProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const state = useUsersState();

  const dataValue = useMemo<UsersData>(
    () => ({
      users: state.users,
      filteredUsers: state.filteredUsers,
      isLoading: state.isLoading,
      isFetching: state.isFetching,
      canReadUsers: state.canReadUsers,
      canManageSecurity: state.canManageSecurity,
      roles: state.roles,
      provider: state.provider,
      refetch: state.refetch,
      userSecurity: state.userSecurity,
      loadingSecurity: state.loadingSecurity,
      mutations: state.mutations,
    }),
    [
      state.users,
      state.filteredUsers,
      state.isLoading,
      state.isFetching,
      state.canReadUsers,
      state.canManageSecurity,
      state.roles,
      state.provider,
      state.refetch,
      state.userSecurity,
      state.loadingSecurity,
      state.mutations,
    ]
  );

  const searchValue = useMemo<UsersSearch>(
    () => ({
      search: state.search,
      setSearch: state.setSearch,
    }),
    [state.search, state.setSearch]
  );

  const rolesValue = useMemo<UsersRoles>(
    () => ({
      localUserRoles: state.localUserRoles,
      handleRoleChange: state.handleRoleChange,
      dirtyRoles: state.dirtyRoles,
      saveRoles: state.saveRoles,
    }),
    [state.localUserRoles, state.handleRoleChange, state.dirtyRoles, state.saveRoles]
  );

  const dialogsValue = useMemo<UsersDialogs>(
    () => ({
      editingUser: state.editingUser,
      setEditingUser: state.setEditingUser,
      userToDelete: state.userToDelete,
      setUserToDelete: state.setUserToDelete,
      deleteUser: state.deleteUser,
      createOpen: state.createOpen,
      setCreateOpen: state.setCreateOpen,
      createForm: state.createForm,
      setCreateForm: state.setCreateForm,
      mockOpen: state.mockOpen,
      setMockOpen: state.setMockOpen,
      mockEmail: state.mockEmail,
      setMockEmail: state.setMockEmail,
      mockPassword: state.mockPassword,
      setMockPassword: state.setMockPassword,
    }),
    [
      state.editingUser,
      state.setEditingUser,
      state.userToDelete,
      state.setUserToDelete,
      state.deleteUser,
      state.createOpen,
      state.setCreateOpen,
      state.createForm,
      state.setCreateForm,
      state.mockOpen,
      state.setMockOpen,
      state.mockEmail,
      state.mockPassword,
      state.setMockPassword,
    ]
  );

  return (
    <DataContext.Provider value={dataValue}>
      <SearchContext.Provider value={searchValue}>
        <RolesContext.Provider value={rolesValue}>
          <DialogsContext.Provider value={dialogsValue}>
            <UsersContext.Provider value={state}>{children}</UsersContext.Provider>
          </DialogsContext.Provider>
        </RolesContext.Provider>
      </SearchContext.Provider>
    </DataContext.Provider>
  );
}

export function useUsers(): UseUsersStateReturn {
  const context = useContext(UsersContext);
  if (context === undefined) {
    throw new Error('useUsers must be used within a UsersProvider');
  }
  return context;
}
