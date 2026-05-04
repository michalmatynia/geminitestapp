'use client';

/**
 * Strict Context Factory
 * 
 * Creates type-safe React contexts with mandatory provider checking.
 * Prevents common context usage errors by:
 * - Throwing clear errors when context is used outside provider
 * - Providing optional context access for conditional usage
 * - Enforcing proper context initialization patterns
 * - Supporting custom error messages for better debugging
 * 
 * This utility ensures context consumers always have valid data
 * and provides better developer experience with descriptive errors.
 */

import { createContext, useContext } from 'react';

// Sentinel value to detect missing context providers
const MISSING_CONTEXT = Symbol('MISSING_CONTEXT');

type MissingContext = typeof MISSING_CONTEXT;

type StrictContextErrorFactory = (message: string) => Error;

export type CreateStrictContextOptions = {
  hookName: string; // Name of the hook for error messages
  providerName: string; // Name of the provider component
  displayName?: string; // Optional display name for React DevTools
  errorFactory?: StrictContextErrorFactory; // Custom error factory
};

export type StrictContextResult<T> = {
  Context: React.Context<T | MissingContext>; // The React context
  useStrictContext: () => T; // Hook that throws if provider missing
  useOptionalContext: () => T | null; // Hook that returns null if provider missing
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
      throw errorFactory ? errorFactory(message) : new Error(message);
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
