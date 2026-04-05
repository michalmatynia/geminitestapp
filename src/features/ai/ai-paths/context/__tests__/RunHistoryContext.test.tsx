// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  RunHistoryProvider,
  useRunHistoryActions,
  useRunHistoryState,
} from '../RunHistoryContext';

describe('RunHistoryContext', () => {
  it('throws when state hook is used outside the provider', () => {
    expect(() => renderHook(() => useRunHistoryState())).toThrow(
      'useRunHistoryState must be used within a RunHistoryProvider'
    );
  });

  it('throws when actions hook is used outside the provider', () => {
    expect(() => renderHook(() => useRunHistoryActions())).toThrow(
      'useRunHistoryActions must be used within a RunHistoryProvider'
    );
  });

  it('handles detail wiring and deduplicated event merging inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
      <RunHistoryProvider>{children}</RunHistoryProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useRunHistoryActions(),
        state: useRunHistoryState(),
      }),
      { wrapper }
    );

    const openRunDetail = vi.fn();

    act(() => {
      result.current.actions.setOpenRunDetailHandler(openRunDetail);
      result.current.actions.openRunDetail('run-1');
      result.current.actions.setRunDetail({
        run: {
          id: 'run-1',
          status: 'running',
          createdAt: '2026-04-03T10:00:00.000Z',
          updatedAt: '2026-04-03T10:00:00.000Z',
        },
        nodes: [],
        events: [
          { id: 'event-2', createdAt: '2026-04-03T10:00:02.000Z' },
          { id: 'event-1', createdAt: '2026-04-03T10:00:01.000Z' },
        ],
      } as never);
    });

    expect(openRunDetail).toHaveBeenCalledWith('run-1');
    expect(result.current.state.runDetail?.events.map((event) => event.id)).toEqual([
      'event-2',
      'event-1',
    ]);

    act(() => {
      result.current.actions.mergeRunEvents([
        { id: 'event-2', createdAt: '2026-04-03T10:00:02.000Z' },
        { id: 'event-3', createdAt: '2026-04-03T10:00:03.000Z' },
      ] as never);
    });

    expect(result.current.state.runDetail?.events.map((event) => event.id)).toEqual([
      'event-1',
      'event-2',
      'event-3',
    ]);
  });
});
