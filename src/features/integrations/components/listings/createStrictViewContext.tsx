'use client';

import React from 'react';

import { createStrictContext } from '@/features/integrations/context/createStrictContext';

type StrictViewContextProviderProps<T> = {
  value: T;
  children: React.ReactNode;
};

export function createStrictViewContext<T>({
  providerName,
  errorMessage,
}: {
  providerName: string;
  errorMessage: string;
}): {
  Provider: (props: StrictViewContextProviderProps<T>) => React.JSX.Element;
  useValue: () => T;
} {
  const { Context, useValue } = createStrictContext<T>({
    displayName: providerName,
    errorMessage,
  });

  function StrictViewContextProvider({
    value,
    children,
  }: StrictViewContextProviderProps<T>): React.JSX.Element {
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  StrictViewContextProvider.displayName = providerName;

  return {
    Provider: StrictViewContextProvider,
    useValue,
  };
}
