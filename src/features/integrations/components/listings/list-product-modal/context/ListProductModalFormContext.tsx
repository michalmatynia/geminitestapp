'use client';

import React from 'react';

import type { ImageRetryPreset } from '@/shared/contracts/integrations';

type ListProductModalFormContextValue = {
  error: string | null;
  submitting: boolean;
  onRetryImageExport: (preset: ImageRetryPreset) => void;
};

const ListProductModalFormContext = React.createContext<ListProductModalFormContextValue | null>(
  null
);

type ListProductModalFormProviderProps = {
  value: ListProductModalFormContextValue;
  children: React.ReactNode;
};

export function ListProductModalFormProvider({
  value,
  children,
}: ListProductModalFormProviderProps): React.JSX.Element {
  return (
    <ListProductModalFormContext.Provider value={value}>
      {children}
    </ListProductModalFormContext.Provider>
  );
}

export function useListProductModalFormContext(): ListProductModalFormContextValue {
  const context = React.useContext(ListProductModalFormContext);
  if (!context) {
    throw new Error(
      'useListProductModalFormContext must be used within ListProductModalFormProvider'
    );
  }
  return context;
}
