import { useContext } from 'react';

import {
  BindingsStateContext,
  BindingsActionsContext,
  type BindingsState,
  type BindingsActions,
} from '../BindingsContext';

export const useBindingsState = (): BindingsState => {
  const ctx = useContext(BindingsStateContext);
  if (!ctx) throw new Error('useBindingsState must be used within BindingsProvider');
  return ctx;
};

export const useBindingsActions = (): BindingsActions => {
  const ctx = useContext(BindingsActionsContext);
  if (!ctx) throw new Error('useBindingsActions must be used within BindingsProvider');
  return ctx;
};
