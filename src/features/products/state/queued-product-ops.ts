"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "queued-product-ids";
let cachedIds: Set<string> | null = null;
const listeners = new Set<() => void>();

const loadFromStorage = (): void => {
  if (cachedIds) return;
  cachedIds = new Set<string>();
  if (typeof window === "undefined") return;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return;
  try {
    const parsed = JSON.parse(stored) as string[];
    if (Array.isArray(parsed)) {
      parsed.forEach((id: string) => {
        if (typeof id === "string" && id.trim()) {
          cachedIds?.add(id);
        }
      });
    }
  } catch {
    cachedIds = new Set<string>();
  }
};

const saveToStorage = (): void => {
  if (typeof window === "undefined" || !cachedIds) return;
  const payload = Array.from(cachedIds);
  if (payload.length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }
};

const emitChange = (): void => {
  listeners.forEach((listener: () => void) => listener());
};

const refreshFromStorage = (): void => {
  cachedIds = null;
  loadFromStorage();
  emitChange();
};

export const getQueuedProductIds = (): Set<string> => {
  loadFromStorage();
  return new Set(cachedIds ?? []);
};

export const addQueuedProductId = (id: string): void => {
  if (!id) return;
  loadFromStorage();
  if (!cachedIds) return;
  if (!cachedIds.has(id)) {
    cachedIds.add(id);
    saveToStorage();
    emitChange();
  }
};

export const removeQueuedProductId = (id: string): void => {
  if (!id) return;
  loadFromStorage();
  if (!cachedIds) return;
  if (cachedIds.delete(id)) {
    saveToStorage();
    emitChange();
  }
};

export const useQueuedProductIds = (): Set<string> => {
  const [ids, setIds] = useState<Set<string>>(() => getQueuedProductIds());

  useEffect(() => {
    const handleChange = (): void => {
      setIds(getQueuedProductIds());
    };

    listeners.add(handleChange);
    const handleStorage = (event: StorageEvent): void => {
      if (event.key === STORAGE_KEY) {
        refreshFromStorage();
      }
    };
    window.addEventListener("storage", handleStorage);

    return (): void => {
      listeners.delete(handleChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return ids;
};
