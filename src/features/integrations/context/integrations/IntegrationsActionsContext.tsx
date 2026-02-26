'use client';

import { createContext, useContext } from 'react';
import type { IntegrationConnection } from '@/shared/contracts/integrations';
import type { IntegrationDefinition } from '../integrations-context-types';

export interface IntegrationsActions {
  handleIntegrationClick: (definition: IntegrationDefinition) => Promise<void>;
  handleSaveConnection: () => Promise<void>;
  handleDeleteConnection: (connection: IntegrationConnection) => void;
  handleConfirmDeleteConnection: () => Promise<void>;
  handleBaselinkerTest: (connection: IntegrationConnection) => Promise<void>;
  handleAllegroTest: (connection: IntegrationConnection) => Promise<void>;
  handleTestConnection: (connection: IntegrationConnection) => Promise<void>;
  handleTraderaManualLogin: (connection: IntegrationConnection) => Promise<void>;
  handleSelectPlaywrightPersona: (personaId: string | null) => Promise<void>;
  handleSavePlaywrightSettings: () => Promise<void>;
  handleAllegroAuthorize: () => void;
  handleAllegroDisconnect: () => Promise<void>;
  handleAllegroSandboxToggle: (value: boolean) => Promise<void>;
  handleAllegroSandboxConnect: () => Promise<void>;
  handleBaseApiRequest: () => Promise<void>;
  handleAllegroApiRequest: () => Promise<void>;
  onCloseModal: () => void;
  onOpenSessionModal: () => void;
}

export const IntegrationsActionsContext = createContext<IntegrationsActions | null>(null);

export const useIntegrationsActions = () => {
  const context = useContext(IntegrationsActionsContext);
  if (!context) throw new Error('useIntegrationsActions must be used within IntegrationsProvider');
  return context;
};
