const DEFAULT_KANGUR_MOBILE_WEB_CORS_ORIGINS = [
  'http://localhost:8081',
  'http://127.0.0.1:8081',
] as const;

const normalizeOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const parseOriginList = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }

  const normalizedOrigins = value
    .split(',')
    .map((origin) => normalizeOrigin(origin.trim()))
    .filter((origin): origin is string => Boolean(origin));

  return Array.from(new Set(normalizedOrigins));
};

export const resolveKangurMobileWebCorsOrigins = (): string[] => {
  const configuredOrigins = parseOriginList(process.env['KANGUR_MOBILE_WEB_CORS_ORIGINS']);
  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  return [...DEFAULT_KANGUR_MOBILE_WEB_CORS_ORIGINS];
};

export const resolveKangurStudiqWebCorsOrigins = (): string[] =>
  parseOriginList(process.env['KANGUR_WEB_CORS_ORIGINS']);

export const resolveKangurTrustedWebOrigins = (): string[] =>
  Array.from(
    new Set([...resolveKangurMobileWebCorsOrigins(), ...resolveKangurStudiqWebCorsOrigins()])
  );

export const KANGUR_MOBILE_WEB_CORS_ORIGINS = resolveKangurMobileWebCorsOrigins();
export const KANGUR_TRUSTED_WEB_ORIGINS = resolveKangurTrustedWebOrigins();
