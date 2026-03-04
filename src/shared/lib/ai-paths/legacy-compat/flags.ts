const parseBooleanEnv = (value: string | undefined, fallback: boolean): boolean => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false;
  }
  return fallback;
};

export const isLegacyCompatRoutesEnabled = (): boolean =>
  parseBooleanEnv(process.env['AI_PATHS_LEGACY_COMPAT_ROUTES_ENABLED'], true);

export const isLegacyPathIndexCompatEnabled = (): boolean =>
  parseBooleanEnv(
    process.env['AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'] ??
      process.env['NEXT_PUBLIC_AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'],
    true
  );
