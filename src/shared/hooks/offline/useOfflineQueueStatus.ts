"use client";

import { useCallback, useEffect, useState } from "react";
import { clearOfflineMutationQueue } from "@/shared/hooks/useOfflineMutation";

export type OfflineQueueItem = {
  id: string;
  queryKey: readonly unknown[];
  timestamp: number;
};

const STORAGE_KEY = "offline-mutation-queue";

const readQueueFromStorage = (): OfflineQueueItem[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<Partial<OfflineQueueItem>>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item: Partial<OfflineQueueItem>): boolean => item !== null && typeof item.id === "string")
      .map((item: Partial<OfflineQueueItem>): OfflineQueueItem => ({
        id: item.id as string,
        queryKey: Array.isArray(item.queryKey) ? item.queryKey : [],
        timestamp: typeof item.timestamp === "number" ? item.timestamp : Date.now(),
      }));
  } catch {
    return [];
  }
};

export function useOfflineQueueStatus(): {
  items: OfflineQueueItem[];
  count: number;
  refresh: () => void;
  clear: () => void;
} {
  const [items, setItems] = useState<OfflineQueueItem[]>((): OfflineQueueItem[] => readQueueFromStorage());

  const refresh = useCallback((): void => {
    setItems(readQueueFromStorage());
  }, []);

  const clear = useCallback((): void => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    clearOfflineMutationQueue();
    setItems([]);
  }, []);

  useEffect((): () => void => {
    const intervalId = setInterval(refresh, 5000);
    const onStorage = (event: StorageEvent): void => {
      if (event.key === STORAGE_KEY) {
        refresh();
      }
    };
    window.addEventListener("storage", onStorage);
    return (): void => {
      clearInterval(intervalId);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return { items, count: items.length, refresh, clear };
}
