'use client';

import { useMemo } from 'react';

import {
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  useListingSelection,
} from '@/features/integrations/context/ListingSettingsContext';
import type { ActionSequenceKey } from '@/shared/lib/browser-execution/action-sequences';
import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import { usePlaywrightActions } from '@/shared/hooks/usePlaywrightStepSequencer';

export type TraderaListingActionInfo = {
  loading: boolean;
  actionKey: ActionSequenceKey | null;
  action: PlaywrightAction | null;
  actionName: string | null;
  defaultConcurrencyMode: 'sequential' | 'concurrent' | null;
};

export function useTraderaListingAction(): TraderaListingActionInfo {
  const { selectedIntegration, selectedConnectionId, isTraderaIntegration } = useListingSelection();

  const selectedConnection = useMemo(() => {
    if (!isTraderaIntegration || !selectedIntegration) return null;
    return (
      selectedIntegration.connections.find((c) => c.id === selectedConnectionId) ?? null
    );
  }, [isTraderaIntegration, selectedIntegration, selectedConnectionId]);

  const actionKey = useMemo((): ActionSequenceKey | null => {
    if (!isTraderaIntegration) return null;
    if (!isTraderaBrowserIntegrationSlug(selectedIntegration?.slug)) return null;
    return selectedConnection?.traderaBrowserMode === 'scripted'
      ? 'tradera_quicklist_list'
      : 'tradera_standard_list';
  }, [isTraderaIntegration, selectedIntegration?.slug, selectedConnection?.traderaBrowserMode]);

  const playwrightActionsQuery = usePlaywrightActions({
    enabled: actionKey !== null,
  });

  const action = useMemo((): PlaywrightAction | null => {
    if (!actionKey || !playwrightActionsQuery.data) return null;
    return (
      playwrightActionsQuery.data.find((a) => a.runtimeKey === actionKey) ?? null
    );
  }, [actionKey, playwrightActionsQuery.data]);

  return {
    loading: playwrightActionsQuery.isLoading,
    actionKey,
    action,
    actionName: action?.name ?? null,
    defaultConcurrencyMode: (action?.concurrencyMode ?? null) as 'sequential' | 'concurrent' | null,
  };
}
