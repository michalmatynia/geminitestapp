'use client';

import { useCallback, useMemo } from 'react';

import { useCmsDomains } from '@/features/cms/hooks/useCmsQueries';
import type { CmsDomain } from '@/shared/contracts/cms';
import { CMS_DOMAIN_SETTINGS_KEY, normalizeCmsDomainSettings } from '@/shared/contracts/cms/domain-settings';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import { useUserPreferences, useUpdateUserPreferences } from '@/shared/hooks/useUserPreferences';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { parseJsonSetting } from '@/shared/utils/settings-json';

type CmsDomainSelectionOptions = {
  initialDomainId?: string | null;
  persist?: boolean;
};

type CmsDomainSelectionResult = {
  domains: CmsDomain[];
  activeDomainId: string | null;
  activeDomain: CmsDomain | null;
  canonicalDomain: CmsDomain | null;
  sharedWithDomains: CmsDomain[];
  hostDomainId: string | null;
  zoningEnabled: boolean;
  isLoading: boolean;
  isSaving: boolean;
  setActiveDomainId: (domainId: string | null) => void;
};

export function useCmsDomainSelection(options: CmsDomainSelectionOptions = {}): CmsDomainSelectionResult {
  const { initialDomainId = null, persist = true } = options;
  const settingsQuery = useSettingsMap();
  const settingsStore = useSettingsStore();
  const domainSettingsRaw = settingsStore.get(CMS_DOMAIN_SETTINGS_KEY);
  const domainSettings = useMemo(
    () =>
      normalizeCmsDomainSettings(
        parseJsonSetting(domainSettingsRaw, null)
      ),
    [domainSettingsRaw]
  );
  const zoningEnabled = domainSettings.zoningEnabled;
  const domainsQuery = useCmsDomains();
  const domains = useMemo<CmsDomain[]>(() => domainsQuery.data ?? [], [domainsQuery.data]);

  const preferencesQuery = useUserPreferences();
  const userPreferences = preferencesQuery.data;
  const updatePreferencesMutation = useUpdateUserPreferences();

  const hostDomainId = useMemo((): string | null => {
    if (typeof window === 'undefined') return null;
    if (!zoningEnabled) return null;
    if (!domains.length) return null;
    const host = window.location.hostname.toLowerCase();
    const match = domains.find((item: CmsDomain) => item.domain.toLowerCase() === host);
    return match?.id ?? null;
  }, [domains, zoningEnabled]);

  const preferredDomainId = useMemo(() => {
    if (!zoningEnabled) return null;
    if (initialDomainId) return initialDomainId;
    return userPreferences?.cmsActiveDomainId ?? null;
  }, [initialDomainId, userPreferences?.cmsActiveDomainId, zoningEnabled]);

  const activeDomainId = useMemo(() => {
    if (!zoningEnabled) return null;
    if (preferredDomainId && domains.some((item: CmsDomain) => item.id === preferredDomainId)) {
      return preferredDomainId;
    }
    if (hostDomainId && domains.some((item: CmsDomain) => item.id === hostDomainId)) {
      return hostDomainId;
    }
    return domains[0]?.id ?? null;
  }, [preferredDomainId, hostDomainId, domains, zoningEnabled]);

  const activeDomain = useMemo(
    () => (zoningEnabled ? domains.find((item: CmsDomain) => item.id === activeDomainId) ?? null : null),
    [domains, activeDomainId, zoningEnabled]
  );

  const canonicalDomain = useMemo(() => {
    if (!zoningEnabled) return null;
    if (!activeDomain?.aliasOf) return null;
    return domains.find((item: CmsDomain) => item.id === activeDomain.aliasOf) ?? null;
  }, [domains, activeDomain, zoningEnabled]);

  const sharedWithDomains = useMemo(
    () => (zoningEnabled && activeDomainId ? domains.filter((item: CmsDomain) => item.aliasOf === activeDomainId) : []),
    [domains, activeDomainId, zoningEnabled]
  );

  const setActiveDomainId = useCallback(
    (domainId: string | null): void => {
      if (!persist) return;
      if (!zoningEnabled) return;
      if (domainId === activeDomainId) return;
      if (domainId === userPreferences?.cmsActiveDomainId) return;
      if (updatePreferencesMutation.isPending) return;
      
      updatePreferencesMutation.mutate({ cmsActiveDomainId: domainId });
    },
    [activeDomainId, persist, userPreferences?.cmsActiveDomainId, updatePreferencesMutation, zoningEnabled]
  );

  return {
    domains: zoningEnabled ? domains : [],
    activeDomainId,
    activeDomain,
    canonicalDomain,
    sharedWithDomains,
    hostDomainId: zoningEnabled ? hostDomainId : null,
    zoningEnabled,
    isLoading: domainsQuery.isLoading || settingsQuery.isLoading,
    isSaving: updatePreferencesMutation.isPending,
    setActiveDomainId,
  };
}
