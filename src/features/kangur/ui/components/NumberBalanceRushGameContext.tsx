'use client';

import React, { createContext, useContext } from 'react';
import { useNumberBalanceRushGameState } from './NumberBalanceRushGame.hooks';

export type NumberBalanceRushGameState = ReturnType<typeof useNumberBalanceRushGameState>;

const NumberBalanceRushGameContext = createContext<NumberBalanceRushGameState | null>(null);

export function NumberBalanceRushGameProvider({
  children,
  state,
}: {
  children: React.ReactNode;
  state: NumberBalanceRushGameState;
}) {
  return (
    <NumberBalanceRushGameContext.Provider value={state}>
      {children}
    </NumberBalanceRushGameContext.Provider>
  );
}

export function useNumberBalanceRushGame(): NumberBalanceRushGameState {
  const context = useContext(NumberBalanceRushGameContext);
  if (!context) {
    throw new Error('useNumberBalanceRushGame must be used within a NumberBalanceRushGameProvider');
  }
  return context;
}
