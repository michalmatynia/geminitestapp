import type {
  AuthUsersResponse,
  AuthUserSecurityProfile,
  AuthUser as AuthUserSummary,
} from '@/shared/contracts/auth';

export type { AuthUsersResponse, AuthUserSecurityProfile, AuthUserSummary };

import { api } from '@/shared/lib/api-client';

export const fetchAuthUsers = async (): Promise<AuthUsersResponse> => {
  return api.get<AuthUsersResponse>('/api/auth/users');
};

export const updateAuthUser = async (
  userId: string,
  input: {
    name?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
): Promise<{ ok: boolean; payload: AuthUserSummary }> => {
  try {
    const payload = await api.patch<AuthUserSummary>(`/api/auth/users/${userId}`, input);
    return { ok: true, payload };
  } catch (_error: unknown) {
    return {
      ok: false,
      payload: { id: userId, email: input.email ?? '' } as AuthUserSummary,
    };
  }
};

export const fetchAuthUserSecurity = async (userId: string): Promise<AuthUserSecurityProfile> => {
  return api.get<AuthUserSecurityProfile>(`/api/auth/users/${userId}/security`);
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
  try {
    const payload = await api.patch<AuthUserSecurityProfile>(
      `/api/auth/users/${userId}/security`,
      input
    );
    return { ok: true, payload };
  } catch (_error: unknown) {
    return {
      ok: false,
      payload: { userId, mfaEnabled: false, allowedIps: [], disabledAt: null, bannedAt: null },
    };
  }
};

export const deleteAuthUser = async (userId: string): Promise<{ id: string; deleted: boolean }> => {
  return api.delete<{ id: string; deleted: boolean }>(`/api/auth/users/${userId}`);
};

export const mockSignIn = async (input: {
  email: string;
  password: string;
}): Promise<{ ok: boolean; payload: { ok?: boolean; message?: string } }> => {
  try {
    const payload = await api.post<{ ok?: boolean; message?: string }>(
      '/api/auth/mock-signin',
      input
    );
    return { ok: true, payload };
  } catch (_error: unknown) {
    return {
      ok: false,
      payload: { ok: false, message: _error instanceof Error ? _error.message : 'Sign in failed' },
    };
  }
};
