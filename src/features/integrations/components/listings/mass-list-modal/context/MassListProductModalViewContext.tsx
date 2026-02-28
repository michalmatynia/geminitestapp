'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';

type MassListProductModalViewContextValue = {
  productIds: string[];
  integrationId: string;
  connectionId: string;
  onClose: () => void;
  onSuccess: () => void;
};

const MassListProductModalViewContext =
  React.createContext<MassListProductModalViewContextValue | null>(null);

type MassListProductModalViewProviderProps = {
  value: MassListProductModalViewContextValue;
  children: React.ReactNode;
};

export function MassListProductModalViewProvider({
  value,
  children,
}: MassListProductModalViewProviderProps): React.JSX.Element {
  return (
    <MassListProductModalViewContext.Provider value={value}>
      {children}
    </MassListProductModalViewContext.Provider>
  );
}

export function useMassListProductModalViewContext(): MassListProductModalViewContextValue {
  const context = React.useContext(MassListProductModalViewContext);
  if (!context) {
    throw internalError(
      'useMassListProductModalViewContext must be used within MassListProductModalViewProvider'
    );
  }
  return context;
}
