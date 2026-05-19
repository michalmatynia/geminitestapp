/* eslint-disable @typescript-eslint/strict-boolean-expressions,max-lines-per-function,no-empty */
'use client';

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
  useState,
  type ReactNode,
  type JSX,
} from 'react';
import { useAuth } from '@/context/AuthContext';

export type WishlistItem = {
  productId: string;
  slug: string;
  name: string;
  category: string;
  price?: number;
  priceDisplay: string;
  currencyCode?: string;
  gradient: string;
  imageUrl?: string;
};

type WishlistAction =
  | { type: 'TOGGLE'; item: WishlistItem }
  | { type: 'REMOVE'; productId: string }
  | { type: 'HYDRATE'; items: WishlistItem[] };

function reducer(state: WishlistItem[], action: WishlistAction): WishlistItem[] {
  switch (action.type) {
    case 'TOGGLE': {
      const exists = state.some((i) => i.productId === action.item.productId);
      return exists
        ? state.filter((i) => i.productId !== action.item.productId)
        : [...state, action.item];
    }
    case 'REMOVE':
      return state.filter((i) => i.productId !== action.productId);
    case 'HYDRATE':
      return action.items;
    default:
      return state;
  }
}

const STORAGE_KEY = 'arcana-wishlist';

type WishlistContextValue = {
  items: WishlistItem[];
  total: number;
  isWishlisted: (productId: string) => boolean;
  toggle: (item: WishlistItem) => void;
  remove: (productId: string) => void;
  getCount: (productId: string) => number;
  requestCount: (productId: string) => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }): JSX.Element {
  const [items, dispatch] = useReducer(reducer, []);
  const { user } = useAuth();
  const loadedUserIdRef = useRef<string | null>(null);

  // Global wishlist counts cache — visible to all users
  const [countsCache, setCountsCache] = useState<Record<string, number>>({});

  // Batched count fetch — collects product IDs and fires a single request per tick
  const pendingIdsRef = useRef<Set<string>>(new Set());
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushCountBatch = useCallback(() => {
    const ids = [...pendingIdsRef.current];
    pendingIdsRef.current.clear();
    if (ids.length === 0) return;

    // Split into chunks of 100 (API limit)
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));

    for (const chunk of chunks) {
      void fetch(`/api/wishlist/counts?productIds=${chunk.join(',')}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { counts?: Record<string, number> } | null) => {
          if (data?.counts) setCountsCache((prev) => ({ ...prev, ...data.counts }));
        })
        .catch(() => {});
    }
  }, []);

  const requestCount = useCallback((productId: string) => {
    if (countsCache[productId] !== undefined) return; // already loaded
    pendingIdsRef.current.add(productId);
    if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
    batchTimerRef.current = setTimeout(flushCountBatch, 50);
  }, [countsCache, flushCountBatch]);

  const getCount = useCallback((productId: string): number => countsCache[productId] ?? 0, [countsCache]);

  // Hydrate from localStorage on first mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) dispatch({ type: 'HYDRATE', items: JSON.parse(stored) as WishlistItem[] });
    } catch {}
  }, []);

  // When user logs in, fetch their DB wishlist
  useEffect(() => {
    if (!user) {
      loadedUserIdRef.current = null;
      dispatch({ type: 'HYDRATE', items: [] });
      return;
    }
    if (loadedUserIdRef.current === user.id) return;
    loadedUserIdRef.current = user.id;

    fetch('/api/wishlist')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items?: WishlistItem[] } | null) => {
        if (data?.items) dispatch({ type: 'HYDRATE', items: data.items });
      })
      .catch(() => {});
  }, [user]);

  // Persist to localStorage on every change (only when logged in)
  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, user]);

  // Toggle: requires auth; uses the dedicated toggle endpoint which handles counts atomically
  const toggle = useCallback((item: WishlistItem) => {
    if (!user) return;

    // Optimistic update
    dispatch({ type: 'TOGGLE', item });

    void fetch('/api/wishlist/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { wishlisted?: boolean; count?: number } | null) => {
        if (data?.count !== undefined) {
          setCountsCache((prev) => ({ ...prev, [item.productId]: data.count }));
        }
      })
      .catch(() => {
        // Revert optimistic update on error
        dispatch({ type: 'TOGGLE', item });
      });
  }, [user]);

  const remove = useCallback((productId: string) => dispatch({ type: 'REMOVE', productId }), []);

  const isWishlisted = useCallback(
    (productId: string) => items.some((i) => i.productId === productId),
    [items],
  );

  return (
    <WishlistContext.Provider value={{ items, total: items.length, isWishlisted, toggle, remove, getCount, requestCount }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be inside WishlistProvider');
  return ctx;
}
