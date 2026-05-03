'use client';

import React, { createContext, useContext } from 'react';

export type TraderaStatusCheckContextValue = {
  onRelist: (productId: string, listingId: string) => void;
  onLiveCheck: (productId: string, listingId: string) => void;
  onRefreshSession: (productId: string) => void;
  refreshingSessionProductId: string | null;
};

const TraderaStatusCheckContext = createContext<TraderaStatusCheckContextValue | null>(null);

export function useTraderaStatusCheck(): TraderaStatusCheckContextValue {
  const context = useContext(TraderaStatusCheckContext);
  if (!context) {
    throw new Error('useTraderaStatusCheck must be used within a TraderaStatusCheckProvider');
  }
  return context;
}

export function TraderaStatusCheckProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: TraderaStatusCheckContextValue;
}): React.JSX.Element {
  return (
    <TraderaStatusCheckContext.Provider value={value}>
      {children}
    </TraderaStatusCheckContext.Provider>
  );
}
