'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import { useAdmin3DAssetsState } from '../hooks/useAdmin3DAssetsState';

type Admin3DAssetsContextValue = ReturnType<typeof useAdmin3DAssetsState>;

export const {
  Context: Admin3DAssetsContext,
  useStrictContext: useAdmin3DAssetsContext,
} = createStrictContext<Admin3DAssetsContextValue>({
  hookName: 'useAdmin3DAssetsContext',
  providerName: 'an Admin3DAssetsProvider',
  displayName: 'Admin3DAssetsContext',
  errorFactory: internalError,
});

export function Admin3DAssetsProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const value = useAdmin3DAssetsState();
  return <Admin3DAssetsContext.Provider value={value}>{children}</Admin3DAssetsContext.Provider>;
}
