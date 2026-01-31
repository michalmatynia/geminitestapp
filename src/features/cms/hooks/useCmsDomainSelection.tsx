"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCmsDomains } from "@/features/cms/hooks/useCmsQueries";

type UserPreferencesResponse = {
  cmsActiveDomainId?: string | null;
};

const userPreferencesQueryKey = ["user-preferences"] as const;

type CmsDomainSelectionOptions = {
  initialDomainId?: string | null;
  persist?: boolean;
};

export function useCmsDomainSelection(options: CmsDomainSelectionOptions = {}) {
  const { initialDomainId = null, persist = true } = options;
  const domainsQuery = useCmsDomains();
  const domains = domainsQuery.data ?? [];
  const queryClient = useQueryClient();
  const [hostDomainId, setHostDomainId] = useState<string | null>(null);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!domains.length) return;
    const host = window.location.hostname.toLowerCase();
    const match = domains.find((item) => item.domain.toLowerCase() === host);
    if (match) {
      setHostDomainId(match.id);
    }
  }, [domains]);

  const preferredDomainId = useMemo(() => {
    if (initialDomainId) return initialDomainId;
    return preferencesQuery.data?.cmsActiveDomainId ?? null;
  }, [initialDomainId, preferencesQuery.data?.cmsActiveDomainId]);

  const activeDomainId = useMemo(() => {
    if (preferredDomainId && domains.some((item) => item.id === preferredDomainId)) {
      return preferredDomainId;
    }
    if (hostDomainId && domains.some((item) => item.id === hostDomainId)) {
      return hostDomainId;
    }
    return domains[0]?.id ?? null;
  }, [preferredDomainId, hostDomainId, domains]);

  const activeDomain = useMemo(
    () => domains.find((item) => item.id === activeDomainId) ?? null,
    [domains, activeDomainId]
  );

  const canonicalDomain = useMemo(() => {
    if (!activeDomain?.aliasOf) return null;
    return domains.find((item) => item.id === activeDomain.aliasOf) ?? null;
  }, [domains, activeDomain]);

  const sharedWithDomains = useMemo(
    () => (activeDomainId ? domains.filter((item) => item.aliasOf === activeDomainId) : []),
    [domains, activeDomainId]
  );

  const setActiveDomainId = useCallback(
    (domainId: string | null) => {
      if (!persist) return;
      if (domainId === preferencesQuery.data?.cmsActiveDomainId) return;
      queryClient.setQueryData<UserPreferencesResponse>(userPreferencesQueryKey, (prev) => ({
        ...(prev ?? {}),
        cmsActiveDomainId: domainId,
      }));
      updatePreferencesMutation.mutate({ cmsActiveDomainId: domainId });
    },
    [persist, preferencesQuery.data?.cmsActiveDomainId, queryClient, updatePreferencesMutation]
  );

  useEffect(() => {
    if (!persist) return;
    if (!preferencesQuery.isSuccess) return;
    if (preferredDomainId && preferredDomainId !== preferencesQuery.data?.cmsActiveDomainId) {
      updatePreferencesMutation.mutate({ cmsActiveDomainId: preferredDomainId });
      return;
    }
    if (!preferredDomainId && hostDomainId) {
      updatePreferencesMutation.mutate({ cmsActiveDomainId: hostDomainId });
    }
  }, [persist, preferredDomainId, hostDomainId, preferencesQuery.isSuccess, preferencesQuery.data?.cmsActiveDomainId, updatePreferencesMutation]);

  return {
    domains,
    activeDomainId,
    activeDomain,
    canonicalDomain,
    sharedWithDomains,
    hostDomainId,
    isLoading: domainsQuery.isLoading || preferencesQuery.isLoading,
    isSaving: updatePreferencesMutation.isPending,
    setActiveDomainId,
  };
}
