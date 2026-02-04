/* eslint-disable @typescript-eslint/typedef */
"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import type { SystemSetting } from "@/shared/types/settings";
import {
  fetchSettingsCached,
  invalidateSettingsCache,
  type SettingsScope,
} from "@/shared/api/settings-client";

export type { SystemSetting };

const selectSettingsMap = (data: SystemSetting[]): Map<string, string> =>
  new Map(data.map((item) => [item.key, item.value]));

export function useSettings(options?: { scope?: SettingsScope }): UseQueryResult<SystemSetting[], Error> {
  const scope = options?.scope ?? "light";
  return useQuery({
    queryKey: ["settings", scope],
    queryFn: async (): Promise<SystemSetting[]> => {
      try {
        return (await fetchSettingsCached({ scope })) as SystemSetting[];
      } catch (error) {
        console.warn("[settings] Failed to fetch settings", error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

export function useSettingsMap(options?: { scope?: SettingsScope }): UseQueryResult<Map<string, string>, Error> {
  const scope = options?.scope ?? "light";
  return useQuery({
    queryKey: ["settings", scope],
    queryFn: async (): Promise<SystemSetting[]> => {
      try {
        return (await fetchSettingsCached({ scope })) as SystemSetting[];
      } catch (error) {
        console.warn("[settings] Failed to fetch settings", error);
        return [];
      }
    },
    select: selectSettingsMap,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

export function useUpdateSetting(): UseMutationResult<
  SystemSetting,
  Error,
  { key: string; value: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      key,
      value,
    }: {
      key: string;
      value: string;
    }): Promise<SystemSetting> => {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error("Failed to update setting");
      invalidateSettingsCache();
      return (await res.json()) as SystemSetting;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "settings",
      });
    },
  });
}

export function useUpdateSettingsBulk(): UseMutationResult<
  Response[],
  Error,
  Array<{ key: string; value: string }>
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payloads: Array<{ key: string; value: string }>,
    ): Promise<Response[]> => {
      const responses = await Promise.all(
        payloads.map((payload) =>
          fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }),
        ),
      );
      if (responses.some((res) => !res.ok)) {
        throw new Error("Failed to update settings");
      }
      invalidateSettingsCache();
      return responses;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "settings",
      });
    },
  });
}
