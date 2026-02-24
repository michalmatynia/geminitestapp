import type { VerifyCredentialsResponse, Login } from '@/shared/contracts/auth';

const safeJson = async <T>(res: Response): Promise<T> => {
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
};

export const verifyCredentials = async (input: Login): Promise<{ ok: boolean; payload: VerifyCredentialsResponse }> => {
  const res = await fetch('/api/auth/verify-credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await safeJson<VerifyCredentialsResponse>(res);
  return { ok: res.ok, payload };
};
