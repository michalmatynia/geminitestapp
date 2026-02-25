'use client';

import { createContext, useContext } from 'react';
import type { IntegrationConnection } from '@/shared/contracts/integrations';
import type { PlaywrightSettingsDto as PlaywrightSettings } from '@/shared/contracts/playwright';
import type { ConnectionFormState } from './integrations-context-types';

export interface IntegrationsForm {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  editingConnectionId: string | null;
  setEditingConnectionId: (id: string | null) => void;
  connectionForm: ConnectionFormState;
  setConnectionForm: React.Dispatch<React.SetStateAction<ConnectionFormState>>;
  connectionToDelete: IntegrationConnection | null;
  setConnectionToDelete: (conn: IntegrationConnection | null) => void;
  playwrightSettings: PlaywrightSettings;
  setPlaywrightSettings: React.Dispatch<React.SetStateAction<PlaywrightSettings>>;
  playwrightPersonaId: string | null;
  savingAllegroSandbox: boolean;
}

export const IntegrationsFormContext = createContext<IntegrationsForm | null>(null);

export const useIntegrationsForm = () => {
  const context = useContext(IntegrationsFormContext);
  if (!context) throw new Error('useIntegrationsForm must be used within IntegrationsProvider');
  return context;
};
