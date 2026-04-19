'use client';

import React from 'react';

import {
  AdminMenuSettingsActionsContext,
  AdminMenuSettingsStateContext,
} from './admin-menu-settings-context.shared';
import { useAdminMenuSettingsProviderData } from './admin-menu-settings-provider-data';

export function AdminMenuSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { actionsValue, stateValue } = useAdminMenuSettingsProviderData();

  return (
    <AdminMenuSettingsActionsContext.Provider value={actionsValue}>
      <AdminMenuSettingsStateContext.Provider value={stateValue}>
        {children}
      </AdminMenuSettingsStateContext.Provider>
    </AdminMenuSettingsActionsContext.Provider>
  );
}
