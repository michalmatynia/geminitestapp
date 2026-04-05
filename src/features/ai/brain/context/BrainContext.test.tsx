// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BrainProvider, useBrain, useBrainActions, useBrainState } from './BrainContext';

const mocks = vi.hoisted(() => ({
  useBrainRuntime: vi.fn(),
}));

vi.mock('./useBrainRuntime', () => ({
  useBrainRuntime: () => mocks.useBrainRuntime(),
}));

describe('BrainContext', () => {
  it('throws when state hook is used outside the provider', () => {
    expect(() => renderHook(() => useBrainState())).toThrow(
      'useBrainState must be used within a BrainProvider'
    );
  });

  it('throws when actions hook is used outside the provider', () => {
    expect(() => renderHook(() => useBrainActions())).toThrow(
      'useBrainActions must be used within a BrainProvider'
    );
  });

  it('provides merged brain state and actions inside the provider', () => {
    const stateValue = {
      activeTab: 'reports',
      metrics: null,
      operationsOverview: null,
      providers: [],
      reports: [],
    } as never;
    const actionsValue = {
      setActiveTab: vi.fn(),
      refresh: vi.fn(),
    } as never;

    mocks.useBrainRuntime.mockReturnValue({ actionsValue, stateValue });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrainProvider>{children}</BrainProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useBrainActions(),
        brain: useBrain(),
        state: useBrainState(),
      }),
      { wrapper }
    );

    expect(result.current.state).toBe(stateValue);
    expect(result.current.actions).toBe(actionsValue);
    expect(result.current.brain).toMatchObject({
      activeTab: 'reports',
      refresh: actionsValue.refresh,
      setActiveTab: actionsValue.setActiveTab,
    });
  });
});
