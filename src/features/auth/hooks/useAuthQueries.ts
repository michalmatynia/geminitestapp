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
import { ApiError } from '@/shared/lib/api-client';
import {
  createSingleQuery,
  createUpdateMutation,
  createCreateMutation,
} from '@/shared/lib/query-factories';
import {
  invalidateAuthSecurity,
  invalidateUsers,
} from '@/shared/lib/query-invalidation';
import { authKeys } from '@/shared/lib/query-key-exports';
import type { 
  SingleQuery, 
  UpdateMutation, 
  CreateMutation, 
  MutationResult 
} from '@/shared/types/query-result-types';

import type { AuthUserSummary } from '../types';


const AUTH_USERS_STALE_MS = 10_000;
const AUTH_SECURITY_STALE_MS = 10_000;

export function useAuthUsers(enabled: boolean = true): SingleQuery<AuthUsersResponse> {
  return createSingleQuery({
    queryKey: authKeys.users.all,
    queryFn: fetchAuthUsers,
    options: {
      enabled,
      staleTime: AUTH_USERS_STALE_MS,
    },
  });
}

export function useAuthUserSecurity(userId?: string | null): SingleQuery<AuthUserSecurityProfile> {
  return createSingleQuery({
    queryKey: userId ? authKeys.users.security(userId) : authKeys.users.security(''),
    queryFn: (): Promise<AuthUserSecurityProfile> => fetchAuthUserSecurity(userId as string),
    options: {
      enabled: Boolean(userId),
      staleTime: AUTH_SECURITY_STALE_MS,
    },
  });
}

export function useUpdateAuthUser(): UpdateMutation<
  AuthUserSummary,
  { userId: string; input: { name?: string | null; email?: string | null; emailVerified?: boolean | null } }
  > {
  const queryClient = useQueryClient();
  return createUpdateMutation({
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
    options: {
      onSuccess: (): void => {
        void invalidateUsers(queryClient);
      },
    },
  });
}

export function useUpdateAuthUserSecurity(): UpdateMutation<
  AuthUserSecurityProfile,
  { userId: string; input: { disabled?: boolean; banned?: boolean; allowedIps?: string[]; disableMfa?: boolean } }
  > {
  const queryClient = useQueryClient();
  return createUpdateMutation({
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
    options: {
      onSuccess: (_data: AuthUserSecurityProfile, variables: { userId: string; input: { disabled?: boolean; banned?: boolean; allowedIps?: string[]; disableMfa?: boolean } }): void => {
        void invalidateUsers(queryClient);
        void invalidateAuthSecurity(queryClient, variables.userId);
      },
    },
  });
}

export function useDeleteAuthUser(): UpdateMutation<
  { id: string; deleted: boolean },
  { userId: string }
  > {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: async ({ userId }: { userId: string }): Promise<{ id: string; deleted: boolean }> => {
      return deleteAuthUser(userId);
    },
    options: {
      onSuccess: (_data: { id: string; deleted: boolean }, variables: { userId: string }): void => {
        void invalidateUsers(queryClient);
        void invalidateAuthSecurity(queryClient, variables.userId);
      },
    },
  });
}

export function useMockSignIn(): MutationResult<{ ok: boolean; payload: { ok?: boolean; message?: string } }, { email: string; password: string }> {
  return createCreateMutation({
    mutationFn: mockSignIn,
  });
}

export function useRegisterUser(): CreateMutation<
  { ok: boolean; payload: RegisterResponse },
  { email: string; password: string; name?: string | undefined; emailVerified?: boolean | undefined }
  > {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: registerUser,
    options: {
      onSuccess: (): void => {
        void invalidateUsers(queryClient);
      },
    },
  });
}

export function useVerifyCredentials(): MutationResult<
  { ok: boolean; payload: VerifyCredentialsResponse },
  { email: string; password: string }
  > {
  return createCreateMutation({
    mutationFn: verifyCredentials,
  });
}
