'use client';

import React, { ReactNode, useEffect, useMemo, useState } from 'react';

import { DEFAULT_TRADERA_SYSTEM_SETTINGS } from '@/features/integrations/constants/tradera';
import type { IntegrationWithConnections, IntegrationConnectionBasic } from '@/shared/contracts/integrations/domain';
import type { BaseInventory } from '@/shared/contracts/integrations/base-com';
import type { IntegrationTemplate as Template } from '@/shared/contracts/integrations';

import { useBaseComSettings } from '../components/listings/hooks/useBaseComSettings';
import { useIntegrationSelection } from '../components/listings/hooks/useIntegrationSelection';
import { createStrictContext } from './createStrictContext';

// --- Granular Contexts ---

export interface ListingSelection {
  integrations: IntegrationWithConnections[];
  loadingIntegrations: boolean;
  selectedIntegrationId: string;
  selectedConnectionId: string;
  selectedIntegration: IntegrationWithConnections | null;
  isBaseComIntegration: boolean;
  isTraderaIntegration: boolean;
  setSelectedIntegrationId: (id: string) => void;
  setSelectedConnectionId: (id: string) => void;
}
export const {
  Context: SelectionContext,
  useValue: useListingSelection,
  useOptionalValue: useOptionalListingSelection,
} = createStrictContext<ListingSelection>({
  displayName: 'ListingSelectionContext',
  errorMessage: 'useListingSelection must be used within ListingSettingsProvider',
});

export interface ListingBaseComSettings {
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
export const { Context: BaseComSettingsContext, useValue: useListingBaseComSettings } =
  createStrictContext<ListingBaseComSettings>({
    displayName: 'ListingBaseComSettingsContext',
    errorMessage: 'useListingBaseComSettings must be used within ListingSettingsProvider',
  });

export interface ListingTraderaSettings {
  selectedTraderaDurationHours: number;
  setSelectedTraderaDurationHours: (value: number) => void;
  selectedTraderaAutoRelistEnabled: boolean;
  setSelectedTraderaAutoRelistEnabled: (value: boolean) => void;
  selectedTraderaAutoRelistLeadMinutes: number;
  setSelectedTraderaAutoRelistLeadMinutes: (value: number) => void;
  selectedTraderaTemplateId: string;
  setSelectedTraderaTemplateId: (value: string) => void;
}
export const { Context: TraderaSettingsContext, useValue: useListingTraderaSettings } =
  createStrictContext<ListingTraderaSettings>({
    displayName: 'ListingTraderaSettingsContext',
    errorMessage: 'useListingTraderaSettings must be used within ListingSettingsProvider',
  });

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
  const baseComSettings = useBaseComSettings(
    selection.isBaseComIntegration,
    selection.selectedConnectionId
  );
  const [selectedTraderaDurationHours, setSelectedTraderaDurationHours] = useState<number>(
    DEFAULT_TRADERA_SYSTEM_SETTINGS.defaultDurationHours
  );
  const [selectedTraderaAutoRelistEnabled, setSelectedTraderaAutoRelistEnabled] = useState<boolean>(
    DEFAULT_TRADERA_SYSTEM_SETTINGS.autoRelistEnabled
  );
  const [selectedTraderaAutoRelistLeadMinutes, setSelectedTraderaAutoRelistLeadMinutes] =
    useState<number>(DEFAULT_TRADERA_SYSTEM_SETTINGS.autoRelistLeadMinutes);
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
    setSelectedTraderaTemplateId(selectedTraderaConnection?.traderaDefaultTemplateId ?? 'none');
  }, [selection.isTraderaIntegration, selectedTraderaConnection]);

  const selectionValue = useMemo<ListingSelection>(
    () => ({
      ...selection,
      selectedIntegration: selection.selectedIntegration ?? null,
      loadingIntegrations: selection.loading,
    }),
    [selection]
  );

  const traderaValue = useMemo<ListingTraderaSettings>(
    () => ({
      selectedTraderaDurationHours,
      setSelectedTraderaDurationHours,
      selectedTraderaAutoRelistEnabled,
      setSelectedTraderaAutoRelistEnabled,
      selectedTraderaAutoRelistLeadMinutes,
      setSelectedTraderaAutoRelistLeadMinutes,
      selectedTraderaTemplateId,
      setSelectedTraderaTemplateId,
    }),
    [
      selectedTraderaDurationHours,
      selectedTraderaAutoRelistEnabled,
      selectedTraderaAutoRelistLeadMinutes,
      selectedTraderaTemplateId,
    ]
  );

  return (
    <SelectionContext.Provider value={selectionValue}>
      <BaseComSettingsContext.Provider value={baseComSettings}>
        <TraderaSettingsContext.Provider value={traderaValue}>
          {children}
        </TraderaSettingsContext.Provider>
      </BaseComSettingsContext.Provider>
    </SelectionContext.Provider>
  );
}
