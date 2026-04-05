// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PresetsProvider, usePresetsActions, usePresetsState } from '../PresetsContext';

describe('PresetsContext', () => {
  it('throws when state hook is used outside the provider', () => {
    expect(() => renderHook(() => usePresetsState())).toThrow(
      'usePresetsState must be used within a PresetsProvider'
    );
  });

  it('throws when actions hook is used outside the provider', () => {
    expect(() => renderHook(() => usePresetsActions())).toThrow(
      'usePresetsActions must be used within a PresetsProvider'
    );
  });

  it('persists db query presets through the registered persistence handler', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
      <PresetsProvider>{children}</PresetsProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: usePresetsActions(),
        state: usePresetsState(),
      }),
      { wrapper }
    );

    const saveDbQueryPresets = vi.fn(async () => {});

    act(() => {
      result.current.actions.setPresetPersistenceHandlers({ saveDbQueryPresets });
      result.current.actions.setDbQueryPresets([
        result.current.actions.normalizeDbQueryPreset({
          id: 'preset-query-1',
          name: 'Saved query preset',
          queryTemplate: '{ "status": "active" }',
        }),
      ]);
    });

    expect(result.current.state.dbQueryPresets).toHaveLength(1);
    expect(result.current.state.dbQueryPresets[0]?.name).toBe('Saved query preset');

    await act(async () => {
      await result.current.actions.saveDbQueryPresets(result.current.state.dbQueryPresets);
    });

    expect(saveDbQueryPresets).toHaveBeenCalledWith(result.current.state.dbQueryPresets);
  });
});
