'use client';

import { useMemo } from 'react';

import {
  KANGUR_CLASS_OVERRIDES_SETTING_KEY,
  createDefaultKangurClassOverrides,
  parseKangurClassOverrides,
  type KangurClassOverrides,
} from '@/features/kangur/class-overrides';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';

export const useKangurClassOverrides = (): KangurClassOverrides => {
  const settingsStore = useSettingsStore();
  const rawOverrides = settingsStore.get(KANGUR_CLASS_OVERRIDES_SETTING_KEY);
  const shouldApplyOverrides = useMemo(() => {
    const raw = process.env['NEXT_PUBLIC_KANGUR_CLASS_OVERRIDES_ENABLED'];
    if (process.env['NODE_ENV'] !== 'production') {
      return raw !== 'false';
    }
    return raw === 'true';
  }, []);

  const normalizedOverrides = useMemo(
    () => parseKangurClassOverrides(rawOverrides),
    [rawOverrides]
  );
  const emptyOverrides = useMemo(() => createDefaultKangurClassOverrides(), []);

  return shouldApplyOverrides ? normalizedOverrides : emptyOverrides;
};

export const useKangurClassOverride = (componentId: string, slot: string = 'root'): string => {
  const overrides = useKangurClassOverrides();

  return useMemo(() => {
    const componentOverrides = overrides.components[componentId];
    if (!componentOverrides) return '';
    return componentOverrides[slot] ?? '';
  }, [componentId, overrides, slot]);
};
