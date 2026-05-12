/* eslint-disable @typescript-eslint/no-unsafe-argument,@typescript-eslint/strict-boolean-expressions,no-empty */
'use client';

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  type JSX,
  type ReactNode,
} from 'react';

export interface RecentlyViewedItem {
  productId: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  priceDisplay: string;
  gradient: string;
  imageUrl?: string;
}

interface RecentlyViewedCtx {
  items: RecentlyViewedItem[];
  track: (item: RecentlyViewedItem) => void;
}

const Ctx = createContext<RecentlyViewedCtx | null>(null);
const KEY = 'arcana-recently-viewed';
const MAX = 6;

export function RecentlyViewedProvider({ children }: { children: ReactNode }): JSX.Element {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {
      // ignore parse errors
    }
  }, []);

  const track = useCallback((item: RecentlyViewedItem) => {
    setItems((prev) => {
      const filtered = prev.filter((i) => i.productId !== item.productId);
      const next = [item, ...filtered].slice(0, MAX);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ items, track }}>{children}</Ctx.Provider>;
}

export function useRecentlyViewed(): RecentlyViewedCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRecentlyViewed must be used within RecentlyViewedProvider');
  return ctx;
}
