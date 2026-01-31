import type { AuthUserSummary } from "../types";

export type AuthUsersResponse = {
  provider: "mongodb";
  users: AuthUserSummary[];
};

export type AuthUserSecurityProfile = {
  userId: string;
  mfaEnabled: boolean;
  allowedIps: string[];
  disabledAt: string | null;
  bannedAt: string | null;
};

const safeJson = async <T>(res: Response): Promise<T> => {
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
};

export const fetchAuthUsers = async (): Promise<AuthUsersResponse> => {
  const res = await fetch("/api/auth/users");
  if (!res.ok) {
    throw new Error("Failed to load users");
  }
  return res.json() as Promise<AuthUsersResponse>;
};

export const updateAuthUser = async (
  userId: string,
  input: {
    name?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
): Promise<{ ok: boolean; payload: AuthUserSummary }> => {
  const res = await fetch(`/api/auth/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await safeJson<AuthUserSummary>(res);
  return { ok: res.ok, payload };
};

export const fetchAuthUserSecurity = async (
  userId: string
): Promise<AuthUserSecurityProfile> => {
  const res = await fetch(`/api/auth/users/${userId}/security`);
  if (!res.ok) {
    throw new Error("Failed to load security profile");
  }
  return res.json() as Promise<AuthUserSecurityProfile>;
};

export const updateAuthUserSecurity = async (
  userId: string,
  input: {
    disabled?: boolean;
    banned?: boolean;
    allowedIps?: string[];
    disableMfa?: boolean;
  }
): Promise<{ ok: boolean; payload: AuthUserSecurityProfile }> => {
  const res = await fetch(`/api/auth/users/${userId}/security`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await safeJson<AuthUserSecurityProfile>(res);
  return { ok: res.ok, payload };
};

export const mockSignIn = async (input: { email: string; password: string }): Promise<{ ok: boolean; payload: { ok?: boolean; message?: string } }> => {
  const res = await fetch("/api/auth/mock-signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await safeJson<{ ok?: boolean; message?: string }>(res);
  return { ok: res.ok, payload };
};
