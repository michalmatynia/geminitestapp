'use client';

import { createContext, useContext } from 'react';

const MISSING_CONTEXT = Symbol('MISSING_CONTEXT');

type MissingContext = typeof MISSING_CONTEXT;

type StrictContextErrorFactory = (message: string) => Error;

export type CreateStrictContextOptions = {
  hookName: string;
  providerName: string;
  displayName?: string;
  errorFactory?: StrictContextErrorFactory;
};

export type StrictContextResult<T> = {
  Context: React.Context<T | MissingContext>;
  useStrictContext: () => T;
  useOptionalContext: () => T | null;
};

export function createStrictContext<T>({
  hookName,
  providerName,
  displayName,
  errorFactory,
}: CreateStrictContextOptions): StrictContextResult<T> {
  const Context = createContext<T | MissingContext>(MISSING_CONTEXT);
  Context.displayName = displayName ?? providerName;

  const useStrictContext = (): T => {
    const context = useContext(Context);
    if (context === MISSING_CONTEXT) {
      const message = `${hookName} must be used within ${providerName}`;
      throw (errorFactory ? errorFactory(message) : new Error(message));
    }
    return context;
  };

  const useOptionalContext = (): T | null => {
    const context = useContext(Context);
    return context === MISSING_CONTEXT ? null : context;
  };

  return {
    Context,
    useStrictContext,
    useOptionalContext,
  };
}
