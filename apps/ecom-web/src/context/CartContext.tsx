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

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  priceDisplay: string;
  size: string;
  gradient: string;
  imageUrl?: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  isOpen: boolean;
};

type CartAction =
  | { type: 'ADD'; item: CartItem }
  | { type: 'REMOVE'; productId: string; size: string }
  | { type: 'SET_QTY'; productId: string; size: string; quantity: number }
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'CLEAR' }
  | { type: 'HYDRATE'; items: CartItem[] };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD': {
      const key = `${action.item.productId}::${action.item.size}`;
      const existing = state.items.findIndex(
        (i) => `${i.productId}::${i.size}` === key,
      );
      if (existing >= 0) {
        const items = [...state.items];
        items[existing] = {
          ...items[existing],
          quantity: items[existing].quantity + action.item.quantity,
        };
        return { ...state, items, isOpen: true };
      }
      return { ...state, items: [...state.items, action.item], isOpen: true };
    }
    case 'REMOVE': {
      return {
        ...state,
        items: state.items.filter(
          (i) => !(i.productId === action.productId && i.size === action.size),
        ),
      };
    }
    case 'SET_QTY': {
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(
            (i) => !(i.productId === action.productId && i.size === action.size),
          ),
        };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.productId === action.productId && i.size === action.size
            ? { ...i, quantity: action.quantity }
            : i,
        ),
      };
    }
    case 'OPEN':
      return { ...state, isOpen: true };
    case 'CLOSE':
      return { ...state, isOpen: false };
    case 'CLEAR':
      return { ...state, items: [] };
    case 'HYDRATE':
      return { ...state, items: action.items };
    default:
      return state;
  }
}

const CART_STORAGE_KEY = 'arcana-cart';

type CartContextValue = {
  items: CartItem[];
  isOpen: boolean;
  totalItems: number;
  totalPrice: number;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, size: string) => void;
  setQty: (productId: string, size: string, quantity: number) => void;
  openCart: () => void;
  closeCart: () => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(cartReducer, { items: [], isOpen: false });

  // Restore cart from localStorage once on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored) as CartItem[];
        if (Array.isArray(items) && items.length > 0) {
          dispatch({ type: 'HYDRATE', items });
        }
      }
    } catch {}
  }, []);

  // Persist cart to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items));
    } catch {}
  }, [state.items]);

  const addItem = useCallback((item: CartItem) => dispatch({ type: 'ADD', item }), []);
  const removeItem = useCallback(
    (productId: string, size: string) => dispatch({ type: 'REMOVE', productId, size }),
    [],
  );
  const setQty = useCallback(
    (productId: string, size: string, quantity: number) =>
      dispatch({ type: 'SET_QTY', productId, size, quantity }),
    [],
  );
  const openCart = useCallback(() => dispatch({ type: 'OPEN' }), []);
  const closeCart = useCallback(() => dispatch({ type: 'CLOSE' }), []);
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  const totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        isOpen: state.isOpen,
        totalItems,
        totalPrice,
        addItem,
        removeItem,
        setQty,
        openCart,
        closeCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
