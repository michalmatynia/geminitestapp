'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';

import { verifyCredentials, type VerifyCredentialsResponse } from '@/features/auth/api/credentials';
import { registerUser, type RegisterResponse } from '@/features/auth/api/register';
import {
  fetchAuthUsers,
  fetchAuthUserSecurity,
  updateAuthUser,
  updateAuthUserSecurity,
  mockSignIn,
  type AuthUsersResponse,
  type AuthUserSecurityProfile,
} from '@/features/auth/api/users';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import type { AuthUserSummary } from '../types';

const authKeys = QUERY_KEYS.auth.users;

const AUTH_USERS_STALE_MS = 10_000;
const AUTH_SECURITY_STALE_MS = 10_000;

export function useAuthUsers(enabled: boolean = true): UseQueryResult<AuthUsersResponse, Error> {
  return useQuery({
    queryKey: authKeys.all,
    queryFn: fetchAuthUsers,
    enabled,
    staleTime: AUTH_USERS_STALE_MS,
  });
}

export function useAuthUserSecurity(userId?: string | null): UseQueryResult<AuthUserSecurityProfile, Error> {
  return useQuery({
    queryKey: userId ? authKeys.security(userId) : authKeys.security(''),
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
      if (!result.ok) throw new Error('Failed to update user');
      return result.payload;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: authKeys.all });
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
      if (!result.ok) throw new Error('Failed to update security settings');
      return result.payload;
    },
    onSuccess: (_data: AuthUserSecurityProfile, variables: { userId: string; input: { disabled?: boolean; banned?: boolean; allowedIps?: string[]; disableMfa?: boolean } }): void => {
      void queryClient.invalidateQueries({ queryKey: authKeys.all });
      void queryClient.invalidateQueries({ queryKey: authKeys.security(variables.userId) });
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
      void queryClient.invalidateQueries({ queryKey: authKeys.all });
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