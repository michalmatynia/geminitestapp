import { useMemo, useRef } from 'react';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  ADMIN_MENU_CUSTOM_ENABLED_KEY,
  ADMIN_MENU_CUSTOM_NAV_KEY,
  ADMIN_MENU_FAVORITES_KEY,
  ADMIN_MENU_SECTION_COLORS_KEY,
  parseAdminMenuBoolean,
  parseAdminMenuJson,
} from '@/features/admin/constants/admin-menu-settings';
import type { AdminMenuCustomNode } from '@/shared/contracts/admin';
import { normalizeAdminMenuCustomNav } from '../components/menu/admin-menu-utils';

export interface AdminMenuSettingsResult {
  favoriteIds: string[];
  sectionColors: Record<string, string>;
  customEnabled: boolean;
  customNav: AdminMenuCustomNode[];
  settingsMap: Map<string, string>;
}

export function useAdminMenuSettings(menuSettingsReady: boolean): AdminMenuSettingsResult {
  const settingsStore = useSettingsStore();
  const settingsStoreRef = useRef(settingsStore);
  settingsStoreRef.current = settingsStore;
  const settingsMap = settingsStore.map;

  const favoriteIds = useMemo<string[]>(() => {
    if (menuSettingsReady === false) return [];
    const raw = settingsStoreRef.current.get(ADMIN_MENU_FAVORITES_KEY);
    const parsed = parseAdminMenuJson<string[]>(raw, []);
    return parsed.filter((id: string): id is string => typeof id === 'string' && id.length > 0);
  }, [menuSettingsReady, settingsMap]);

  const sectionColors = useMemo<Record<string, string>>(() => {
    if (menuSettingsReady === false) return {};
    const raw = settingsStoreRef.current.get(ADMIN_MENU_SECTION_COLORS_KEY);
    const parsed = parseAdminMenuJson<Record<string, string> | null>(raw, null);
    return parsed && typeof parsed === 'object' ? parsed : {};
  }, [menuSettingsReady, settingsMap]);

  const customEnabled = useMemo(
    () =>
      menuSettingsReady === true
        ? parseAdminMenuBoolean(settingsStoreRef.current.get(ADMIN_MENU_CUSTOM_ENABLED_KEY), false)
        : false,
    [menuSettingsReady, settingsMap]
  );

  const customNav = useMemo<AdminMenuCustomNode[]>(() => {
    if (menuSettingsReady === false) return [];
    const raw = settingsStoreRef.current.get(ADMIN_MENU_CUSTOM_NAV_KEY);
    const parsed = parseAdminMenuJson<AdminMenuCustomNode[]>(raw, []);
    return normalizeAdminMenuCustomNav(parsed);
  }, [menuSettingsReady, settingsMap]);

  return { favoriteIds, sectionColors, customEnabled, customNav, settingsMap };
}
