'use client';

import React, { createContext, useContext } from 'react';

import { internalError } from '@/shared/errors/app-error';

import { useShippingGroupsStateValue } from './ShippingGroupsContext.controller';
import type { ShippingGroupsStateValue } from './ShippingGroupsContext.types';

const ShippingGroupsStateContext = createContext<ShippingGroupsStateValue | null>(null);

export function ShippingGroupsStateProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const value = useShippingGroupsStateValue();

  return (
    <ShippingGroupsStateContext.Provider value={value}>
      {children}
    </ShippingGroupsStateContext.Provider>
  );
}

export function useShippingGroupsState(): ShippingGroupsStateValue {
  const context = useContext(ShippingGroupsStateContext);
  if (context === null) {
    throw internalError('useShippingGroupsState must be used within a ShippingGroupsStateProvider');
  }
  return context;
}
