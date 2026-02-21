'use client';

import { useQueryClient } from '@tanstack/react-query';

import { verifyCredentials, type VerifyCredentialsResponse } from '@/features/auth/api/credentials';
import { registerUser, type RegisterResponse } from '@/features/auth/api/register';
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
import type { AuthUserDto as AuthUserSummary } from '@/shared/contracts/auth';
import type { 
  SingleQuery, 
  UpdateMutation, 
  CreateMutation, 
  MutationResult 
} from '@/shared/contracts/ui';
import { ApiError } from '@/shared/lib/api-client';
import {
  createDeleteMutationV2,
  createSingleQueryV2,
  createUpdateMutationV2,
  createCreateMutationV2,
} from '@/shared/lib/query-factories-v2';
import {
  invalidateAuthSecurity,
  invalidateUsers,
} from '@/shared/lib/query-invalidation';
import { authKeys } from '@/shared/lib/query-key-exports';



const AUTH_USERS_STALE_MS = 10_000;
const AUTH_SECURITY_STALE_MS = 10_000;

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
      queryKey,
      tags: ['auth', 'users'],
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
      queryKey,
      tags: ['auth', 'security'],
    },
  });
}

export function useUpdateAuthUser(): UpdateMutation<
  AuthUserSummary,
  { userId: string; input: { name?: string | null; email?: string | null; emailVerified?: boolean | null } }
  > {
  const queryClient = useQueryClient();
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
      mutationKey: authKeys.users.all,
      tags: ['auth', 'users', 'update'],
    },
    onSuccess: (): void => {
      void invalidateUsers(queryClient);
    },
  });
}

export function useUpdateAuthUserSecurity(): UpdateMutation<
  AuthUserSecurityProfile,
  { userId: string; input: { disabled?: boolean; banned?: boolean; allowedIps?: string[]; disableMfa?: boolean } }
  > {
  const queryClient = useQueryClient();
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
      mutationKey: authKeys.users.all,
      tags: ['auth', 'security', 'update'],
    },
    onSuccess: (_data: AuthUserSecurityProfile, variables: { userId: string; input: { disabled?: boolean; banned?: boolean; allowedIps?: string[]; disableMfa?: boolean } }): void => {
      void invalidateUsers(queryClient);
      void invalidateAuthSecurity(queryClient, variables.userId);
    },
  });
}

export function useDeleteAuthUser(): UpdateMutation<
  { id: string; deleted: boolean },
  { userId: string }
  > {
  const queryClient = useQueryClient();
  return createDeleteMutationV2({
    mutationFn: async ({ userId }: { userId: string }): Promise<{ id: string; deleted: boolean }> => {
      return deleteAuthUser(userId);
    },
    mutationKey: authKeys.users.all,
    meta: {
      source: 'auth.hooks.useDeleteAuthUser',
      operation: 'delete',
      resource: 'auth.users',
      mutationKey: authKeys.users.all,
      tags: ['auth', 'users', 'delete'],
    },
    onSuccess: (_data: { id: string; deleted: boolean }, variables: { userId: string }): void => {
      void invalidateUsers(queryClient);
      void invalidateAuthSecurity(queryClient, variables.userId);
    },
  });
}

export function useMockSignIn(): MutationResult<{ ok: boolean; payload: { ok?: boolean; message?: string } }, { email: string; password: string }> {
  return createCreateMutationV2({
    mutationFn: mockSignIn,
    mutationKey: authKeys.users.all,
    meta: {
      source: 'auth.hooks.useMockSignIn',
      operation: 'create',
      resource: 'auth.mock-signin',
      mutationKey: authKeys.users.all,
      tags: ['auth', 'signin'],
    },
  });
}

export function useRegisterUser(): CreateMutation<
  { ok: boolean; payload: RegisterResponse },
  { email: string; password: string; name?: string | undefined; emailVerified?: boolean | undefined }
  > {
  const queryClient = useQueryClient();
  return createCreateMutationV2({
    mutationFn: registerUser,
    mutationKey: authKeys.users.all,
    meta: {
      source: 'auth.hooks.useRegisterUser',
      operation: 'create',
      resource: 'auth.register',
      mutationKey: authKeys.users.all,
      tags: ['auth', 'register'],
    },
    onSuccess: (): void => {
      void invalidateUsers(queryClient);
    },
  });
}

export function useVerifyCredentials(): MutationResult<
  { ok: boolean; payload: VerifyCredentialsResponse },
  { email: string; password: string }
  > {
  return createCreateMutationV2({
    mutationFn: verifyCredentials,
    mutationKey: authKeys.users.all,
    meta: {
      source: 'auth.hooks.useVerifyCredentials',
      operation: 'create',
      resource: 'auth.verify-credentials',
      mutationKey: authKeys.users.all,
      tags: ['auth', 'credentials'],
    },
  });
}
