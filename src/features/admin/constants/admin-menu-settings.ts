export const ADMIN_MENU_FAVORITES_KEY = 'admin_menu_favorites';
export const ADMIN_MENU_SECTION_COLORS_KEY = 'admin_menu_section_colors';
export const ADMIN_MENU_CUSTOM_ENABLED_KEY = 'admin_menu_custom_enabled';
export const ADMIN_MENU_CUSTOM_NAV_KEY = 'admin_menu_custom_nav';

export const parseAdminMenuJson = <T>(value: string | undefined, fallback: T): T => {
  if (value === undefined || value === null || value === '') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const parseAdminMenuBoolean = (value: string | undefined | null, fallback = false): boolean => {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'boolean' ? parsed : Boolean(parsed);
  } catch {
    return fallback;
  }
};
