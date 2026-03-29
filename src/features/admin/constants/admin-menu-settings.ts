import { logClientError } from '@/shared/utils/observability/client-error-logger';
export const ADMIN_MENU_FAVORITES_KEY = 'admin_menu_favorites';
export const ADMIN_MENU_SECTION_COLORS_KEY = 'admin_menu_section_colors';
export const ADMIN_MENU_CUSTOM_ENABLED_KEY = 'admin_menu_custom_enabled';
export const ADMIN_MENU_CUSTOM_NAV_KEY = 'admin_menu_custom_nav';

export const parseAdminMenuJson = <T>(value: string | undefined, fallback: T): T => {
  if (value === undefined || value === null || value === '') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    logClientError(error);
    return fallback;
  }
};

const parseBooleanLiteral = (value: string): boolean | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return null;
};

const parseAdminMenuBooleanJson = (value: string): boolean | null => {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'boolean' ? parsed : Boolean(parsed);
  } catch (error) {
    logClientError(error);
    return null;
  }
};

export const parseAdminMenuBoolean = (
  value: string | undefined | null,
  fallback = false
): boolean => {
  if (typeof value !== 'string' || value === '') return fallback;
  const normalizedValue = value;
  const literal = parseBooleanLiteral(normalizedValue);
  if (literal !== null) return literal;
  return parseAdminMenuBooleanJson(normalizedValue) ?? fallback;
};
