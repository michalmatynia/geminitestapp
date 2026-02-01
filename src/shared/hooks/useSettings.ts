"use client";

import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";

type Setting = {
  key: string;
  value: string;
};

export function useSettings(): UseQueryResult<Setting[], Error> {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async (): Promise<Setting[]> => {
      const res = await fetch("/api/settings");
      if (!res.ok) {
        throw new Error("Failed to fetch settings");
      }
      return (await res.json()) as Setting[];
    },
  });
}

export function useUpdateSetting(): UseMutationResult<
  void,
  Error,
  { key: string; value: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        throw new Error("Failed to update setting");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

export function useSettingsMap(): UseQueryResult<Map<string, string>, Error> {
  return useQuery({
    queryKey: ["settings-map"],
    queryFn: async (): Promise<Map<string, string>> => {
      const res = await fetch("/api/settings");
      if (!res.ok) {
        throw new Error("Failed to fetch settings");
      }
      const data = (await res.json()) as Setting[];
      return new Map(data.map((s: Setting) => [s.key, s.value]));
    },
  });
}
