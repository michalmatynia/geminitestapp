'use client';

import { useContext, useMemo } from 'react';

import { internalError } from '@/shared/errors/app-error';

import { AdminMenuSettingsProvider } from './AdminMenuSettingsProvider';
import type {
  AdminMenuSettingsActionsContextValue,
  AdminMenuSettingsContextValue,
  AdminMenuSettingsStateContextValue,
} from './AdminMenuSettingsContext.types';
import {
  AdminMenuSettingsActionsContext,
  AdminMenuSettingsStateContext,
} from './admin-menu-settings-context.shared';

export { AdminMenuSettingsProvider };
export type {
  AdminMenuLayoutNodeState,
  AdminMenuSettingsActionsContextValue,
  AdminMenuSettingsContextValue,
  AdminMenuSettingsStateContextValue,
} from './AdminMenuSettingsContext.types';

export function useAdminMenuSettingsState(): AdminMenuSettingsStateContextValue {
  const context = useContext(AdminMenuSettingsStateContext);
  if (!context) {
    throw internalError('useAdminMenuSettingsState must be used within AdminMenuSettingsProvider');
  }
  return context;
}

export function useAdminMenuSettingsActions(): AdminMenuSettingsActionsContextValue {
  const context = useContext(AdminMenuSettingsActionsContext);
  if (!context) {
    throw internalError(
      'useAdminMenuSettingsActions must be used within AdminMenuSettingsProvider'
    );
  }
  return context;
}

export function useAdminMenuSettings(): AdminMenuSettingsContextValue {
  const state = useAdminMenuSettingsState();
  const actions = useAdminMenuSettingsActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
