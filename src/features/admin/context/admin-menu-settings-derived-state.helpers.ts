'use client';

import { useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from 'react';

import {
  adminNavToCustomNav,
  normalizeAdminMenuCustomNav,
  type NavItem,
} from '@/features/admin/components/menu/admin-menu-utils';
import {
  ADMIN_MENU_CUSTOM_ENABLED_KEY,
  ADMIN_MENU_CUSTOM_NAV_KEY,
  ADMIN_MENU_FAVORITES_KEY,
  ADMIN_MENU_SECTION_COLORS_KEY,
  parseAdminMenuBoolean,
  parseAdminMenuJson,
} from '@/features/admin/constants/admin-menu-settings';
import type { AdminMenuCustomNode } from '@/shared/contracts/admin';

export type SettingsValues = {
  favorites: string[];
  sectionColors: Record<string, string>;
  customEnabled: boolean;
  customNav: AdminMenuCustomNode[];
};

type SyncAdminMenuSettingsStateArgs = {
  defaultCustomNav: AdminMenuCustomNode[];
  setCustomEnabled: Dispatch<SetStateAction<boolean>>;
  setCustomNav: Dispatch<SetStateAction<AdminMenuCustomNode[]>>;
  setFavorites: Dispatch<SetStateAction<string[]>>;
  setSectionColors: Dispatch<SetStateAction<Record<string, string>>>;
  settingsFetched: boolean;
  settingsSnapshot: string;
  settingsValues: SettingsValues;
};

type SettingsPayloadInput = {
  customEnabled: boolean;
  customNav: AdminMenuCustomNode[];
  defaultCustomNav: AdminMenuCustomNode[];
  favorites: string[];
  sectionColors: Record<string, string>;
};

export type UseAdminMenuSettingsPayloadState = {
  defaultCustomNav: AdminMenuCustomNode[];
  isDefaultState: boolean;
  isDirty: boolean;
  normalizedCustomNav: AdminMenuCustomNode[];
  settingsSnapshot: string;
  settingsValues: SettingsValues;
};

type UseAdminMenuSettingsPayloadArgs = {
  baseNav: NavItem[];
  customEnabled: boolean;
  customNav: AdminMenuCustomNode[];
  favorites: string[];
  sectionColors: Record<string, string>;
  settingsData: Map<string, string> | undefined;
};

const createSettingsPayload = ({
  customEnabled,
  customNav,
  defaultCustomNav,
  favorites,
  sectionColors,
}: SettingsPayloadInput): string =>
  JSON.stringify({
    favorites,
    sectionColors,
    customEnabled,
    customNav: customNav.length > 0 ? customNav : defaultCustomNav,
  });

const createSettingsValues = (settingsData: Map<string, string> | undefined): SettingsValues => {
  const map = settingsData ?? new Map<string, string>();
  const sectionColorsRaw = parseAdminMenuJson<Record<string, string> | null>(
    map.get(ADMIN_MENU_SECTION_COLORS_KEY),
    null
  );

  return {
    favorites: parseAdminMenuJson<unknown[]>(map.get(ADMIN_MENU_FAVORITES_KEY), []).filter(
      (id: unknown): id is string => typeof id === 'string' && id.length > 0
    ),
    sectionColors:
      sectionColorsRaw !== null && typeof sectionColorsRaw === 'object' ? sectionColorsRaw : {},
    customEnabled: parseAdminMenuBoolean(map.get(ADMIN_MENU_CUSTOM_ENABLED_KEY), false),
    customNav: normalizeAdminMenuCustomNav(
      parseAdminMenuJson<AdminMenuCustomNode[]>(map.get(ADMIN_MENU_CUSTOM_NAV_KEY), [])
    ),
  };
};

const createStoredSettingsPayload = (
  defaultCustomNav: AdminMenuCustomNode[],
  settingsValues: SettingsValues
): string =>
  createSettingsPayload({
    customEnabled: settingsValues.customEnabled,
    customNav: settingsValues.customNav,
    defaultCustomNav,
    favorites: settingsValues.favorites,
    sectionColors: settingsValues.sectionColors,
  });

const createCurrentSettingsPayload = ({
  customEnabled,
  defaultCustomNav,
  favorites,
  normalizedCustomNav,
  sectionColors,
}: {
  customEnabled: boolean;
  defaultCustomNav: AdminMenuCustomNode[];
  favorites: string[];
  normalizedCustomNav: AdminMenuCustomNode[];
  sectionColors: Record<string, string>;
}): string =>
  createSettingsPayload({
    customEnabled,
    customNav: normalizedCustomNav,
    defaultCustomNav,
    favorites,
    sectionColors,
  });

export function useAdminMenuSettingsPayloads({
  baseNav,
  customEnabled,
  customNav,
  favorites,
  sectionColors,
  settingsData,
}: UseAdminMenuSettingsPayloadArgs): UseAdminMenuSettingsPayloadState {
  const defaultCustomNav = useMemo(() => adminNavToCustomNav(baseNav), [baseNav]);
  const normalizedCustomNav = useMemo(() => normalizeAdminMenuCustomNav(customNav), [customNav]);
  const normalizedCustomNavOrDefault = normalizedCustomNav.length > 0 ? normalizedCustomNav : defaultCustomNav;
  const settingsValues = useMemo(() => createSettingsValues(settingsData), [settingsData]);
  const settingsSnapshot = useMemo(() => createStoredSettingsPayload(defaultCustomNav, settingsValues), [defaultCustomNav, settingsValues]);
  const defaultPayload = useMemo(() => createSettingsPayload({ customEnabled: false, customNav: [], defaultCustomNav, favorites: [], sectionColors: {} }), [defaultCustomNav]);
  const baseline = useMemo(() => createStoredSettingsPayload(defaultCustomNav, settingsValues), [defaultCustomNav, settingsValues]);
  const currentPayload = useMemo(() => createCurrentSettingsPayload({ customEnabled, defaultCustomNav, favorites, normalizedCustomNav: normalizedCustomNavOrDefault, sectionColors }), [customEnabled, defaultCustomNav, favorites, normalizedCustomNavOrDefault, sectionColors]);

  return {
    defaultCustomNav,
    isDefaultState: currentPayload === defaultPayload,
    isDirty: baseline !== currentPayload,
    normalizedCustomNav: normalizedCustomNavOrDefault,
    settingsSnapshot,
    settingsValues,
  };
}

export function useSyncAdminMenuSettingsState({
  defaultCustomNav,
  setCustomEnabled,
  setCustomNav,
  setFavorites,
  setSectionColors,
  settingsFetched,
  settingsSnapshot,
  settingsValues,
}: SyncAdminMenuSettingsStateArgs): void {
  const previousSettingsRef = useRef<string | null>(null);

  useEffect(() => {
    if (!settingsFetched || settingsSnapshot === previousSettingsRef.current) {
      return;
    }

    previousSettingsRef.current = settingsSnapshot;
    setFavorites(settingsValues.favorites);
    setSectionColors(settingsValues.sectionColors);
    setCustomEnabled(settingsValues.customEnabled);
    setCustomNav(settingsValues.customNav.length > 0 ? settingsValues.customNav : defaultCustomNav);
  }, [
    defaultCustomNav,
    setCustomEnabled,
    setCustomNav,
    setFavorites,
    setSectionColors,
    settingsFetched,
    settingsSnapshot,
    settingsValues,
  ]);
}
