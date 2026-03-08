'use client';

import { useMemo } from 'react';

import {
  BRAIN_PROVIDER_LABELS,
  BRAIN_PROVIDER_SETTING_KEYS,
  type BrainProviderCredentialVendor,
} from '@/shared/lib/ai-brain/provider-metadata';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

export type BrainProviderStatus = {
  vendor: BrainProviderCredentialVendor;
  label: string;
  settingKey: string;
  configured: boolean;
  statusText: 'configured in AI Brain' | 'missing';
};

export function useBrainProviderStatus(
  vendor: BrainProviderCredentialVendor
): BrainProviderStatus {
  const settingsStore = useSettingsStore();
  const settingKey = BRAIN_PROVIDER_SETTING_KEYS[vendor];
  const rawValue = settingsStore.get(settingKey) ?? '';

  return useMemo(() => {
    const configured = rawValue.trim().length > 0;
    return {
      vendor,
      label: BRAIN_PROVIDER_LABELS[vendor],
      settingKey,
      configured,
      statusText: configured ? 'configured in AI Brain' : 'missing',
    };
  }, [rawValue, settingKey, vendor]);
}
