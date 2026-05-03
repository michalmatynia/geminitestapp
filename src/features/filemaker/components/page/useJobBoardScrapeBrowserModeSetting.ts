'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  usePlaywrightActions,
  useSavePlaywrightActionsMutation,
} from '@/shared/hooks/usePlaywrightStepSequencer';

import {
  type JobBoardScrapeActionConnection,
  resolveJobBoardScrapeActionConnection,
  resolveJobBoardScrapeHeadless,
  updateJobBoardScrapeHeadlessAction,
} from './filemaker-job-board-runtime-settings';

type BrowserModeDraft = {
  baseline: boolean;
  dirty: boolean;
  value: boolean;
};

type JobBoardScrapeBrowserModeSetting = {
  action: JobBoardScrapeActionConnection | null;
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

export const useJobBoardScrapeBrowserModeSetting = (
  enabled: boolean
): JobBoardScrapeBrowserModeSetting => {
  const actionsQuery = usePlaywrightActions({ enabled });
  const saveActions = useSavePlaywrightActionsMutation();
  const runtimeHeadless = useMemo(
    () => resolveJobBoardScrapeHeadless(actionsQuery.data),
    [actionsQuery.data]
  );
  const action = useMemo(
    () => resolveJobBoardScrapeActionConnection(actionsQuery.data),
    [actionsQuery.data]
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
      actions: updateJobBoardScrapeHeadlessAction({
        actions,
        headless: draft.value,
      }),
    });
    setDraft((current) => ({
      baseline: current.value,
      dirty: false,
      value: current.value,
    }));
  }, [actionsQuery.data, draft.dirty, draft.value, saveActions]);

  return {
    action,
    hasUnsavedChanges: draft.dirty,
    headless: draft.value,
    isLoading: actionsQuery.data === undefined,
    isSaving: saveActions.isPending,
    persist,
    setHeadless,
  };
};
