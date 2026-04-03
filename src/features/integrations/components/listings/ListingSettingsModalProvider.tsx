import React from 'react';

import { ListingSettingsProvider } from '@/features/integrations/context/ListingSettingsContext';

type ListingSettingsModalProviderProps = {
  children: React.ReactNode;
  initialIntegrationId?: string | null;
  initialConnectionId?: string | null;
};

export function ListingSettingsModalProvider({
  children,
  initialIntegrationId,
  initialConnectionId,
}: ListingSettingsModalProviderProps): React.JSX.Element {
  return (
    <ListingSettingsProvider
      initialIntegrationId={initialIntegrationId ?? null}
      initialConnectionId={initialConnectionId ?? null}
    >
      {children}
    </ListingSettingsProvider>
  );
}
