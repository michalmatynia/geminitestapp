'use client';

import type { IntegrationConnection } from '@/shared/contracts/integrations';
import type { PlaywrightSettings } from '@/shared/contracts/playwright';
import { createStrictContext } from '../createStrictContext';

export interface IntegrationsForm {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  editingConnectionId: string | null;
  setEditingConnectionId: (id: string | null) => void;
  connectionToDelete: IntegrationConnection | null;
  setConnectionToDelete: (conn: IntegrationConnection | null) => void;
  playwrightSettings: PlaywrightSettings;
  setPlaywrightSettings: React.Dispatch<React.SetStateAction<PlaywrightSettings>>;
  playwrightPersonaId: string | null;
  savingAllegroSandbox: boolean;
}

export const { Context: IntegrationsFormContext, useValue: useIntegrationsForm } =
  createStrictContext<IntegrationsForm>({
    displayName: 'IntegrationsFormContext',
    errorMessage: 'useIntegrationsForm must be used within IntegrationsProvider',
  });
