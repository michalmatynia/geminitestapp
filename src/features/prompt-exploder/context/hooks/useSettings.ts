import { useContext } from 'react';

import {
  SettingsStateContext,
  SettingsActionsContext,
  type SettingsState,
  type SettingsActions,
} from '../SettingsContext';

export const useSettingsState = (): SettingsState => {
  const ctx = useContext(SettingsStateContext);
  if (!ctx) throw new Error('useSettingsState must be used within SettingsProvider');
  return ctx;
};

export const useSettingsActions = (): SettingsActions => {
  const ctx = useContext(SettingsActionsContext);
  if (!ctx) throw new Error('useSettingsActions must be used within SettingsProvider');
  return ctx;
};
