export const parseJsonSetting = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const serializeSetting = (value: unknown): string => JSON.stringify(value ?? null);
