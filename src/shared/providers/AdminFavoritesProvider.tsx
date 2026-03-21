'use client';

import * as React from 'react';

export type AdminFavoriteCandidate = {
  id: string;
  label: string;
};

export type AdminFavoritesContextValue = {
  favoritesKey: string;
  candidates: AdminFavoriteCandidate[];
  resolveCandidate: (pathname: string | null, searchParams: URLSearchParams) => AdminFavoriteCandidate | null;
};

const AdminFavoritesContext = React.createContext<AdminFavoritesContextValue | undefined>(undefined);

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
  const context = React.useContext(AdminFavoritesContext);
  if (!context) {
    return {
      favoritesKey: '',
      candidates: [],
      resolveCandidate: () => null,
    };
  }
  return context;
}
