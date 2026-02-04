"use client";

export const CSRF_COOKIE_NAME = "csrf-token";
export const CSRF_HEADER_NAME = "x-csrf-token";
export const CSRF_HEADER_FALLBACK = "x-xsrf-token";
export const CSRF_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const generateClientCsrfToken = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    let binary = "";
    bytes.forEach((byte: number) => {
      binary += String.fromCharCode(byte);
    });
    const base64 = btoa(binary);
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

const ensureClientCsrfCookie = (): string | null => {
  if (typeof document === "undefined") return null;
  const token = generateClientCsrfToken();
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}`;
  return token;
};

export const getClientCsrfToken = (): string | null => {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie
    .split(";")
    .map((part: string) => part.trim())
    .find((part: string) => part.startsWith(`${CSRF_COOKIE_NAME}=`));
  if (!cookie) return ensureClientCsrfCookie();
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
