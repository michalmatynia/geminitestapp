'use client';

import { createContext, useContext } from 'react';
import type { Integration, IntegrationConnection } from '@/shared/contracts/integrations';
import type { PlaywrightPersonaDto as PlaywrightPersona } from '@/shared/contracts/playwright';

export interface IntegrationsData {
  integrations: Integration[];
  integrationsLoading: boolean;
  activeIntegration: Integration | null;
  setActiveIntegration: (integration: Integration | null) => void;
  connections: IntegrationConnection[];
  connectionsLoading: boolean;
  playwrightPersonas: PlaywrightPersona[];
  playwrightPersonasLoading: boolean;
}

export const IntegrationsDataContext = createContext<IntegrationsData | null>(null);

export const useIntegrationsData = () => {
  const context = useContext(IntegrationsDataContext);
  if (!context) throw new Error('useIntegrationsData must be used within IntegrationsProvider');
  return context;
};
