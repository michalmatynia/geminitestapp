export const ADMIN_MENU_FAVORITES_KEY = 'admin_menu_favorites';
export const ADMIN_MENU_SECTION_COLORS_KEY = 'admin_menu_section_colors';
export const ADMIN_MENU_CUSTOM_ENABLED_KEY = 'admin_menu_custom_enabled';
export const ADMIN_MENU_CUSTOM_NAV_KEY = 'admin_menu_custom_nav';

export const parseAdminMenuJson = <T>(value: string | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const parseAdminMenuBoolean = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  try {
    return Boolean(JSON.parse(value));
  } catch {
    return fallback;
  }
};
