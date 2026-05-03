'use client';

import React, { createContext, useContext } from 'react';
import type { useAdminProductOrdersImportState } from './AdminProductOrdersImportPage.hooks';

type OrdersImportState = ReturnType<typeof useAdminProductOrdersImportState>;

const OrdersImportContext = createContext<OrdersImportState | null>(null);

export function useOrdersImportContext(): OrdersImportState {
  const context = useContext(OrdersImportContext);
  if (!context) {
    throw new Error('useOrdersImportContext must be used within an OrdersImportProvider');
  }
  return context;
}

export function OrdersImportProvider({
  children,
  state,
}: {
  children: React.ReactNode;
  state: OrdersImportState;
}): React.JSX.Element {
  return (
    <OrdersImportContext.Provider value={state}>
      {children}
    </OrdersImportContext.Provider>
  );
}
