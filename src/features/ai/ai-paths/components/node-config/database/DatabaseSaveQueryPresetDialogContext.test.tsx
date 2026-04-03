// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  DatabaseSaveQueryPresetDialogContextProvider,
  useDatabaseSaveQueryPresetDialogActionsContext,
  useDatabaseSaveQueryPresetDialogStateContext,
} from './DatabaseSaveQueryPresetDialogContext';

describe('DatabaseSaveQueryPresetDialogContext', () => {
  it('throws when state hook is used outside the provider', () => {
    expect(() => renderHook(() => useDatabaseSaveQueryPresetDialogStateContext())).toThrow(
      'useDatabaseSaveQueryPresetDialogStateContext must be used within DatabaseSaveQueryPresetDialogContextProvider'
    );
  });

  it('throws when actions hook is used outside the provider', () => {
    expect(() => renderHook(() => useDatabaseSaveQueryPresetDialogActionsContext())).toThrow(
      'useDatabaseSaveQueryPresetDialogActionsContext must be used within DatabaseSaveQueryPresetDialogContextProvider'
    );
  });

  it('splits state and actions inside the provider', () => {
    const value = {
      newQueryPresetName: 'Students',
      onCancel: vi.fn(),
      onOpenChange: vi.fn(),
      onSave: vi.fn(),
      open: true,
      queryTemplateValue: '{"role":"student"}',
      setNewQueryPresetName: vi.fn(),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DatabaseSaveQueryPresetDialogContextProvider value={value}>
        {children}
      </DatabaseSaveQueryPresetDialogContextProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useDatabaseSaveQueryPresetDialogActionsContext(),
        state: useDatabaseSaveQueryPresetDialogStateContext(),
      }),
      { wrapper }
    );

    expect(result.current.state).toMatchObject({
      newQueryPresetName: 'Students',
      open: true,
      queryTemplateValue: '{"role":"student"}',
    });
    expect(result.current.actions).toMatchObject({
      onCancel: value.onCancel,
      onOpenChange: value.onOpenChange,
      onSave: value.onSave,
      setNewQueryPresetName: value.setNewQueryPresetName,
    });
  });
});
