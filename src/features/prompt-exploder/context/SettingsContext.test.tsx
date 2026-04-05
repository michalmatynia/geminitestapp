// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type {
  PromptExploderSettingsActions,
  PromptExploderSettingsState,
} from './SettingsContext';
import {
  SettingsActionsContext,
  SettingsStateContext,
  useSettingsActions,
  useSettingsState,
} from './SettingsContext';

describe('SettingsContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useSettingsState())).toThrow(
      'useSettingsState must be used within SettingsProvider'
    );
    expect(() => renderHook(() => useSettingsActions())).toThrow(
      'useSettingsActions must be used within SettingsProvider'
    );
  });

  it('returns state and actions inside the provider', () => {
    const stateValue = {
      segmentationLibrary: {
        records: [],
        totalCaptured: 0,
        isLoadedFromSettings: false,
      },
    } as unknown as PromptExploderSettingsState;
    const actionsValue = {
      setLearningDraft: () => undefined,
      setParserTuningDrafts: () => undefined,
      setIsParserTuningOpen: () => undefined,
      setSnapshotDraftName: () => undefined,
      setSelectedSnapshotId: () => undefined,
      setSessionLearnedRules: () => undefined,
      setSessionLearnedTemplates: () => undefined,
      setSaveError: () => undefined,
      updateSetting: {} as never,
      updateSettingsBulk: {} as never,
    } as unknown as PromptExploderSettingsActions;

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SettingsStateContext.Provider value={stateValue}>
        <SettingsActionsContext.Provider value={actionsValue}>
          {children}
        </SettingsActionsContext.Provider>
      </SettingsStateContext.Provider>
    );

    const { result } = renderHook(
      () => ({
        actions: useSettingsActions(),
        state: useSettingsState(),
      }),
      { wrapper }
    );

    expect(result.current.state).toBe(stateValue);
    expect(result.current.actions).toBe(actionsValue);
  });
});
