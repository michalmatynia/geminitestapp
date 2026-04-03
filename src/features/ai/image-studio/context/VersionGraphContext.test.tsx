// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  VersionGraphProvider,
  useVersionGraphActions,
  useVersionGraphState,
} from './VersionGraphContext';

const mocks = vi.hoisted(() => ({
  useVersionGraphRuntime: vi.fn(),
}));

vi.mock('./useVersionGraphRuntime', () => ({
  useVersionGraphRuntime: (...args: unknown[]) => mocks.useVersionGraphRuntime(...args),
}));

describe('VersionGraphContext', () => {
  it('throws outside the provider for both strict hooks', () => {
    expect(() => renderHook(() => useVersionGraphState())).toThrow(
      'useVersionGraphState must be used within a VersionGraphProvider'
    );
    expect(() => renderHook(() => useVersionGraphActions())).toThrow(
      'useVersionGraphActions must be used within a VersionGraphProvider'
    );
  });

  it('provides runtime state and actions from useVersionGraphRuntime', () => {
    const state = { nodes: [], edges: [] } as never;
    const actions = { selectNode: vi.fn(), openNodeDetails: vi.fn() } as never;

    mocks.useVersionGraphRuntime.mockReturnValue({ state, actions });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <VersionGraphProvider>{children}</VersionGraphProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useVersionGraphActions(),
        state: useVersionGraphState(),
      }),
      { wrapper }
    );

    expect(result.current.state).toBe(state);
    expect(result.current.actions).toBe(actions);
  });
});
