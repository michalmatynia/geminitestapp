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

/** Sentinel value to detect missing context providers */
const MISSING_CONTEXT = Symbol('MISSING_CONTEXT');

/** Type for the missing context sentinel */
type MissingContext = typeof MISSING_CONTEXT;

/** Function type for creating custom errors */
type StrictContextErrorFactory = (message: string) => Error;

/** Configuration options for creating a strict context */
export type CreateStrictContextOptions = {
  /** Name of the hook for error messages */
  hookName: string;
  /** Name of the provider component */
  providerName: string;
  /** Optional display name for React DevTools */
  displayName?: string;
  /** Custom error factory for creating errors */
  errorFactory?: StrictContextErrorFactory;
};

/** Result type containing context and hooks */
export type StrictContextResult<T> = {
  /** The React context with missing context sentinel */
  Context: React.Context<T | MissingContext>;
  /** Hook that throws if provider is missing */
  useStrictContext: () => T;
  /** Hook that returns null if provider is missing */
  useOptionalContext: () => T | null;
};

/**
 * Creates a strict context that enforces provider presence
 * @param options - Configuration for the context
 * @returns Object containing context and hooks
 */
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
