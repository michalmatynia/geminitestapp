import { useContext } from 'react';

import {
  SettingsStateContext,
  SettingsActionsContext,
  type PromptExploderSettingsState,
  type PromptExploderSettingsActions,
} from '../SettingsContext';

export const useSettingsState = (): PromptExploderSettingsState => {
  const ctx = useContext(SettingsStateContext);
  if (!ctx) throw new Error('useSettingsState must be used within SettingsProvider');
  return ctx;
};

export const useSettingsActions = (): PromptExploderSettingsActions => {
  const ctx = useContext(SettingsActionsContext);
  if (!ctx) throw new Error('useSettingsActions must be used within SettingsProvider');
  return ctx;
};
