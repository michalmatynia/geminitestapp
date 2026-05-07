'use client';

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
  type JSX,
} from 'react';

export type WishlistItem = {
  productId: string;
  slug: string;
  name: string;
  category: string;
  priceDisplay: string;
  gradient: string;
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

  // Hydrate from localStorage once on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) dispatch({ type: 'HYDRATE', items: JSON.parse(stored) as WishlistItem[] });
    } catch {}
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

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
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider');
  return ctx;
}
