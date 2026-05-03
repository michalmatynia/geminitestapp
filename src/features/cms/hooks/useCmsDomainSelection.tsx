'use client';
'use no memo';

import { useCallback, useMemo } from 'react';

import { useCmsDomains } from '@/features/cms/hooks/useCmsQueries';
import type { CmsDomain } from '@/shared/contracts/cms';
import { CMS_DOMAIN_SETTINGS_KEY, normalizeCmsDomainSettings } from '@/shared/contracts/cms';
import { useUserPreferences, useUpdateUserPreferences } from '@/shared/hooks/useUserPreferences';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { parseJsonSetting } from '@/shared/utils/settings-json';

// This hook composes TanStack Query factory hooks and user-preference
// mutations. Keep it out of React Compiler memoization to avoid dev-time hook
// cache mismatches while those query hooks settle.

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

const isNonEmptyString = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const hasDomain = (domains: readonly CmsDomain[], domainId: string | null): domainId is string =>
  isNonEmptyString(domainId) && domains.some((item: CmsDomain) => item.id === domainId);

const resolveHostDomainId = (
  zoningEnabled: boolean,
  domains: readonly CmsDomain[]
): string | null => {
  if (typeof window === 'undefined') return null;
  if (!zoningEnabled) return null;
  if (domains.length === 0) return null;
  const host = window.location.hostname.toLowerCase();
  const match = domains.find((item: CmsDomain) => item.domain.toLowerCase() === host);
  return match?.id ?? null;
};

const resolvePreferredDomainId = (
  zoningEnabled: boolean,
  initialDomainId: string | null,
  preferenceDomainId: string | null | undefined
): string | null => {
  if (!zoningEnabled) return null;
  if (isNonEmptyString(initialDomainId)) return initialDomainId;
  return isNonEmptyString(preferenceDomainId) ? preferenceDomainId : null;
};

const resolveActiveDomainId = ({
  zoningEnabled,
  preferredDomainId,
  hostDomainId,
  domains,
}: {
  zoningEnabled: boolean;
  preferredDomainId: string | null;
  hostDomainId: string | null;
  domains: readonly CmsDomain[];
}): string | null => {
  if (!zoningEnabled) return null;
  if (hasDomain(domains, preferredDomainId)) return preferredDomainId;
  if (hasDomain(domains, hostDomainId)) return hostDomainId;
  return domains[0]?.id ?? null;
};

const resolveActiveDomain = (
  zoningEnabled: boolean,
  activeDomainId: string | null,
  domains: readonly CmsDomain[]
): CmsDomain | null => {
  if (!zoningEnabled || !isNonEmptyString(activeDomainId)) return null;
  return domains.find((item: CmsDomain) => item.id === activeDomainId) ?? null;
};

const resolveCanonicalDomain = (
  zoningEnabled: boolean,
  activeDomain: CmsDomain | null,
  domains: readonly CmsDomain[]
): CmsDomain | null => {
  if (!zoningEnabled || !isNonEmptyString(activeDomain?.aliasOf)) return null;
  return domains.find((item: CmsDomain) => item.id === activeDomain.aliasOf) ?? null;
};

const resolveSharedWithDomains = (
  zoningEnabled: boolean,
  activeDomainId: string | null,
  domains: readonly CmsDomain[]
): CmsDomain[] => {
  if (!zoningEnabled || !isNonEmptyString(activeDomainId)) return [];
  return domains.filter((item: CmsDomain) => item.aliasOf === activeDomainId);
};

const useResolvedCmsDomainSelection = ({
  domains,
  initialDomainId,
  preferenceDomainId,
  zoningEnabled,
}: {
  domains: CmsDomain[];
  initialDomainId: string | null;
  preferenceDomainId: string | null | undefined;
  zoningEnabled: boolean;
}): Pick<
  CmsDomainSelectionResult,
  'activeDomainId' | 'activeDomain' | 'canonicalDomain' | 'sharedWithDomains' | 'hostDomainId'
> => {
  const hostDomainId = useMemo(
    () => resolveHostDomainId(zoningEnabled, domains),
    [domains, zoningEnabled]
  );
  const preferredDomainId = useMemo(
    () => resolvePreferredDomainId(zoningEnabled, initialDomainId, preferenceDomainId),
    [initialDomainId, preferenceDomainId, zoningEnabled]
  );
  const activeDomainId = useMemo(
    () => resolveActiveDomainId({ domains, hostDomainId, preferredDomainId, zoningEnabled }),
    [preferredDomainId, hostDomainId, domains, zoningEnabled]
  );
  const activeDomain = useMemo(
    () => resolveActiveDomain(zoningEnabled, activeDomainId, domains),
    [domains, activeDomainId, zoningEnabled]
  );
  const canonicalDomain = useMemo(
    () => resolveCanonicalDomain(zoningEnabled, activeDomain, domains),
    [domains, activeDomain, zoningEnabled]
  );
  const sharedWithDomains = useMemo(
    () => resolveSharedWithDomains(zoningEnabled, activeDomainId, domains),
    [domains, activeDomainId, zoningEnabled]
  );
  return { activeDomainId, activeDomain, canonicalDomain, sharedWithDomains, hostDomainId };
};

const shouldPersistActiveDomain = ({
  activeDomainId,
  domainId,
  isSaving,
  persist,
  preferenceDomainId,
  zoningEnabled,
}: {
  activeDomainId: string | null;
  domainId: string | null;
  isSaving: boolean;
  persist: boolean;
  preferenceDomainId: string | null | undefined;
  zoningEnabled: boolean;
}): boolean =>
  persist &&
  zoningEnabled &&
  domainId !== activeDomainId &&
  domainId !== preferenceDomainId &&
  !isSaving;

type UpdatePreferencesMutation = ReturnType<typeof useUpdateUserPreferences>;

const useActiveDomainSelectionSetter = ({
  activeDomainId,
  persist,
  preferenceDomainId,
  updatePreferencesMutation,
  zoningEnabled,
}: {
  activeDomainId: string | null;
  persist: boolean;
  preferenceDomainId: string | null;
  updatePreferencesMutation: UpdatePreferencesMutation;
  zoningEnabled: boolean;
}): CmsDomainSelectionResult['setActiveDomainId'] =>
  useCallback(
    (domainId: string | null): void => {
      const shouldPersist = shouldPersistActiveDomain({
        activeDomainId,
        domainId,
        isSaving: updatePreferencesMutation.isPending,
        persist,
        preferenceDomainId,
        zoningEnabled,
      });
      if (!shouldPersist) return;

      updatePreferencesMutation.mutate({ cmsActiveDomainId: domainId });
    },
    [activeDomainId, persist, preferenceDomainId, updatePreferencesMutation, zoningEnabled]
  );

const resolveVisibleDomains = (zoningEnabled: boolean, domains: CmsDomain[]): CmsDomain[] =>
  zoningEnabled ? domains : [];

const resolveVisibleHostDomainId = (
  zoningEnabled: boolean,
  hostDomainId: string | null
): string | null => (zoningEnabled ? hostDomainId : null);

export function useCmsDomainSelection(
  options: CmsDomainSelectionOptions = {}
): CmsDomainSelectionResult {
  const { initialDomainId = null, persist = true } = options;
  const settingsStore = useSettingsStore();
  const domainSettingsRaw = settingsStore.get(CMS_DOMAIN_SETTINGS_KEY);
  const domainSettings = useMemo(
    () => normalizeCmsDomainSettings(parseJsonSetting(domainSettingsRaw, null)),
    [domainSettingsRaw]
  );
  const zoningEnabled = domainSettings.zoningEnabled;
  const domainsQuery = useCmsDomains();
  const domains = useMemo<CmsDomain[]>(() => domainsQuery.data ?? [], [domainsQuery.data]);

  const preferencesQuery = useUserPreferences();
  const userPreferences = preferencesQuery.data;
  const preferenceDomainId = userPreferences?.cmsActiveDomainId ?? null;
  const updatePreferencesMutation = useUpdateUserPreferences();

  const { activeDomainId, activeDomain, canonicalDomain, sharedWithDomains, hostDomainId } =
    useResolvedCmsDomainSelection({
      domains,
      initialDomainId,
      preferenceDomainId,
      zoningEnabled,
    });

  const setActiveDomainId = useActiveDomainSelectionSetter({
    activeDomainId,
    persist,
    preferenceDomainId,
    updatePreferencesMutation,
    zoningEnabled,
  });
  const visibleDomains = useMemo(
    () => resolveVisibleDomains(zoningEnabled, domains),
    [domains, zoningEnabled]
  );
  const visibleHostDomainId = useMemo(
    () => resolveVisibleHostDomainId(zoningEnabled, hostDomainId),
    [hostDomainId, zoningEnabled]
  );

  return {
    domains: visibleDomains,
    activeDomainId,
    activeDomain,
    canonicalDomain,
    sharedWithDomains,
    hostDomainId: visibleHostDomainId,
    zoningEnabled,
    isLoading: domainsQuery.isLoading || settingsStore.isLoading,
    isSaving: updatePreferencesMutation.isPending,
    setActiveDomainId,
  };
}
