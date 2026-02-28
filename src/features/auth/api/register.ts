import type { RegisterResponse, Register } from '@/shared/contracts/auth';

export type { RegisterResponse };

const safeJson = async <T>(res: Response): Promise<T> => {
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
};

export const registerUser = async (
  input: Register
): Promise<{ ok: boolean; payload: RegisterResponse }> => {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await safeJson<RegisterResponse>(res);
  return { ok: res.ok, payload };
};
