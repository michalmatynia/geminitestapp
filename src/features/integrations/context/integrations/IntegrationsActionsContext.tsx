'use client';

import type { IntegrationConnection } from '@/shared/contracts/integrations/connections';

import type { IntegrationDefinition, SaveConnectionOptions } from '../integrations-context-types';
import { createStrictContext } from '../createStrictContext';

export interface IntegrationsActions {
  handleIntegrationClick: (definition: IntegrationDefinition) => Promise<void>;
  handleSaveConnection: (options?: SaveConnectionOptions) => Promise<IntegrationConnection | null>;
  handleDeleteConnection: (connection: IntegrationConnection) => void;
  handleConfirmDeleteConnection: (userPassword: string) => Promise<boolean>;
  handleBaselinkerTest: (connection: IntegrationConnection) => Promise<void>;
  handleAllegroTest: (connection: IntegrationConnection) => Promise<void>;
  handleTestConnection: (connection: IntegrationConnection) => Promise<void>;
  handleTraderaManualLogin: (connection: IntegrationConnection) => Promise<void>;
  handleVintedManualLogin: (connection: IntegrationConnection) => Promise<void>;
  handleSelectPlaywrightPersona: (personaId: string | null) => Promise<void>;
  handleSavePlaywrightSettings: () => Promise<void>;
  handleAllegroAuthorize: () => void;
  handleAllegroDisconnect: () => Promise<void>;
  handleAllegroSandboxToggle: (value: boolean) => Promise<void>;
  handleAllegroSandboxConnect: () => Promise<void>;
  handleLinkedInAuthorize: () => void;
  handleLinkedInDisconnect: () => Promise<void>;
  handleBaseApiRequest: () => Promise<void>;
  handleAllegroApiRequest: () => Promise<void>;
  onCloseModal: () => void;
  onOpenSessionModal: () => void;
  handleResetListingScript: () => Promise<void>;
}

export const { Context: IntegrationsActionsContext, useValue: useIntegrationsActions } =
  createStrictContext<IntegrationsActions>({
    displayName: 'IntegrationsActionsContext',
    errorMessage: 'useIntegrationsActions must be used within IntegrationsProvider',
  });
