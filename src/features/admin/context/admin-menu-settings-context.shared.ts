'use client';

import { createContext } from 'react';

import type {
  AdminMenuSettingsActionsContextValue,
  AdminMenuSettingsStateContextValue,
} from './AdminMenuSettingsContext.types';

export const AdminMenuSettingsStateContext = createContext<AdminMenuSettingsStateContextValue | null>(
  null
);
export const AdminMenuSettingsActionsContext = createContext<AdminMenuSettingsActionsContextValue | null>(
  null
);
