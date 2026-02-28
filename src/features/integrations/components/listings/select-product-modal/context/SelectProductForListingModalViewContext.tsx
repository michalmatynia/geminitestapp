'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';

type SelectProductForListingModalViewContextValue = {
  onClose: () => void;
  onSuccess: () => void;
};

const SelectProductForListingModalViewContext =
  React.createContext<SelectProductForListingModalViewContextValue | null>(null);

type SelectProductForListingModalViewProviderProps = {
  value: SelectProductForListingModalViewContextValue;
  children: React.ReactNode;
};

export function SelectProductForListingModalViewProvider({
  value,
  children,
}: SelectProductForListingModalViewProviderProps): React.JSX.Element {
  return (
    <SelectProductForListingModalViewContext.Provider value={value}>
      {children}
    </SelectProductForListingModalViewContext.Provider>
  );
}

export function useSelectProductForListingModalView(): SelectProductForListingModalViewContextValue {
  const context = React.useContext(SelectProductForListingModalViewContext);
  if (!context) {
    throw internalError(
      'useSelectProductForListingModalView must be used within SelectProductForListingModalViewProvider'
    );
  }
  return context;
}
