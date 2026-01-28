"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAuthUsers,
  fetchAuthUserSecurity,
  updateAuthUser,
  updateAuthUserSecurity,
  mockSignIn,
} from "@/features/auth/api/users";
import { registerUser } from "@/features/auth/api/register";
import { verifyCredentials } from "@/features/auth/api/credentials";

const authKeys = {
  users: ["auth-users"] as const,
  userSecurity: (userId: string) => ["auth-user-security", userId] as const,
};

export function useAuthUsers() {
  return useQuery({
    queryKey: authKeys.users,
    queryFn: fetchAuthUsers,
  });
}

export function useAuthUserSecurity(userId?: string | null) {
  return useQuery({
    queryKey: userId ? authKeys.userSecurity(userId) : authKeys.userSecurity(""),
    queryFn: () => fetchAuthUserSecurity(userId as string),
    enabled: Boolean(userId),
  });
}

export function useUpdateAuthUser() {
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
    }) => {
      const result = await updateAuthUser(userId, input);
      if (!result.ok) throw new Error("Failed to update user");
      return result.payload;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.users });
    },
  });
}

export function useUpdateAuthUserSecurity() {
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
    }) => {
      const result = await updateAuthUserSecurity(userId, input);
      if (!result.ok) throw new Error("Failed to update security settings");
      return result.payload;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: authKeys.users });
      void queryClient.invalidateQueries({ queryKey: authKeys.userSecurity(variables.userId) });
    },
  });
}

export function useMockSignIn() {
  return useMutation({
    mutationFn: mockSignIn,
  });
}

export function useRegisterUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.users });
    },
  });
}

export function useVerifyCredentials() {
  return useMutation({
    mutationFn: verifyCredentials,
  });
}
