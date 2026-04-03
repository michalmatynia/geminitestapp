'use client';

import type React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext as createSharedStrictContext } from '@/shared/lib/react/createStrictContext';

export function createStrictContext<T>({
  displayName,
  errorMessage,
}: {
  displayName: string;
  errorMessage: string;
}): {
  Context: React.Context<T | null>;
  useValue: () => T;
  useOptionalValue: () => T | null;
} {
  const {
    Context,
    useStrictContext,
    useOptionalContext,
  } = createSharedStrictContext<T>({
    hookName: displayName,
    providerName: displayName,
    displayName,
    errorFactory: (): Error => internalError(errorMessage),
  });

  return {
    Context: Context as React.Context<T | null>,
    useValue: useStrictContext,
    useOptionalValue: useOptionalContext,
  };
}
