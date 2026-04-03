'use client';

import * as React from 'react';
import type { IdLabelOption } from '@/shared/contracts/base';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

export type AdminFavoriteCandidate = IdLabelOption<string>;

export type AdminFavoritesContextValue = {
  favoritesKey: string;
  candidates: AdminFavoriteCandidate[];
  resolveCandidate: (pathname: string | null, searchParams: URLSearchParams) => AdminFavoriteCandidate | null;
};

const { Context: AdminFavoritesContext, useOptionalContext: useOptionalAdminFavoritesContext } =
  createStrictContext<AdminFavoritesContextValue>({
    hookName: 'useAdminFavorites',
    providerName: 'AdminFavoritesProvider',
    displayName: 'AdminFavoritesContext',
  });

export function AdminFavoritesProvider({
  value,
  children,
}: {
  value: AdminFavoritesContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return <AdminFavoritesContext.Provider value={value}>{children}</AdminFavoritesContext.Provider>;
}

export function useAdminFavorites(): AdminFavoritesContextValue {
  const context = useOptionalAdminFavoritesContext();
  if (!context) {
    return {
      favoritesKey: '',
      candidates: [],
      resolveCandidate: () => null,
    };
  }
  return context;
}
