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

export type { SystemSetting };

export function useSettings(): UseQueryResult<SystemSetting[], Error> {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async (): Promise<SystemSetting[]> => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return (await res.json()) as SystemSetting[];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useSettingsMap(): UseQueryResult<Map<string, string>, Error> {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async (): Promise<SystemSetting[]> => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return (await res.json()) as SystemSetting[];
    },
    select: (data: SystemSetting[]): Map<string, string> =>
      new Map(data.map((item) => [item.key, item.value])),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
      return (await res.json()) as SystemSetting;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
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
      return responses;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
