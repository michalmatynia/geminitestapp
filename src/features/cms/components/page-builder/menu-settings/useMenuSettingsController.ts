import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  CMS_MENU_SETTINGS_KEY,
  DEFAULT_MENU_SETTINGS,
  getCmsMenuSettingsKey,
  type MenuItem,
  type MenuSettings,
  normalizeMenuSettings,
} from '@/shared/contracts/cms-menu';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

export function useMenuSettingsController() {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const { domains, activeDomainId, zoningEnabled } = useCmsDomainSelection();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const persistTimerRef = useRef<number | null>(null);

  const [userMenuScopeId, setUserMenuScopeId] = useState<string | null>(null);
  const initialMenuScopeId = useMemo(() => zoningEnabled ? (activeDomainId || 'default') : 'default', [zoningEnabled, activeDomainId]);
  const menuScopeId = useMemo(() => zoningEnabled ? (userMenuScopeId ?? initialMenuScopeId) : 'default', [initialMenuScopeId, userMenuScopeId, zoningEnabled]);

  const menuKey = useMemo(() => (!zoningEnabled || menuScopeId === 'default') ? CMS_MENU_SETTINGS_KEY : getCmsMenuSettingsKey(menuScopeId), [menuScopeId, zoningEnabled]);

  const settingsReady = !settingsStore.isLoading && !settingsStore.error;
  const menuSettingsRaw = settingsStore.get(menuKey);
  const initialSettings = useMemo(() => settingsReady ? normalizeMenuSettings(parseJsonSetting(menuSettingsRaw, null)) : DEFAULT_MENU_SETTINGS, [settingsReady, menuSettingsRaw]);
  const [userSettings, setUserSettings] = useState<MenuSettings | null>(null);
  const settings = userSettings ?? initialSettings;

  const updateMenuItem = useCallback((id: string, field: keyof MenuItem, value: string) => {
    setUserSettings(prev => {
      const current = prev ?? initialSettings;
      return { ...current, items: current.items.map(item => item.id === id ? { ...item, [field]: value } : item) };
    });
  }, [initialSettings]);

  useEffect(() => {
    if (!userSettings) return;
    if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => updateSetting.mutate({ key: menuKey, value: serializeSetting(userSettings) }), 500);
    return () => { if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current); };
  }, [menuKey, userSettings, updateSetting]);

  return {
    settings,
    setUserSettings,
    menuScopeId,
    setUserMenuScopeId,
    updateMenuItem,
    openSections,
    setOpenSections
  };
}
