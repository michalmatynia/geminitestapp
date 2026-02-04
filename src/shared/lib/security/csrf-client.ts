"use client";

export const CSRF_COOKIE_NAME = "csrf-token";
export const CSRF_HEADER_NAME = "x-csrf-token";
export const CSRF_HEADER_FALLBACK = "x-xsrf-token";
export const CSRF_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const getClientCsrfToken = (): string | null => {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie
    .split(";")
    .map((part: string) => part.trim())
    .find((part: string) => part.startsWith(`${CSRF_COOKIE_NAME}=`));
  if (!cookie) return null;
  return decodeURIComponent(cookie.split("=").slice(1).join("="));
};

export const isSameOriginUrl = (input: RequestInfo | URL): boolean => {
  if (typeof window === "undefined") return true;
  const origin = window.location.origin;
  try {
    const url = typeof input === "string"
      ? new URL(input, origin)
      : input instanceof URL
        ? input
        : new URL(input.url, origin);
    return url.origin === origin;
  } catch {
    return true;
  }
};
