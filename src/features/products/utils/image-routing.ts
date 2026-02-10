export const normalizeProductImageExternalBaseUrl = (
  value: string | null | undefined
): string => {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
};

const canUseRelativePathForHost = (baseUrl: string): boolean => {
  try {
    const parsed = new URL(baseUrl);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

const joinPathToBase = (path: string, baseUrl: string): string => {
  const normalizedBase = normalizeProductImageExternalBaseUrl(baseUrl);
  if (!normalizedBase) return path;
  if (canUseRelativePathForHost(normalizedBase)) {
    return path;
  }
  const cleanedPath = path.replace(/^\/+/, '');
  return `${normalizedBase}/${cleanedPath}`;
};

export const resolveProductImageUrl = (
  rawValue: string | null | undefined,
  externalBaseUrl?: string | null
): string | null => {
  const value = rawValue?.trim() ?? '';
  if (!value) return null;

  if (value.startsWith('data:')) {
    return value;
  }

  const normalizedBase = normalizeProductImageExternalBaseUrl(externalBaseUrl);

  if (value.startsWith('/')) {
    return joinPathToBase(value, normalizedBase);
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    try {
      const parsed = new URL(value);
      const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      return joinPathToBase(path, normalizedBase) || value;
    } catch {
      return value;
    }
  }

  const path = `/${value.replace(/^\/+/, '')}`;
  return joinPathToBase(path, normalizedBase);
};
