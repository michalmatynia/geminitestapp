// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { BenchmarkActions, BenchmarkState } from './BenchmarkContext';
import {
  BenchmarkActionsContext,
  BenchmarkStateContext,
  useBenchmarkActions,
  useBenchmarkState,
} from './BenchmarkContext';
import type { BindingsActions, BindingsState } from './BindingsContext';
import {
  BindingsActionsContext,
  BindingsStateContext,
  useBindingsActions,
  useBindingsState,
} from './BindingsContext';
import type { LibraryActions, LibraryState } from './LibraryContext';
import {
  LibraryActionsContext,
  LibraryStateContext,
  useLibraryActions,
  useLibraryState,
} from './LibraryContext';
import type { SegmentEditorActions, SegmentEditorState } from './SegmentEditorContext';
import {
  SegmentEditorActionsContext,
  SegmentEditorStateContext,
  useSegmentEditorActions,
  useSegmentEditorState,
} from './SegmentEditorContext';

type ContextPair<StateValue, ActionsValue> = {
  actionsContext: React.Context<ActionsValue>;
  actionsHook: () => ActionsValue;
  actionsMessage: string;
  actionsValue: ActionsValue;
  stateContext: React.Context<StateValue>;
  stateHook: () => StateValue;
  stateMessage: string;
  stateValue: StateValue;
};

const expectContextPair = <StateValue, ActionsValue>({
  actionsContext,
  actionsHook,
  actionsMessage,
  actionsValue,
  stateContext,
  stateHook,
  stateMessage,
  stateValue,
}: ContextPair<StateValue, ActionsValue>): void => {
  expect(() => renderHook(() => stateHook())).toThrow(stateMessage);
  expect(() => renderHook(() => actionsHook())).toThrow(actionsMessage);

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <stateContext.Provider value={stateValue}>
      <actionsContext.Provider value={actionsValue}>{children}</actionsContext.Provider>
    </stateContext.Provider>
  );

  const { result } = renderHook(
    () => ({
      actions: actionsHook(),
      state: stateHook(),
    }),
    { wrapper }
  );

  expect(result.current.state).toBe(stateValue);
  expect(result.current.actions).toBe(actionsValue);
};

describe('PromptExploder split contexts', () => {
  it('enforces BenchmarkProvider hooks', () => {
    expectContextPair({
      actionsContext: BenchmarkActionsContext,
      actionsHook: useBenchmarkActions,
      actionsMessage: 'useBenchmarkActions must be used within BenchmarkProvider',
      actionsValue: {
        handleApplyBenchmarkRuleSet: () => undefined,
      } as unknown as BenchmarkActions,
      stateContext: BenchmarkStateContext,
      stateHook: useBenchmarkState,
      stateMessage: 'useBenchmarkState must be used within BenchmarkProvider',
      stateValue: {
        benchmarkReport: null,
      } as unknown as BenchmarkState,
    });
  });

  it('enforces BindingsProvider hooks', () => {
    expectContextPair({
      actionsContext: BindingsActionsContext,
      actionsHook: useBindingsActions,
      actionsMessage: 'useBindingsActions must be used within BindingsProvider',
      actionsValue: {
        handleAddManualBinding: () => undefined,
        handleRemoveManualBinding: () => undefined,
        setBindingDraft: () => undefined,
      } as unknown as BindingsActions,
      stateContext: BindingsStateContext,
      stateHook: useBindingsState,
      stateMessage: 'useBindingsState must be used within BindingsProvider',
      stateValue: {
        bindingDraft: null,
        fromSubsectionOptions: [],
        toSubsectionOptions: [],
      } as unknown as BindingsState,
    });
  });

  it('enforces LibraryProvider hooks', () => {
    expectContextPair({
      actionsContext: LibraryActionsContext,
      actionsHook: useLibraryActions,
      actionsMessage: 'useLibraryActions must be used within LibraryProvider',
      actionsValue: {
        captureSegmentationRecord: () => undefined,
      } as unknown as LibraryActions,
      stateContext: LibraryStateContext,
      stateHook: useLibraryState,
      stateMessage: 'useLibraryState must be used within LibraryProvider',
      stateValue: {
        segmentationLibrary: {
          records: [],
          totalCaptured: 0,
          isLoadedFromSettings: false,
        },
      } as unknown as LibraryState,
    });
  });

  it('enforces SegmentEditorProvider hooks', () => {
    expectContextPair({
      actionsContext: SegmentEditorActionsContext,
      actionsHook: useSegmentEditorActions,
      actionsMessage: 'useSegmentEditorActions must be used within SegmentEditorProvider',
      actionsValue: {
        handleAddSegmentRelative: () => undefined,
      } as unknown as SegmentEditorActions,
      stateContext: SegmentEditorStateContext,
      stateHook: useSegmentEditorState,
      stateMessage: 'useSegmentEditorState must be used within SegmentEditorProvider',
      stateValue: {
        selectedSegment: null,
      } as unknown as SegmentEditorState,
    });
  });
});
