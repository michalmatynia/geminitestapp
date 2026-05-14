import React from 'react';
import { type useTranslations } from 'next-intl';

export type MultiplicationArrayGameContextValue = {
  a: number;
  b: number;
  celebrating: boolean;
  collected: Set<number>;
  finishLabel: string;
  isCoarsePointer: boolean;
  onFinish: () => void;
  onRestart: () => void;
  onTapGroup: (groupIndex: number) => void;
  translations: ReturnType<typeof useTranslations>;
};

export const MultiplicationArrayGameContext =
  React.createContext<MultiplicationArrayGameContextValue | null>(null);

export function useMultiplicationArrayGame(): MultiplicationArrayGameContextValue {
  const context = React.useContext(MultiplicationArrayGameContext);
  if (!context) {
    throw new Error('useMultiplicationArrayGame must be used within MultiplicationArrayGame.');
  }
  return context;
}
