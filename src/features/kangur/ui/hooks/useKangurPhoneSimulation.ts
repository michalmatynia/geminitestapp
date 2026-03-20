'use client';

import { useMemo } from 'react';

import {
  KANGUR_PHONE_SIMULATION_SETTINGS_KEY,
  parseKangurPhoneSimulationSettings,
  type KangurPhoneSimulationSettings,
} from '@/features/kangur/settings';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';

export const useKangurPhoneSimulation = (): KangurPhoneSimulationSettings => {
  const settingsStore = useSettingsStore();
  const rawSettings = settingsStore.get(KANGUR_PHONE_SIMULATION_SETTINGS_KEY);

  return useMemo(
    () => parseKangurPhoneSimulationSettings(rawSettings),
    [rawSettings]
  );
};
