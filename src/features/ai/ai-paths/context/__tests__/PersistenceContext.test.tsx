// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  PersistenceProvider,
  usePersistenceActions,
  usePersistenceState,
} from '../PersistenceContext';

describe('PersistenceContext', () => {
  it('throws when state hook is used outside the provider', () => {
    expect(() => renderHook(() => usePersistenceState())).toThrow(
      'usePersistenceState must be used within a PersistenceProvider'
    );
  });

  it('throws when actions hook is used outside the provider', () => {
    expect(() => renderHook(() => usePersistenceActions())).toThrow(
      'usePersistenceActions must be used within a PersistenceProvider'
    );
  });

  it('tracks dirty state and save lifecycle inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
      <PersistenceProvider initialLoading={false}>{children}</PersistenceProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: usePersistenceActions(),
        state: usePersistenceState(),
      }),
      { wrapper }
    );

    expect(result.current.state.loading).toBe(false);
    expect(result.current.state.isDirty).toBe(false);
    expect(result.current.state.autoSaveStatus).toBe('idle');

    act(() => {
      result.current.actions.markDirty();
      result.current.actions.startSaving();
    });

    expect(result.current.state.isDirty).toBe(true);
    expect(result.current.state.saving).toBe(true);
    expect(result.current.state.autoSaveStatus).toBe('saving');

    act(() => {
      result.current.actions.finishSaving(true);
    });

    expect(result.current.state.saving).toBe(false);
    expect(result.current.state.isDirty).toBe(false);
    expect(result.current.state.autoSaveStatus).toBe('saved');
    expect(result.current.state.autoSaveAt).toEqual(expect.any(String));
  });
});
