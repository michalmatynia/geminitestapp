"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useSettingsMap } from "@/shared/hooks/use-settings";

type SettingsStoreValue = {
  map: Map<string, string>;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  get: (key: string) => string | undefined;
  getBoolean: (key: string, fallback?: boolean) => boolean;
  getNumber: (key: string, fallback?: number) => number | undefined;
  refetch: () => void;
};

const SettingsStoreContext = createContext<SettingsStoreValue | null>(null);

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return ["true", "1", "yes", "on"].includes(value.toLowerCase());
};

const parseNumber = (value: string | undefined, fallback?: number): number | undefined => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function SettingsStoreProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const settingsQuery = useSettingsMap();

  const value = useMemo<SettingsStoreValue>(() => {
    const map = settingsQuery.data ?? new Map<string, string>();
    return {
      map,
      isLoading: settingsQuery.isLoading,
      isFetching: settingsQuery.isFetching,
      error: settingsQuery.error ?? null,
      get: (key: string) => map.get(key),
      getBoolean: (key: string, fallback: boolean = false) =>
        parseBoolean(map.get(key), fallback),
      getNumber: (key: string, fallback?: number) =>
        parseNumber(map.get(key), fallback),
      refetch: () => {
        void settingsQuery.refetch();
      },
    };
  }, [
    settingsQuery.data,
    settingsQuery.isLoading,
    settingsQuery.isFetching,
    settingsQuery.error,
    settingsQuery.refetch,
  ]);

  return (
    <SettingsStoreContext.Provider value={value}>
      {children}
    </SettingsStoreContext.Provider>
  );
}

export function useSettingsStore(): SettingsStoreValue {
  const context = useContext(SettingsStoreContext);
  if (!context) {
    throw new Error("useSettingsStore must be used within SettingsStoreProvider");
  }
  return context;
}
