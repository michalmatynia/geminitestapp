'use client';

import React from 'react';
import type { useGamesLibraryState } from './GamesLibrary.hooks';

export type GamesLibraryState = ReturnType<typeof useGamesLibraryState>;

export const GamesLibraryContext = React.createContext<GamesLibraryState | null>(null);

export function useGamesLibraryContext(): GamesLibraryState {
  const context = React.useContext(GamesLibraryContext);
  if (!context) {
    throw new Error('useGamesLibraryContext must be used within a GamesLibraryProvider');
  }
  return context;
}
