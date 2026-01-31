"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";
import {
  fetchAuthUsers,
  fetchAuthUserSecurity,
  updateAuthUser,
  updateAuthUserSecurity,
  mockSignIn,
  type AuthUsersResponse,
  type AuthUserSecurityProfile,
} from "@/features/auth/api/users";
import { registerUser, type RegisterResponse } from "@/features/auth/api/register";
import { verifyCredentials, type VerifyCredentialsResponse } from "@/features/auth/api/credentials";
import type { AuthUserSummary } from "../types";

const authKeys = {
  users: ["auth-users"] as const,
  userSecurity: (userId: string) => ["auth-user-security", userId] as const,
};

export function useAuthUsers(): UseQueryResult<AuthUsersResponse, Error> {
  return useQuery({
    queryKey: authKeys.users,
    queryFn: fetchAuthUsers,
  });
}

export function useAuthUserSecurity(userId?: string | null): UseQueryResult<AuthUserSecurityProfile, Error> {
  return useQuery({
    queryKey: userId ? authKeys.userSecurity(userId) : authKeys.userSecurity(""),
    queryFn: () => fetchAuthUserSecurity(userId as string),
    enabled: Boolean(userId),
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
      if (!result.ok) throw new Error("Failed to update user");
      return result.payload;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: authKeys.users });
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
      if (!result.ok) throw new Error("Failed to update security settings");
      return result.payload;
    },
    onSuccess: (_data: AuthUserSecurityProfile, variables: { userId: string; input: { disabled?: boolean; banned?: boolean; allowedIps?: string[]; disableMfa?: boolean } }): void => {
      void queryClient.invalidateQueries({ queryKey: authKeys.users });
      void queryClient.invalidateQueries({ queryKey: authKeys.userSecurity(variables.userId) });
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
      void queryClient.invalidateQueries({ queryKey: authKeys.users });
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
