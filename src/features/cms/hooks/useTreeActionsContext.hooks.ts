'use client';

import { useContext, useMemo } from 'react';

import { internalError } from '@/shared/errors/app-error';

import {
  TreeActionsActionsContext,
  TreeActionsStateContext,
} from './useTreeActionsContext';
import type {
  TreeActionsActionsContextValue,
  TreeActionsContextValue,
  TreeActionsStateContextValue,
} from './useTreeActionsContext.types';

export function useTreeActionsState(): TreeActionsStateContextValue {
  const context = useContext(TreeActionsStateContext);
  if (!context) {
    throw internalError('useTreeActionsState must be used within a TreeActionsProvider');
  }
  return context;
}

export function useTreeActionsActions(): TreeActionsActionsContextValue {
  const context = useContext(TreeActionsActionsContext);
  if (!context) {
    throw internalError('useTreeActionsActions must be used within a TreeActionsProvider');
  }
  return context;
}

export function useTreeActions(): TreeActionsContextValue {
  const state = useTreeActionsState();
  const actions = useTreeActionsActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
