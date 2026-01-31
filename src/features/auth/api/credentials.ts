export type VerifyCredentialsResponse = {
  ok: boolean;
  mfaRequired?: boolean;
  challengeId?: string;
  expiresAt?: string;
  code?: string;
  message?: string;
};

const safeJson = async <T>(res: Response): Promise<T> => {
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
};

export const verifyCredentials = async (input: {
  email: string;
  password: string;
}): Promise<{ ok: boolean; payload: VerifyCredentialsResponse }> => {
  const res = await fetch("/api/auth/verify-credentials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await safeJson<VerifyCredentialsResponse>(res);
  return { ok: res.ok, payload };
};
