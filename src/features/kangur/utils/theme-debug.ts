import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';

const DEBUG_PARAM = 'kangurThemeDebug';
const DEBUG_STORAGE_KEY = 'kangur_theme_debug';
const DEBUG_ENV_KEY = 'NEXT_PUBLIC_KANGUR_THEME_DEBUG';

const parseFlag = (value: string | null): boolean => {
  if (value === null || value === '') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

export const isKangurThemeDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    if (parseFlag(process.env[DEBUG_ENV_KEY] ?? null)) return true;
    const params = new URLSearchParams(window.location.search);
    const paramVal = params.get(DEBUG_PARAM);
    if (paramVal !== null && parseFlag(paramVal)) return true;
    const stored = window.localStorage.getItem(DEBUG_STORAGE_KEY);
    return parseFlag(stored);
  } catch (error) {
    ErrorSystem.captureException(error).catch(() => {});
    return false;
  }
};

export const KANGUR_THEME_DEBUG_STORAGE_KEY = DEBUG_STORAGE_KEY;
export const KANGUR_THEME_DEBUG_QUERY_PARAM = DEBUG_PARAM;
