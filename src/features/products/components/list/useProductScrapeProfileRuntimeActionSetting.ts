'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  usePlaywrightActions,
  useSavePlaywrightActionsMutation,
} from '@/shared/hooks/usePlaywrightStepSequencer';
import { toActionSequenceKey } from '@/shared/lib/browser-execution/runtime-action-keys';

import {
  type ProductScrapeProfileRuntimeActionConnection,
  resolveProductScrapeProfileActionConnection,
  resolveProductScrapeProfileHeadless,
  updateProductScrapeProfileHeadlessAction,
} from './ProductScrapeProfilesModal.runtime-settings';

type BrowserModeDraft = {
  baseline: boolean;
  dirty: boolean;
  value: boolean;
};

export type ProductScrapeProfileRuntimeActionSetting = {
  action: ProductScrapeProfileRuntimeActionConnection | null;
  hasUnsavedChanges: boolean;
  headless: boolean;
  isLoading: boolean;
  isSaving: boolean;
  persist: () => Promise<void>;
  setHeadless: (headless: boolean) => void;
};

const reconcileBrowserModeDraft = (
  current: BrowserModeDraft,
  runtimeHeadless: boolean
): BrowserModeDraft => {
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

export const useProductScrapeProfileRuntimeActionSetting = (
  enabled: boolean,
  runtimeActionKey: string | null | undefined
): ProductScrapeProfileRuntimeActionSetting => {
  const hasRuntimeAction = toActionSequenceKey(runtimeActionKey) !== null;
  const actionsQuery = usePlaywrightActions({ enabled: enabled && hasRuntimeAction });
  const saveActions = useSavePlaywrightActionsMutation();
  const runtimeHeadless = useMemo(
    () => resolveProductScrapeProfileHeadless(actionsQuery.data, runtimeActionKey),
    [actionsQuery.data, runtimeActionKey]
  );
  const action = useMemo(
    () => resolveProductScrapeProfileActionConnection(actionsQuery.data, runtimeActionKey),
    [actionsQuery.data, runtimeActionKey]
  );
  const [draft, setDraft] = useState<BrowserModeDraft>(() => ({
    baseline: runtimeHeadless,
    dirty: false,
    value: runtimeHeadless,
  }));

  useEffect(() => {
    setDraft((current) => reconcileBrowserModeDraft(current, runtimeHeadless));
  }, [runtimeHeadless]);

  const setHeadless = useCallback((headless: boolean): void => {
    setDraft((current) => ({
      ...current,
      dirty: headless !== current.baseline,
      value: headless,
    }));
  }, []);

  const persist = useCallback(async (): Promise<void> => {
    if (!draft.dirty) return;
    const actions = actionsQuery.data;
    if (actions === undefined) {
      throw new Error('Playwright action settings are still loading.');
    }
    await saveActions.mutateAsync({
      actions: updateProductScrapeProfileHeadlessAction({
        actions,
        headless: draft.value,
        runtimeActionKey,
      }),
    });
    setDraft((current) => ({
      baseline: current.value,
      dirty: false,
      value: current.value,
    }));
  }, [actionsQuery.data, draft.dirty, draft.value, runtimeActionKey, saveActions]);

  return {
    action,
    hasUnsavedChanges: draft.dirty,
    headless: draft.value,
    isLoading: hasRuntimeAction && actionsQuery.data === undefined,
    isSaving: saveActions.isPending,
    persist,
    setHeadless,
  };
};
