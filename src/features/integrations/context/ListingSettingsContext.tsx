'use client';

import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { DEFAULT_TRADERA_SYSTEM_SETTINGS } from '@/features/integrations/constants/tradera';
import type { IntegrationWithConnections, IntegrationConnectionBasic } from '@/shared/contracts/integrations';
import type { BaseInventoryDto as BaseInventory, TemplateDto as Template } from '@/shared/contracts/integrations';
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
  isTraderaIntegration: boolean;
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

  // Tradera Settings
  selectedTraderaDurationHours: number;
  setSelectedTraderaDurationHours: (value: number) => void;
  selectedTraderaAutoRelistEnabled: boolean;
  setSelectedTraderaAutoRelistEnabled: (value: boolean) => void;
  selectedTraderaAutoRelistLeadMinutes: number;
  setSelectedTraderaAutoRelistLeadMinutes: (value: number) => void;
  selectedTraderaTemplateId: string;
  setSelectedTraderaTemplateId: (value: string) => void;
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
  const [selectedTraderaDurationHours, setSelectedTraderaDurationHours] = useState<number>(
    DEFAULT_TRADERA_SYSTEM_SETTINGS.defaultDurationHours
  );
  const [selectedTraderaAutoRelistEnabled, setSelectedTraderaAutoRelistEnabled] = useState<boolean>(
    DEFAULT_TRADERA_SYSTEM_SETTINGS.autoRelistEnabled
  );
  const [selectedTraderaAutoRelistLeadMinutes, setSelectedTraderaAutoRelistLeadMinutes] = useState<number>(
    DEFAULT_TRADERA_SYSTEM_SETTINGS.autoRelistLeadMinutes
  );
  const [selectedTraderaTemplateId, setSelectedTraderaTemplateId] = useState<string>('none');

  const selectedTraderaConnection = useMemo(() => {
    if (!selection.isTraderaIntegration || !selection.selectedIntegration) {
      return null;
    }
    return (
      selection.selectedIntegration.connections.find(
        (connection: IntegrationConnectionBasic) => connection.id === selection.selectedConnectionId
      ) ?? null
    );
  }, [
    selection.isTraderaIntegration,
    selection.selectedConnectionId,
    selection.selectedIntegration,
  ]);

  useEffect(() => {
    if (!selection.isTraderaIntegration) return;
    setSelectedTraderaDurationHours(
      selectedTraderaConnection?.traderaDefaultDurationHours ??
        DEFAULT_TRADERA_SYSTEM_SETTINGS.defaultDurationHours
    );
    setSelectedTraderaAutoRelistEnabled(
      selectedTraderaConnection?.traderaAutoRelistEnabled ??
        DEFAULT_TRADERA_SYSTEM_SETTINGS.autoRelistEnabled
    );
    setSelectedTraderaAutoRelistLeadMinutes(
      selectedTraderaConnection?.traderaAutoRelistLeadMinutes ??
        DEFAULT_TRADERA_SYSTEM_SETTINGS.autoRelistLeadMinutes
    );
    setSelectedTraderaTemplateId(
      selectedTraderaConnection?.traderaDefaultTemplateId ?? 'none'
    );
  }, [selection.isTraderaIntegration, selectedTraderaConnection]);

  const value: ListingSettingsContextType = {
    ...selection,
    selectedIntegration: selection.selectedIntegration ?? null,
    loadingIntegrations: selection.loading,
    ...baseComSettings,
    selectedTraderaDurationHours,
    setSelectedTraderaDurationHours,
    selectedTraderaAutoRelistEnabled,
    setSelectedTraderaAutoRelistEnabled,
    selectedTraderaAutoRelistLeadMinutes,
    setSelectedTraderaAutoRelistLeadMinutes,
    selectedTraderaTemplateId,
    setSelectedTraderaTemplateId,
  };

  return (
    <ListingSettingsContext.Provider value={value}>
      {children}
    </ListingSettingsContext.Provider>
  );
}
