'use client';

import React, { createContext, useContext, ReactNode } from 'react';

import type { BaseInventory, Template } from '@/features/data-import-export/types/imports';
import type { IntegrationWithConnections } from '@/features/integrations/types/listings';
import { internalError } from '@/shared/errors/app-error';

import { useBaseComSettings } from '../components/listings/hooks/useBaseComSettings';
import { useIntegrationSelection } from '../components/listings/hooks/useIntegrationSelection';

interface ListingSettingsContextType {
  // Integration & Connection Selection
  integrations: IntegrationWithConnections[];
  loadingIntegrations: boolean;
  selectedIntegrationId: string;
  selectedConnectionId: string;
  selectedIntegration: IntegrationWithConnections | null;
  isBaseComIntegration: boolean;
  setSelectedIntegrationId: (id: string) => void;
  setSelectedConnectionId: (id: string) => void;

  // Base.com Settings
  templates: Template[];
  selectedTemplateId: string;
  setSelectedTemplateId: (id: string) => void;
  inventories: BaseInventory[];
  selectedInventoryId: string;
  setSelectedInventoryId: (id: string) => void;
  loadingInventories: boolean;
  allowDuplicateSku: boolean;
  setAllowDuplicateSku: (allowed: boolean) => void;
}

const ListingSettingsContext = createContext<ListingSettingsContextType | null>(null);

export function useListingSettingsContext(): ListingSettingsContextType {
  const context = useContext(ListingSettingsContext);
  if (!context) {
    throw internalError('useListingSettingsContext must be used within a ListingSettingsProvider');
  }
  return context;
}

export function useOptionalListingSettingsContext(): ListingSettingsContextType | null {
  return useContext(ListingSettingsContext);
}

interface ListingSettingsProviderProps {
  children: ReactNode;
  initialIntegrationId?: string | null;
  initialConnectionId?: string | null;
}

export function ListingSettingsProvider({
  children,
  initialIntegrationId,
  initialConnectionId,
}: ListingSettingsProviderProps): React.JSX.Element {
  const selection = useIntegrationSelection(initialIntegrationId, initialConnectionId);
  const baseComSettings = useBaseComSettings(selection.isBaseComIntegration, selection.selectedConnectionId);

  const value: ListingSettingsContextType = {
    ...selection,
    selectedIntegration: selection.selectedIntegration ?? null,
    loadingIntegrations: selection.loading,
    ...baseComSettings,
  };

  return (
    <ListingSettingsContext.Provider value={value}>
      {children}
    </ListingSettingsContext.Provider>
  );
}
