// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  DatabasePresetsTabContextProvider,
  useDatabasePresetsTabActionsContext,
  useDatabasePresetsTabStateContext,
  type DatabasePresetsTabContextValue,
} from './DatabasePresetsTabContext';

const createValue = (): DatabasePresetsTabContextValue => ({
  builtInPresets: [],
  onApplyBuiltInPreset: vi.fn(),
  onRenameQueryPreset: vi.fn(),
  onDeleteQueryPreset: vi.fn(),
});

describe('DatabasePresetsTabContext', () => {
  it('throws outside the provider for both strict hooks', () => {
    expect(() => renderHook(() => useDatabasePresetsTabStateContext())).toThrow(
      'useDatabasePresetsTabStateContext must be used within DatabasePresetsTabContextProvider'
    );
    expect(() => renderHook(() => useDatabasePresetsTabActionsContext())).toThrow(
      'useDatabasePresetsTabActionsContext must be used within DatabasePresetsTabContextProvider'
    );
  });

  it('splits state and actions from the provided value', () => {
    const value = createValue();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DatabasePresetsTabContextProvider value={value}>{children}</DatabasePresetsTabContextProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useDatabasePresetsTabActionsContext(),
        state: useDatabasePresetsTabStateContext(),
      }),
      { wrapper }
    );

    expect(result.current.state.builtInPresets).toEqual([]);
    expect(result.current.actions.onRenameQueryPreset).toBe(value.onRenameQueryPreset);
    expect(result.current.actions.onDeleteQueryPreset).toBe(value.onDeleteQueryPreset);
  });
});
