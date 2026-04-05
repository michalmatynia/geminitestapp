// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  JobQueueProvider,
  useJobQueueActions,
  useJobQueueState,
} from '../JobQueueContext';

const mocks = vi.hoisted(() => ({
  useJobQueueRuntime: vi.fn(),
}));

vi.mock('../useJobQueueRuntime', () => ({
  useJobQueueRuntime: (...args: unknown[]) => mocks.useJobQueueRuntime(...args),
}));

describe('JobQueueContext', () => {
  it('throws outside the provider for both strict hooks', () => {
    expect(() => renderHook(() => useJobQueueState())).toThrow(
      'useJobQueueState must be used within JobQueueProvider'
    );
    expect(() => renderHook(() => useJobQueueActions())).toThrow(
      'useJobQueueActions must be used within JobQueueProvider'
    );
  });

  it('provides runtime state and actions from useJobQueueRuntime', () => {
    const stateValue = { runs: [], searchQuery: '' } as never;
    const actionsValue = { setSearchQuery: vi.fn(), enqueuePathRun: vi.fn() } as never;

    mocks.useJobQueueRuntime.mockReturnValue({ stateValue, actionsValue });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <JobQueueProvider>{children}</JobQueueProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useJobQueueActions(),
        state: useJobQueueState(),
      }),
      { wrapper }
    );

    expect(result.current.state).toBe(stateValue);
    expect(result.current.actions).toBe(actionsValue);
  });
});
