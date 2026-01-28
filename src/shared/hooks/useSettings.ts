"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface SystemSetting {
  key: string;
  value: string;
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return (await res.json()) as SystemSetting[];
    },
    staleTime: 0,
  });
}

export function useSettingsMap() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return (await res.json()) as SystemSetting[];
    },
    select: (data) => new Map(data.map((item) => [item.key, item.value])),
    staleTime: 0,
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error("Failed to update setting");
      return (await res.json()) as SystemSetting;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

export function useUpdateSettingsBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payloads: Array<{ key: string; value: string }>) => {
      const responses = await Promise.all(
        payloads.map((payload) =>
          fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        )
      );
      if (responses.some((res) => !res.ok)) {
        throw new Error("Failed to update settings");
      }
      return responses;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
