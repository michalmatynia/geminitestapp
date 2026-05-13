/* eslint-disable @typescript-eslint/strict-boolean-expressions,consistent-return,max-lines-per-function,no-empty */
'use client';

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
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
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }): JSX.Element {
  const [items, dispatch] = useReducer(reducer, []);
  const { user } = useAuth();
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether we've loaded the DB wishlist for the current user so we don't
  // overwrite local changes on re-renders.
  const loadedUserIdRef = useRef<string | null>(null);

  // Hydrate from localStorage on first mount (before any user info arrives)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) dispatch({ type: 'HYDRATE', items: JSON.parse(stored) as WishlistItem[] });
    } catch {}
  }, []);

  // When user logs in, fetch their DB wishlist and merge with / replace local state.
  useEffect(() => {
    if (!user) {
      loadedUserIdRef.current = null;
      return;
    }
    if (loadedUserIdRef.current === user.id) return;
    loadedUserIdRef.current = user.id;

    fetch('/api/wishlist')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items?: WishlistItem[] } | null) => {
        if (data?.items && data.items.length > 0) {
          dispatch({ type: 'HYDRATE', items: data.items });
        } else {
          // No DB wishlist yet — push whatever is in localStorage to DB
          try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const local: WishlistItem[] = stored ? (JSON.parse(stored) as WishlistItem[]) : [];
            if (local.length > 0) {
              void fetch('/api/wishlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: local }),
              });
            }
          } catch {}
        }
      })
      .catch(() => {});
  }, [user]);

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  // Debounced sync to DB when user is logged in
  useEffect(() => {
    if (!user) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      void fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
    }, 800);
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [items, user?.id]);

  const isWishlisted = useCallback(
    (productId: string) => items.some((i) => i.productId === productId),
    [items],
  );

  const toggle = useCallback((item: WishlistItem) => dispatch({ type: 'TOGGLE', item }), []);
  const remove = useCallback((productId: string) => dispatch({ type: 'REMOVE', productId }), []);

  return (
    <WishlistContext.Provider value={{ items, total: items.length, isWishlisted, toggle, remove }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be inside WishlistProvider');
  return ctx;
}
