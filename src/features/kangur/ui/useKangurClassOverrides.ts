'use client';

import { useMemo } from 'react';

import {
  KANGUR_CLASS_OVERRIDES_SETTING_KEY,
  parseKangurClassOverrides,
  type KangurClassOverrides,
} from '@/features/kangur/class-overrides';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';

export const useKangurClassOverrides = (): KangurClassOverrides => {
  const settingsStore = useSettingsStore();
  const rawOverrides = settingsStore.get(KANGUR_CLASS_OVERRIDES_SETTING_KEY);

  return useMemo(() => parseKangurClassOverrides(rawOverrides), [rawOverrides]);
};

export const useKangurClassOverride = (componentId: string, slot: string = 'root'): string => {
  const overrides = useKangurClassOverrides();

  return useMemo(() => {
    const componentOverrides = overrides.components[componentId];
    if (!componentOverrides) return '';
    return componentOverrides[slot] ?? '';
  }, [componentId, overrides, slot]);
};
