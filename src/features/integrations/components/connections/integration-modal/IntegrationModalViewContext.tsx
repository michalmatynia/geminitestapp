'use client';

import React from 'react';

import { createStrictContext } from '@/features/integrations/context/createStrictContext';

export type IntegrationModalViewContextValue = {
  integrationName: string;
  activeTab: string;
  isTradera: boolean;
  isVinted: boolean;
  is1688: boolean;
  isAllegro: boolean;
  isLinkedIn: boolean;
  isBaselinker: boolean;
  showPlaywright: boolean;
  showAllegroConsole: boolean;
  showBaseConsole: boolean;
  activeConnection: unknown;
  onOpenSessionModal: () => void;
  onSavePlaywrightFallbackSettings: () => void;
};

export const { Context: IntegrationModalViewContext, useValue: useIntegrationModalViewContext } =
  createStrictContext<IntegrationModalViewContextValue>({
    displayName: 'IntegrationModalViewContext',
    errorMessage:
      'useIntegrationModalViewContext must be used within IntegrationModalViewProvider',
  });

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
