'use client';

import { useState, useMemo, useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';
import { type Session } from 'next-auth';
import {
  useRegisterUser,
  useDeleteAuthUser,
  useUpdateAuthUser,
  useUpdateAuthUserSecurity,
  useUpdateAuthUserRoles,
  useMockSignIn,
} from '@/features/auth/hooks/useAuthQueries';
import { type AuthUserRoleMap } from '@/features/auth/utils/auth-management';
import type {
  AuthUser as AuthUserSummary,
} from '@/shared/contracts/auth';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export type CreateUserForm = {
  name: string;
  email: string;
  password: string;
  roleId: string;
  verified: boolean;
};

export const EMPTY_CREATE: CreateUserForm = {
  name: '',
  email: '',
  password: '',
  roleId: 'none',
  verified: false,
};

export const useUserFiltering = (users: AuthUserSummary[], search: string): AuthUserSummary[] => {
  return useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q === '') return users;
    return users.filter(
      (u) =>
        (u.email?.toLowerCase().includes(q) ?? false) ||
        (u.name?.toLowerCase().includes(q) ?? false) ||
        u.id.toLowerCase().includes(q)
    );
  }, [users, search]);
};

export const useUserActions = (args: {
  localUserRoles: AuthUserRoleMap;
  setDirtyRoles: (dirty: boolean) => void;
  updateUserRolesMutation: ReturnType<typeof useUpdateAuthUserRoles>;
  deleteAuthUserMutation: ReturnType<typeof useDeleteAuthUser>;
  userToDelete: AuthUserSummary | null;
  setUserToDelete: (user: AuthUserSummary | null) => void;
  session: Session | null;
}): {
  saveRoles: () => Promise<void>;
  deleteUser: () => Promise<void>;
} => {
  const { toast } = useToast();
  const { localUserRoles, setDirtyRoles, updateUserRolesMutation, deleteAuthUserMutation, userToDelete, setUserToDelete, session } = args;

  const saveRoles = async (): Promise<void> => {
    try {
      await updateUserRolesMutation.mutateAsync({ userRoles: localUserRoles });
      setDirtyRoles(false);
      toast('User roles updated', { variant: 'success' });
    } catch (_e) {
      logClientError(_e);
      toast('Failed to save roles', { variant: 'error' });
    }
  };

  const isDeletingSelf = (userId: string, currentSession: Session | null): boolean => {
    const currentUserId = currentSession?.user?.id;
    return currentUserId !== undefined && currentUserId !== '' && userId === currentUserId;
  };

  const deleteUser = async (): Promise<void> => {
    if (userToDelete === null) return;
    if (isDeletingSelf(userToDelete.id, session)) {
      toast('You cannot delete your own account while signed in.', { variant: 'error' });
      return;
    }
    try {
      await deleteAuthUserMutation.mutateAsync({ userId: userToDelete.id });
      toast('User deleted', { variant: 'success' });
      setUserToDelete(null);
    } catch (error) {
      logClientError(error);
      const errorMsg = error instanceof Error ? error.message.trim() : '';
      toast(errorMsg !== '' ? errorMsg : 'Failed to delete user', { variant: 'error' });
    }
  };

  return { saveRoles, deleteUser };
};

export const useCreateUserState = (): {
  createOpen: boolean;
  setCreateOpen: Dispatch<SetStateAction<boolean>>;
  createForm: CreateUserForm;
  setCreateForm: Dispatch<SetStateAction<CreateUserForm>>;
} => {
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>(EMPTY_CREATE);
  return { createOpen, setCreateOpen, createForm, setCreateForm };
};

export const useMockSignInState = (): {
  mockOpen: boolean;
  setMockOpen: Dispatch<SetStateAction<boolean>>;
  mockEmail: string;
  setMockEmail: Dispatch<SetStateAction<string>>;
  mockPassword: string;
  setMockPassword: Dispatch<SetStateAction<string>>;
} => {
  const [mockOpen, setMockOpen] = useState(false);
  const [mockEmail, setMockEmail] = useState('');
  const [mockPassword, setMockPassword] = useState('');
  return { mockOpen, setMockOpen, mockEmail, setMockEmail, mockPassword, setMockPassword };
};

export const useUserMutations = (): {
  updateAuthUserMutation: ReturnType<typeof useUpdateAuthUser>;
  updateAuthUserSecurityMutation: ReturnType<typeof useUpdateAuthUserSecurity>;
  deleteAuthUserMutation: ReturnType<typeof useDeleteAuthUser>;
  registerUserMutation: ReturnType<typeof useRegisterUser>;
  mockSignInMutation: ReturnType<typeof useMockSignIn>;
  updateUserRolesMutation: ReturnType<typeof useUpdateAuthUserRoles>;
} => {
  return {
    updateAuthUserMutation: useUpdateAuthUser(),
    updateAuthUserSecurityMutation: useUpdateAuthUserSecurity(),
    deleteAuthUserMutation: useDeleteAuthUser(),
    registerUserMutation: useRegisterUser(),
    mockSignInMutation: useMockSignIn(),
    updateUserRolesMutation: useUpdateAuthUserRoles(),
  };
};

export const useUserSearchState = (users: AuthUserSummary[]): {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  filteredUsers: AuthUserSummary[];
} => {
  const [search, setSearch] = useState('');
  const filteredUsers = useUserFiltering(users, search);
  return { search, setSearch, filteredUsers };
};

export const useUserRolesState = (userRoles: AuthUserRoleMap | undefined): {
  localUserRoles: AuthUserRoleMap;
  setLocalUserRoles: Dispatch<SetStateAction<AuthUserRoleMap>>;
  dirtyRoles: boolean;
  setDirtyRoles: Dispatch<SetStateAction<boolean>>;
  handleRoleChange: (userId: string, roleId: string) => void;
} => {
  const [localUserRoles, setLocalUserRoles] = useState<AuthUserRoleMap>({});
  const [dirtyRoles, setDirtyRoles] = useState(false);

  useEffect(() => {
    setLocalUserRoles(userRoles ?? {});
    setDirtyRoles(false);
  }, [userRoles]);

  const handleRoleChange = useCallback((userId: string, roleId: string) => {
    setLocalUserRoles((prev) => {
      const next = { ...prev };
      if (roleId === '' || roleId === 'none') delete next[userId];
      else next[userId] = roleId;
      return next;
    });
    setDirtyRoles(true);
  }, []);

  return { localUserRoles, setLocalUserRoles, dirtyRoles, setDirtyRoles, handleRoleChange };
};
