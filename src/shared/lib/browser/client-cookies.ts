export type ClientCookieOptions = {
  maxAgeSeconds?: number | undefined;
  path?: string | undefined;
  sameSite?: 'Lax' | 'Strict' | 'None' | undefined;
  secure?: boolean | undefined;
};

export const readClientCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const parts = document.cookie.split(';').map((part) => part.trim());
  const match = parts.find((part) => part.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
};

export const setClientCookie = (
  name: string,
  value: string,
  options: ClientCookieOptions = {}
): void => {
  if (typeof document === 'undefined') return;

  const segments = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path ?? '/'}`,
    `SameSite=${options.sameSite ?? 'Lax'}`,
  ];

  if (typeof options.maxAgeSeconds === 'number') {
    segments.push(`Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`);
  }

  if (options.secure) {
    segments.push('Secure');
  }

  document.cookie = segments.join('; ');
};
