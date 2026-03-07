'use client';

import { createContext, useContext } from 'react';

export type CompositeFieldContextValue = {
  value: unknown;
  onChange: (value: unknown) => void;
  fieldLabel: string;
  buildAriaLabel: (suffix: string) => string;
};

export const CompositeFieldContext = createContext<CompositeFieldContextValue | null>(null);

export function useCompositeFieldContext(): CompositeFieldContextValue {
  const context = useContext(CompositeFieldContext);
  if (!context) {
    throw new Error('Composite field must be used inside CompositeFieldProvider');
  }
  return context;
}
