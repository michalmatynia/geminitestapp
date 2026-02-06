export type MfaSetupResponse = {
  ok: boolean;
  secret?: string;
  otpauthUrl?: string;
  message?: string;
};

export type MfaVerifyResponse = {
  ok: boolean;
  recoveryCodes?: string[];
  message?: string;
};

export type MfaDisableResponse = {
  ok: boolean;
  message?: string;
};

const safeJson = async <T>(res: Response): Promise<T> => {
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
};

export const setupMfa = async (): Promise<{ ok: boolean; payload: MfaSetupResponse }> => {
  const res = await fetch('/api/auth/mfa/setup', { method: 'POST' });
  const payload = await safeJson<MfaSetupResponse>(res);
  return { ok: res.ok, payload };
};

export const verifyMfa = async (token: string): Promise<{ ok: boolean; payload: MfaVerifyResponse }> => {
  const res = await fetch('/api/auth/mfa/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  const payload = await safeJson<MfaVerifyResponse>(res);
  return { ok: res.ok, payload };
};

export const disableMfa = async (input: { token?: string; recoveryCode?: string }): Promise<{ ok: boolean; payload: MfaDisableResponse }> => {
  const res = await fetch('/api/auth/mfa/disable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await safeJson<MfaDisableResponse>(res);
  return { ok: res.ok, payload };
};
