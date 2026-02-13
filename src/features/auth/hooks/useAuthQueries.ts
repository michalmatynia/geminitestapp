'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';

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
import { ApiError } from '@/shared/lib/api-client';
import {
  invalidateAuthSecurity,
  invalidateUsers,
} from '@/shared/lib/query-invalidation';
import { authKeys } from '@/shared/lib/query-key-exports';

import type { AuthUserSummary } from '../types';


const AUTH_USERS_STALE_MS = 10_000;
const AUTH_SECURITY_STALE_MS = 10_000;

export function useAuthUsers(enabled: boolean = true): UseQueryResult<AuthUsersResponse, Error> {
  return useQuery({
    queryKey: authKeys.users.all,
    queryFn: fetchAuthUsers,
    enabled,
    staleTime: AUTH_USERS_STALE_MS,
  });
}

export function useAuthUserSecurity(userId?: string | null): UseQueryResult<AuthUserSecurityProfile, Error> {
  return useQuery({
    queryKey: userId ? authKeys.users.security(userId) : authKeys.users.security(''),
    queryFn: (): Promise<AuthUserSecurityProfile> => fetchAuthUserSecurity(userId as string),
    enabled: Boolean(userId),
    staleTime: AUTH_SECURITY_STALE_MS,
  });
}

export function useUpdateAuthUser(): UseMutationResult<
  AuthUserSummary,
  Error,
  { userId: string; input: { name?: string | null; email?: string | null; emailVerified?: boolean | null } }
  > {
  const queryClient = useQueryClient();
  return useMutation({
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
    onSuccess: (): void => {
      void invalidateUsers(queryClient);
    },
  });
}

export function useUpdateAuthUserSecurity(): UseMutationResult<
  AuthUserSecurityProfile,
  Error,
  { userId: string; input: { disabled?: boolean; banned?: boolean; allowedIps?: string[]; disableMfa?: boolean } }
  > {
  const queryClient = useQueryClient();
  return useMutation({
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
    onSuccess: (_data: AuthUserSecurityProfile, variables: { userId: string; input: { disabled?: boolean; banned?: boolean; allowedIps?: string[]; disableMfa?: boolean } }): void => {
      void invalidateUsers(queryClient);
      void invalidateAuthSecurity(queryClient, variables.userId);
    },
  });
}

export function useDeleteAuthUser(): UseMutationResult<
  { id: string; deleted: boolean },
  Error,
  { userId: string }
  > {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId }: { userId: string }): Promise<{ id: string; deleted: boolean }> => {
      return deleteAuthUser(userId);
    },
    onSuccess: (_data: { id: string; deleted: boolean }, variables: { userId: string }): void => {
      void invalidateUsers(queryClient);
      void invalidateAuthSecurity(queryClient, variables.userId);
    },
  });
}

export function useMockSignIn(): UseMutationResult<{ ok: boolean; payload: { ok?: boolean; message?: string } }, Error, { email: string; password: string }> {
  return useMutation({
    mutationFn: mockSignIn,
  });
}

export function useRegisterUser(): UseMutationResult<
  { ok: boolean; payload: RegisterResponse },
  Error,
  { email: string; password: string; name?: string | undefined; emailVerified?: boolean | undefined }
  > {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerUser,
    onSuccess: (): void => {
      void invalidateUsers(queryClient);
    },
  });
}

export function useVerifyCredentials(): UseMutationResult<
  { ok: boolean; payload: VerifyCredentialsResponse },
  Error,
  { email: string; password: string }
  > {
  return useMutation({
    mutationFn: verifyCredentials,
  });
}
