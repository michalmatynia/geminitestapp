// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  GenerationProvider,
  useGenerationActions,
  useGenerationState,
} from './GenerationContext';

const mocks = vi.hoisted(() => ({
  useGenerationRuntime: vi.fn(),
}));

vi.mock('./useGenerationRuntime', () => ({
  useGenerationRuntime: (...args: unknown[]) => mocks.useGenerationRuntime(...args),
}));

describe('GenerationContext', () => {
  it('throws outside the provider for both strict hooks', () => {
    expect(() => renderHook(() => useGenerationState())).toThrow(
      'useGenerationState must be used within a GenerationProvider'
    );
    expect(() => renderHook(() => useGenerationActions())).toThrow(
      'useGenerationActions must be used within a GenerationProvider'
    );
  });

  it('provides runtime state and actions from useGenerationRuntime', () => {
    const state = { activeGenerationId: null, generations: [] } as never;
    const actions = { runGeneration: vi.fn(), cancelGeneration: vi.fn() } as never;

    mocks.useGenerationRuntime.mockReturnValue({ state, actions });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <GenerationProvider>{children}</GenerationProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useGenerationActions(),
        state: useGenerationState(),
      }),
      { wrapper }
    );

    expect(result.current.state).toBe(state);
    expect(result.current.actions).toBe(actions);
  });
});
