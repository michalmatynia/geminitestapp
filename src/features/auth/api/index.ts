import { useQuery, useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import type { UserRecord, UserRole, UserPermissions } from "@/features/auth/types";
import type { DeleteResponse } from "@/shared/types/api";

// Mock data or actual API fetch functions would go here.
// For this refactoring, we assume these functions exist and return promises.
// Example: async function fetchUsers(): Promise<UserRecord[]> { ... }

// --- Queries ---

export const useUsers = (options?: { enabled?: boolean }) => {
  return useQuery<UserRecord[], Error>({
    queryKey: ["auth", "users"],
    queryFn: async () => {
      const response = await fetch("/api/auth/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
    ...options,
  });
};

export const useUser = (userId: string, options?: { enabled?: boolean }) => {
  return useQuery<UserRecord, Error>({
    queryKey: ["auth", "users", userId],
    queryFn: async () => {
      const response = await fetch(`/api/auth/users/${userId}`);
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    enabled: !!userId && (options?.enabled ?? true),
  });
};

export const useUserSecurity = (userId: string, options?: { enabled?: boolean }) => {
  return useQuery<any, Error>({ // Replace 'any' with actual security data type if available
    queryKey: ["auth", "users", userId, "security"],
    queryFn: async () => {
      const response = await fetch(`/api/auth/users/${userId}/security`);
      if (!response.ok) throw new Error("Failed to fetch user security");
      return response.json();
    },
    enabled: !!userId && (options?.enabled ?? true),
  });
};

// --- Mutations ---

export const useVerifyCredentialsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: any) => { // Replace 'any' with actual credentials type
      const response = await fetch("/api/auth/verify-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      if (!response.ok) throw new Error("Failed to verify credentials");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate user and session data upon successful credential verification
      queryClient.invalidateQueries({ queryKey: ["auth", "users"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
};

export const useMockSigninMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch("/api/auth/mock-signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) throw new Error("Failed to mock sign in");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate user and session data upon successful mock sign-in
      queryClient.invalidateQueries({ queryKey: ["auth", "users"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
};

export const useRegisterMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: any) => { // Replace 'any' with actual user data type
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      if (!response.ok) throw new Error("Failed to register user");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate user and session data upon successful registration
      queryClient.invalidateQueries({ queryKey: ["auth", "users"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
};

export const useMfaSetupMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/mfa/setup", { method: "POST" });
      if (!response.ok) throw new Error("Failed to setup MFA");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate user security data
      queryClient.invalidateQueries({ queryKey: ["auth", "users", "security"] });
    },
  });
};

export const useVerifyMfaMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) throw new Error("Failed to verify MFA code");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate user security data
      queryClient.invalidateQueries({ queryKey: ["auth", "users", "security"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
};

export const useDisableMfaMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/mfa/disable", { method: "POST" });
      if (!response.ok) throw new Error("Failed to disable MFA");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate user security data
      queryClient.invalidateQueries({ queryKey: ["auth", "users", "security"] });
    },
  });
};