'use client';

import { createContext, useContext } from 'react';
import { internalError } from '@/shared/errors/app-error';

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
    throw internalError('Composite field must be used inside CompositeFieldProvider');
  }
  return context;
}
