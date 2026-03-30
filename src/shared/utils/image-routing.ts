import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
export const normalizeProductImageExternalBaseUrl = (value: string | null | undefined): string => {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';

  const hasProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  const withProtocol = hasProtocol ? trimmed : `http://${trimmed.replace(/^\/+/, '')}`;

  try {
    return new URL(withProtocol).toString().replace(/\/+$/, '');
  } catch (error) {
    logClientCatch(error, {
      source: 'image-routing',
      action: 'normalizeProductImageExternalBaseUrl',
      input: trimmed,
      level: 'warn',
    });
    return trimmed.replace(/\/+$/, '');
  }
};

const isLoopbackHostname = (hostname: string): boolean => {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '0.0.0.0' ||
    normalized === '::1'
  );
};

const isLoopbackBaseUrl = (baseUrl: string): boolean => {
  if (!baseUrl) return false;
  try {
    return isLoopbackHostname(new URL(baseUrl).hostname);
  } catch (error) {
    logClientCatch(error, {
      source: 'image-routing',
      action: 'isLoopbackBaseUrl',
      baseUrl,
      level: 'warn',
    });
    return false;
  }
};

const joinPathToBase = (path: string, baseUrl: string): string => {
  const normalizedBase = normalizeProductImageExternalBaseUrl(baseUrl);
  if (!normalizedBase) return path;
  const cleanedPath = path.replace(/^\/+/, '');
  return `${normalizedBase}/${cleanedPath}`;
};

const isDataOrBlobUrl = (value: string): boolean =>
  value.startsWith('data:') || value.startsWith('blob:');

const isAbsoluteUrl = (value: string): boolean => /^[a-z][a-z0-9+.-]*:/i.test(value);

const resolveAbsoluteProductImageUrl = (
  value: string,
  normalizedBase: string,
  baseIsLoopback: boolean
): string => {
  try {
    const parsed = new URL(value);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
      return value;
    }
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (!normalizedBase) return value;

    const sourceIsLoopback = isLoopbackHostname(parsed.hostname);
    if (!sourceIsLoopback) return value;
    if (baseIsLoopback) return path || value;
    return joinPathToBase(path, normalizedBase) || value;
  } catch (error) {
    logClientCatch(error, {
      source: 'image-routing',
      action: 'resolveProductImageUrl',
      value,
      externalBaseUrl: normalizedBase,
      level: 'warn',
    });
    return value;
  }
};

const resolveRelativeProductImageUrl = (
  value: string,
  normalizedBase: string,
  baseIsLoopback: boolean
): string => {
  const path = `/${value.replace(/^\/+/, '')}`;
  if (!normalizedBase || baseIsLoopback) {
    return path;
  }
  return joinPathToBase(path, normalizedBase);
};

export const resolveProductImageUrl = (
  rawValue: string | null | undefined,
  externalBaseUrl?: string | null
): string | null => {
  const value = rawValue?.trim() ?? '';
  if (!value) return null;

  if (isDataOrBlobUrl(value)) {
    return value;
  }

  const normalizedBase = normalizeProductImageExternalBaseUrl(externalBaseUrl);
  const baseIsLoopback = isLoopbackBaseUrl(normalizedBase);

  if (value.startsWith('/')) {
    if (!normalizedBase || baseIsLoopback) {
      return value;
    }
    return joinPathToBase(value, normalizedBase);
  }

  if (isAbsoluteUrl(value)) {
    return resolveAbsoluteProductImageUrl(value, normalizedBase, baseIsLoopback);
  }

  return resolveRelativeProductImageUrl(value, normalizedBase, baseIsLoopback);
};
