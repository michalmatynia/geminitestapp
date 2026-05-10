'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  useListingSelection,
} from '@/features/integrations/context/ListingSettingsContext';
import type { ActionSequenceKey } from '@/shared/lib/browser-execution/action-sequences';
import {
  defaultPlaywrightActionExecutionSettings,
  normalizePlaywrightAction,
  type PlaywrightAction,
} from '@/shared/contracts/playwright-steps';
import {
  getPlaywrightRuntimeActionSeed,
  mergeSeededPlaywrightActions,
} from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';
import {
  usePlaywrightActions,
  useSavePlaywrightActionsMutation,
} from '@/shared/hooks/usePlaywrightStepSequencer';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export type TraderaListingActionInfo = {
  loading: boolean;
  saving: boolean;
  actionKey: ActionSequenceKey | null;
  action: PlaywrightAction | null;
  actionName: string | null;
  actionDescription: string | null;
  actionId: string | null;
  browserModeLabel: 'Headed' | 'Headless' | 'Runtime default';
  enabledStepCount: number | null;
  hasUnsavedChanges: boolean;
  headless: boolean;
  isSeedFallback: boolean;
  setHeadless: (headless: boolean) => void;
  defaultConcurrencyMode: 'sequential' | 'concurrent' | null;
  totalStepCount: number | null;
};

type TraderaBrowserModeDraft = {
  baseline: boolean;
  dirty: boolean;
  value: boolean;
};

const DEFAULT_TRADERA_ACTION_HEADLESS = true;

const findTraderaListingAction = (
  actions: readonly PlaywrightAction[] | null | undefined,
  actionKey: ActionSequenceKey | null
): PlaywrightAction | null => {
  if (actionKey === null) return null;
  const mergedActions = mergeSeededPlaywrightActions([...(actions ?? [])]);
  return (
    mergedActions.find((action) => action.runtimeKey === actionKey) ??
    getPlaywrightRuntimeActionSeed(actionKey)
  );
};

const formatBrowserModeLabel = (
  headless: boolean | null
): TraderaListingActionInfo['browserModeLabel'] => {
  if (headless === null) return 'Runtime default';
  return headless ? 'Headless' : 'Headed';
};

const resolveActionHeadless = (
  actions: readonly PlaywrightAction[] | null | undefined,
  actionKey: ActionSequenceKey | null
): boolean =>
  findTraderaListingAction(actions, actionKey)?.executionSettings.headless ??
  DEFAULT_TRADERA_ACTION_HEADLESS;

const reconcileBrowserModeDraft = (
  current: TraderaBrowserModeDraft,
  runtimeHeadless: boolean
): TraderaBrowserModeDraft => {
  if (current.baseline === runtimeHeadless) return current;
  if (!current.dirty) {
    return { baseline: runtimeHeadless, dirty: false, value: runtimeHeadless };
  }
  return {
    baseline: runtimeHeadless,
    dirty: current.value !== runtimeHeadless,
    value: current.value,
  };
};

export const resolveTraderaListingRuntimeActionKey = ({
  integrationSlug,
  traderaBrowserMode,
}: {
  integrationSlug: string | null | undefined;
  traderaBrowserMode: unknown;
}): ActionSequenceKey | null => {
  if (!isTraderaBrowserIntegrationSlug(integrationSlug)) return null;
  return traderaBrowserMode === 'scripted'
    ? 'tradera_quicklist_list'
    : 'tradera_standard_list';
};

export const updateTraderaListingActionHeadless = ({
  actions,
  actionKey,
  headless,
  updatedAt = new Date().toISOString(),
}: {
  actions: readonly PlaywrightAction[];
  actionKey: ActionSequenceKey;
  headless: boolean;
  updatedAt?: string;
}): PlaywrightAction[] =>
  mergeSeededPlaywrightActions([...actions]).map((action) =>
    action.runtimeKey === actionKey
      ? normalizePlaywrightAction({
          ...action,
          executionSettings: {
            ...defaultPlaywrightActionExecutionSettings,
            ...action.executionSettings,
            headless,
          },
          updatedAt,
        })
      : action
  );

export function useTraderaListingActionForRuntimeKey(
  actionKey: ActionSequenceKey | null
): TraderaListingActionInfo {
  const playwrightActionsQuery = usePlaywrightActions({
    enabled: actionKey !== null,
  });
  const saveActions = useSavePlaywrightActionsMutation();

  const action = useMemo((): PlaywrightAction | null => {
    return findTraderaListingAction(playwrightActionsQuery.data, actionKey);
  }, [actionKey, playwrightActionsQuery.data]);
  const runtimeHeadless = useMemo(
    () => resolveActionHeadless(playwrightActionsQuery.data, actionKey),
    [actionKey, playwrightActionsQuery.data]
  );
  const hasStoredAction = useMemo(
    () =>
      Boolean(
        actionKey &&
          playwrightActionsQuery.data?.some((entry) => entry.runtimeKey === actionKey)
      ),
    [actionKey, playwrightActionsQuery.data]
  );
  const [browserModeDraft, setBrowserModeDraft] = useState<TraderaBrowserModeDraft>(() => ({
    baseline: runtimeHeadless,
    dirty: false,
    value: runtimeHeadless,
  }));

  useEffect(() => {
    setBrowserModeDraft((current) => reconcileBrowserModeDraft(current, runtimeHeadless));
  }, [runtimeHeadless]);

  const setHeadless = useCallback(
    (headless: boolean): void => {
      setBrowserModeDraft((current) => ({
        ...current,
        dirty: headless !== current.baseline,
        value: headless,
      }));

      if (actionKey === null || playwrightActionsQuery.data === undefined) return;

      void saveActions
        .mutateAsync({
          actions: updateTraderaListingActionHeadless({
            actions: playwrightActionsQuery.data,
            actionKey,
            headless,
          }),
        })
        .then(() => {
          setBrowserModeDraft({
            baseline: headless,
            dirty: false,
            value: headless,
          });
        })
        .catch((error: unknown) => {
          logClientCatch(error, {
            source: 'TraderaListingSettings',
            action: 'saveActionBrowserMode',
            actionKey,
          });
          setBrowserModeDraft((current) => ({
            ...current,
            dirty: current.value !== current.baseline,
          }));
        });
    },
    [actionKey, playwrightActionsQuery.data, saveActions]
  );
  const enabledStepCount = action?.blocks.filter((block) => block.enabled !== false).length ?? null;

  return {
    loading: playwrightActionsQuery.isLoading,
    saving: saveActions.isPending,
    actionKey,
    action,
    actionName: action?.name ?? null,
    actionDescription: action?.description ?? null,
    actionId: action?.id ?? null,
    browserModeLabel: formatBrowserModeLabel(browserModeDraft.value),
    enabledStepCount,
    hasUnsavedChanges: browserModeDraft.dirty,
    headless: browserModeDraft.value,
    isSeedFallback: action !== null && !hasStoredAction,
    setHeadless,
    defaultConcurrencyMode: (action?.concurrencyMode ?? null),
    totalStepCount: action?.blocks.length ?? null,
  };
}

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
    return resolveTraderaListingRuntimeActionKey({
      integrationSlug: selectedIntegration?.slug,
      traderaBrowserMode: selectedConnection?.traderaBrowserMode,
    });
  }, [isTraderaIntegration, selectedIntegration?.slug, selectedConnection?.traderaBrowserMode]);

  return useTraderaListingActionForRuntimeKey(actionKey);
}
