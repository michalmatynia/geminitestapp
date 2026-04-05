import { registerUser, type RegisterResponse } from '@/features/auth/api/register';
import { fetchAuthRoleSettings, updateAuthUserRoles } from '@/features/auth/api/roles';
import {
  fetchAuthUsers,
  fetchAuthUserSecurity,
  updateAuthUser,
  updateAuthUserSecurity,
  deleteAuthUser,
  mockSignIn,
  type AuthUsersResponse,
  type AuthUserSecurityProfile,
} from '@/features/auth/api/users';
import type {
  AuthRoleSettings,
  AuthUser as AuthUserSummary,
  AuthUserRoleMap,
} from '@/shared/contracts/auth';
import type { SingleQuery, UpdateMutation, CreateMutation, MutationResult } from '@/shared/contracts/ui/queries';
import { ApiError } from '@/shared/lib/api-client';
import {
  createDeleteMutationV2,
  createSingleQueryV2,
  createUpdateMutationV2,
  createCreateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { invalidateAuthSecurity, invalidateUsers } from '@/shared/lib/query-invalidation';
import { authKeys } from '@/shared/lib/query-key-exports';

export type { AuthUsersResponse, AuthUserSecurityProfile };

const AUTH_USERS_STALE_MS = 10_000;
const AUTH_SECURITY_STALE_MS = 10_000;
const AUTH_ROLE_SETTINGS_STALE_MS = 10_000;
const AUTH_ROLE_SETTINGS_QUERY_KEY = [...authKeys.all, 'role-settings'] as const;

export function useAuthUsers(enabled: boolean = true): SingleQuery<AuthUsersResponse> {
  const queryKey = authKeys.users.all;
  return createSingleQueryV2<AuthUsersResponse>({
    id: 'auth-users',
    queryKey,
    queryFn: fetchAuthUsers,
    enabled,
    staleTime: AUTH_USERS_STALE_MS,
    meta: {
      source: 'auth.hooks.useAuthUsers',
      operation: 'detail',
      resource: 'auth.users',
      domain: 'auth',
      queryKey,
      tags: ['auth', 'users'],
      description: 'Loads auth users.'},
  });
}

export function useAuthRoleSettings(enabled: boolean = true): SingleQuery<AuthRoleSettings> {
  return createSingleQueryV2<AuthRoleSettings>({
    id: 'auth-role-settings',
    queryKey: AUTH_ROLE_SETTINGS_QUERY_KEY,
    queryFn: fetchAuthRoleSettings,
    enabled,
    staleTime: AUTH_ROLE_SETTINGS_STALE_MS,
    meta: {
      source: 'auth.hooks.useAuthRoleSettings',
      operation: 'detail',
      resource: 'auth.role-settings',
      domain: 'auth',
      queryKey: AUTH_ROLE_SETTINGS_QUERY_KEY,
      tags: ['auth', 'roles'],
      description: 'Loads auth role settings (roles, permissions, user roles).',
    },
  });
}

export function useAuthUserSecurity(userId?: string | null): SingleQuery<AuthUserSecurityProfile> {
  const queryKey = userId ? authKeys.users.security(userId) : authKeys.users.security('');
  return createSingleQueryV2<AuthUserSecurityProfile>({
    id: userId ?? 'auth-user-security',
    queryKey,
    queryFn: (): Promise<AuthUserSecurityProfile> => fetchAuthUserSecurity(userId as string),
    enabled: Boolean(userId),
    staleTime: AUTH_SECURITY_STALE_MS,
    meta: {
      source: 'auth.hooks.useAuthUserSecurity',
      operation: 'detail',
      resource: 'auth.user-security',
      domain: 'auth',
      queryKey,
      tags: ['auth', 'security'],
      description: 'Loads auth user security.'},
  });
}

export function useUpdateAuthUser(): UpdateMutation<
  AuthUserSummary,
  {
    userId: string;
    input: { name?: string | null; email?: string | null; emailVerified?: boolean | null };
  }
  > {
  return createUpdateMutationV2({
    mutationFn: async ({
      userId,
      input,
    }: {
      userId: string;
      input: {
        name?: string | null;
        email?: string | null;
        emailVerified?: boolean | null;
      };
    }): Promise<AuthUserSummary> => {
      const result = await updateAuthUser(userId, input);
      if (!result.ok) throw new ApiError('Failed to update user', 400);
      return result.payload;
    },
    mutationKey: authKeys.users.all,
    meta: {
      source: 'auth.hooks.useUpdateAuthUser',
      operation: 'update',
      resource: 'auth.users',
      domain: 'auth',
      mutationKey: authKeys.users.all,
      tags: ['auth', 'users', 'update'],
      description: 'Updates auth users.'},
    invalidate: (queryClient) => invalidateUsers(queryClient),
  });
}

export function useUpdateAuthUserRoles(): UpdateMutation<
  AuthRoleSettings,
  { userRoles: AuthUserRoleMap }
> {
  return createUpdateMutationV2({
    mutationFn: async ({
      userRoles,
    }: {
      userRoles: AuthUserRoleMap;
    }): Promise<AuthRoleSettings> => {
      const result = await updateAuthUserRoles({ userRoles });
      if (!result.ok) throw new ApiError('Failed to update user roles', 400);
      return result.payload;
    },
    mutationKey: authKeys.mutation('roles-update'),
    meta: {
      source: 'auth.hooks.useUpdateAuthUserRoles',
      operation: 'update',
      resource: 'auth.role-settings',
      domain: 'auth',
      mutationKey: authKeys.mutation('roles-update'),
      tags: ['auth', 'roles', 'update'],
      description: 'Updates auth user role assignments.',
    },
    invalidate: (queryClient) =>
      queryClient.invalidateQueries({ queryKey: AUTH_ROLE_SETTINGS_QUERY_KEY }),
  });
}

export function useUpdateAuthUserSecurity(): UpdateMutation<
  AuthUserSecurityProfile,
  {
    userId: string;
    input: { disabled?: boolean; banned?: boolean; allowedIps?: string[]; disableMfa?: boolean };
  }
  > {
  return createUpdateMutationV2({
    mutationFn: async ({
      userId,
      input,
    }: {
      userId: string;
      input: {
        disabled?: boolean;
        banned?: boolean;
        allowedIps?: string[];
        disableMfa?: boolean;
      };
    }): Promise<AuthUserSecurityProfile> => {
      const result = await updateAuthUserSecurity(userId, input);
      if (!result.ok) throw new ApiError('Failed to update security settings', 400);
      return result.payload;
    },
    mutationKey: authKeys.users.all,
    meta: {
      source: 'auth.hooks.useUpdateAuthUserSecurity',
      operation: 'update',
      resource: 'auth.user-security',
      domain: 'auth',
      mutationKey: authKeys.users.all,
      tags: ['auth', 'security', 'update'],
      description: 'Updates auth user security.'},
    invalidate: (queryClient, _data, variables) => {
      void invalidateUsers(queryClient);
      return invalidateAuthSecurity(queryClient, variables.userId);
    },
  });
}

export function useDeleteAuthUser(): UpdateMutation<
  { id: string; deleted: boolean },
  { userId: string }
  > {
  return createDeleteMutationV2({
    mutationFn: async ({
      userId,
    }: {
      userId: string;
    }): Promise<{ id: string; deleted: boolean }> => {
      return deleteAuthUser(userId);
    },
    mutationKey: authKeys.users.all,
    meta: {
      source: 'auth.hooks.useDeleteAuthUser',
      operation: 'delete',
      resource: 'auth.users',
      domain: 'auth',
      mutationKey: authKeys.users.all,
      tags: ['auth', 'users', 'delete'],
      description: 'Deletes auth users.'},
    invalidate: (queryClient, _data, variables) => {
      void invalidateUsers(queryClient);
      return invalidateAuthSecurity(queryClient, variables.userId);
    },
  });
}

export function useMockSignIn(): MutationResult<
  { ok: boolean; payload: { ok?: boolean; message?: string } },
  { email: string; password: string }
  > {
  return createCreateMutationV2({
    mutationFn: mockSignIn,
    mutationKey: authKeys.users.all,
    meta: {
      source: 'auth.hooks.useMockSignIn',
      operation: 'create',
      resource: 'auth.mock-signin',
      domain: 'auth',
      mutationKey: authKeys.users.all,
      tags: ['auth', 'signin'],
      description: 'Creates auth mock signin.'},
  });
}

export function useRegisterUser(): CreateMutation<
  { ok: boolean; payload: RegisterResponse },
  {
    email: string;
    password: string;
    name?: string | undefined;
    emailVerified?: boolean | undefined;
  }
  > {
  return createCreateMutationV2({
    mutationFn: registerUser,
    mutationKey: authKeys.users.all,
    meta: {
      source: 'auth.hooks.useRegisterUser',
      operation: 'create',
      resource: 'auth.register',
      domain: 'auth',
      mutationKey: authKeys.users.all,
      tags: ['auth', 'register'],
      description: 'Creates auth register.'},
    invalidate: (queryClient) => invalidateUsers(queryClient),
  });
}
