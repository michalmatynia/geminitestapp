"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCmsDomains } from "@/features/cms/hooks/useCmsQueries";
import { useSettingsMap } from "@/shared/hooks/useSettings";
import { parseJsonSetting } from "@/shared/utils/settings-json";
import { CMS_DOMAIN_SETTINGS_KEY, normalizeCmsDomainSettings } from "@/features/cms/types/domain-settings";
import type { CmsDomain } from "@/features/cms/types";

type UserPreferencesResponse = {
  cmsActiveDomainId?: string | null;
};

const userPreferencesQueryKey = ["user-preferences"] as const;

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
  const domainSettings = useMemo(
    () =>
      normalizeCmsDomainSettings(
        parseJsonSetting(settingsQuery.data?.get(CMS_DOMAIN_SETTINGS_KEY), null)
      ),
    [settingsQuery.data]
  );
  const zoningEnabled = domainSettings.zoningEnabled;
  const domainsQuery = useCmsDomains();
  const domains = useMemo<CmsDomain[]>(() => domainsQuery.data ?? [], [domainsQuery.data]);
  const queryClient = useQueryClient();

  const preferencesQuery = useQuery({
    queryKey: userPreferencesQueryKey,
    queryFn: async (): Promise<UserPreferencesResponse> => {
      const res = await fetch("/api/user/preferences");
      if (!res.ok) {
        throw new Error("Failed to load user preferences");
      }
      return (await res.json()) as UserPreferencesResponse;
    },
    staleTime: 1000 * 60 * 5,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (payload: UserPreferencesResponse): Promise<void> => {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Failed to update user preferences");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userPreferencesQueryKey });
    },
    onError: (error: Error) => {
      console.warn("[CMS] Failed to persist domain selection.", error);
    },
  });

  const hostDomainId = useMemo((): string | null => {
    if (typeof window === "undefined") return null;
    if (!zoningEnabled) return null;
    if (!domains.length) return null;
    const host = window.location.hostname.toLowerCase();
    const match = domains.find((item: CmsDomain) => item.domain.toLowerCase() === host);
    return match?.id ?? null;
  }, [domains, zoningEnabled]);

  const preferredDomainId = useMemo(() => {
    if (!zoningEnabled) return null;
    if (initialDomainId) return initialDomainId;
    return preferencesQuery.data?.cmsActiveDomainId ?? null;
  }, [initialDomainId, preferencesQuery.data?.cmsActiveDomainId, zoningEnabled]);

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
    (domainId: string | null) => {
      if (!persist) return;
      if (!zoningEnabled) return;
      if (domainId === preferencesQuery.data?.cmsActiveDomainId) return;
      queryClient.setQueryData<UserPreferencesResponse>(userPreferencesQueryKey, (prev: UserPreferencesResponse | undefined) => ({
        ...(prev ?? {}),
        cmsActiveDomainId: domainId,
      }));
      updatePreferencesMutation.mutate({ cmsActiveDomainId: domainId });
    },
    [persist, preferencesQuery.data?.cmsActiveDomainId, queryClient, updatePreferencesMutation, zoningEnabled]
  );

  useEffect(() => {
    if (!persist) return;
    if (!zoningEnabled) return;
    if (!preferencesQuery.isSuccess) return;
    if (preferredDomainId && preferredDomainId !== preferencesQuery.data?.cmsActiveDomainId) {
      updatePreferencesMutation.mutate({ cmsActiveDomainId: preferredDomainId });
      return;
    }
    if (!preferredDomainId && hostDomainId) {
      updatePreferencesMutation.mutate({ cmsActiveDomainId: hostDomainId });
    }
  }, [persist, preferredDomainId, hostDomainId, preferencesQuery.isSuccess, preferencesQuery.data?.cmsActiveDomainId, updatePreferencesMutation, zoningEnabled]);

  return {
    domains: zoningEnabled ? domains : [],
    activeDomainId,
    activeDomain,
    canonicalDomain,
    sharedWithDomains,
    hostDomainId: zoningEnabled ? hostDomainId : null,
    zoningEnabled,
    isLoading: domainsQuery.isLoading || preferencesQuery.isLoading || settingsQuery.isLoading,
    isSaving: updatePreferencesMutation.isPending,
    setActiveDomainId,
  };
}
