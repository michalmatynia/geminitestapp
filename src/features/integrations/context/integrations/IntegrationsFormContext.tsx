'use client';

import type { IntegrationConnection } from '@/shared/contracts/integrations/connections';
import { createStrictContext } from '../createStrictContext';

export interface IntegrationsForm {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  editingConnectionId: string | null;
  setEditingConnectionId: (id: string | null) => void;
  connectionToDelete: IntegrationConnection | null;
  setConnectionToDelete: (conn: IntegrationConnection | null) => void;
  savingAllegroSandbox: boolean;
}

export const { Context: IntegrationsFormContext, useValue: useIntegrationsForm } =
  createStrictContext<IntegrationsForm>({
    displayName: 'IntegrationsFormContext',
    errorMessage: 'useIntegrationsForm must be used within IntegrationsProvider',
  });
