'use client';

import React from 'react';

export type IntegrationModalViewContextValue = {
  integrationName: string;
  activeTab: string;
  isTradera: boolean;
  isAllegro: boolean;
  isBaselinker: boolean;
  showPlaywright: boolean;
  showAllegroConsole: boolean;
  showBaseConsole: boolean;
  activeConnection: unknown;
  onOpenSessionModal: () => void;
  onSavePlaywrightSettings: () => void;
};

const IntegrationModalViewContext = React.createContext<IntegrationModalViewContextValue | null>(
  null
);

type IntegrationModalViewProviderProps = {
  value: IntegrationModalViewContextValue;
  children: React.ReactNode;
};

export function IntegrationModalViewProvider({
  value,
  children,
}: IntegrationModalViewProviderProps): React.JSX.Element {
  return (
    <IntegrationModalViewContext.Provider value={value}>
      {children}
    </IntegrationModalViewContext.Provider>
  );
}

export function useIntegrationModalViewContext(): IntegrationModalViewContextValue {
  const context = React.useContext(IntegrationModalViewContext);
  if (!context) {
    throw new Error(
      'useIntegrationModalViewContext must be used within IntegrationModalViewProvider'
    );
  }
  return context;
}
