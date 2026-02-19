import type { RegisterResponseDto as RegisterResponse } from '@/shared/contracts/auth';

const safeJson = async <T>(res: Response): Promise<T> => {
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
};

export const registerUser = async (input: {
  email: string;
  password: string;
  name?: string | undefined;
  emailVerified?: boolean | undefined;
}): Promise<{ ok: boolean; payload: RegisterResponse }> => {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await safeJson<RegisterResponse>(res);
  return { ok: res.ok, payload };
};
