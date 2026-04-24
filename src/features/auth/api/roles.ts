import type { AuthRoleSettings, AuthUserRoleMap } from '@/shared/contracts/auth';
import { api } from '@/shared/lib/api-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export type { AuthRoleSettings, AuthUserRoleMap };

export const fetchAuthRoleSettings = async (): Promise<AuthRoleSettings> => {
  return api.get<AuthRoleSettings>('/api/auth/roles');
};

export const updateAuthUserRoles = async (input: {
  userRoles: AuthUserRoleMap;
}): Promise<{ ok: boolean; payload: AuthRoleSettings }> => {
  try {
    const payload = await api.patch<AuthRoleSettings>('/api/auth/roles', input);
    return { ok: true, payload };
  } catch (_error: unknown) {
    logClientError(_error);
    return {
      ok: false,
      payload: {
        roles: [],
        permissions: [],
        userRoles: input.userRoles,
        defaultRoleId: null,
      },
    };
  }
};
