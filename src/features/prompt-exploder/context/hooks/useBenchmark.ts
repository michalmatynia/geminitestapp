import { useContext } from 'react';

import {
  BenchmarkStateContext,
  BenchmarkActionsContext,
  type BenchmarkState,
  type BenchmarkActions,
} from '../BenchmarkContext';

export const useBenchmarkState = (): BenchmarkState => {
  const ctx = useContext(BenchmarkStateContext);
  if (!ctx) throw new Error('useBenchmarkState must be used within BenchmarkProvider');
  return ctx;
};

export const useBenchmarkActions = (): BenchmarkActions => {
  const ctx = useContext(BenchmarkActionsContext);
  if (!ctx) throw new Error('useBenchmarkActions must be used within BenchmarkProvider');
  return ctx;
};
