// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RuntimeProvider, useNodeRuntime, useRuntimeActions, useRuntimeState } from '../RuntimeContext';

describe('RuntimeContext hooks', () => {
  it('throws when state hook is used outside the provider', () => {
    expect(() => renderHook(() => useRuntimeState())).toThrow(
      'useRuntimeState must be used within a RuntimeProvider'
    );
  });

  it('throws when actions hook is used outside the provider', () => {
    expect(() => renderHook(() => useRuntimeActions())).toThrow(
      'useRuntimeActions must be used within a RuntimeProvider'
    );
  });

  it('returns per-node runtime slices from the provider state', () => {
    const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
      <RuntimeProvider>{children}</RuntimeProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useRuntimeActions(),
        nodeRuntime: useNodeRuntime('node-a'),
      }),
      { wrapper }
    );

    act(() => {
      result.current.actions.updateNodeInputs('node-a', { input: 'value' });
      result.current.actions.updateNodeOutputs('node-a', { output: 42 });
      result.current.actions.appendHistory('node-a', {
        timestamp: '2026-04-03T00:00:00.000Z',
        message: 'ran',
      } as never);
    });

    expect(result.current.nodeRuntime.inputs).toEqual({ input: 'value' });
    expect(result.current.nodeRuntime.outputs).toEqual({ output: 42 });
    expect(result.current.nodeRuntime.history).toEqual([
      {
        timestamp: '2026-04-03T00:00:00.000Z',
        message: 'ran',
      },
    ]);
  });
});
