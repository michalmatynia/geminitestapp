// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  DatabaseQueryInputControlsContextProvider,
  useDatabaseQueryInputControlsActionsContext,
  useDatabaseQueryInputControlsStateContext,
  type DatabaseQueryInputControlsContextValue,
} from './DatabaseQueryInputControlsContext';

const createValue = (): DatabaseQueryInputControlsContextValue =>
  ({
    provider: 'mongodb',
    requestedProvider: 'mongodb',
    actionCategory: 'read',
    action: 'findMany',
    actionCategoryOptions: [],
    actionOptions: [],
    queryTemplateValue: '{}',
    queryPlaceholder: '{}',
    queryValidation: null,
    queryFormatterEnabled: false,
    queryValidatorEnabled: true,
    testQueryLoading: false,
    onActionCategoryChange: vi.fn(),
    onActionChange: vi.fn(),
    onFormatClick: vi.fn(),
    onFormatContextMenu: vi.fn(),
    onToggleValidator: vi.fn(),
    onRunQuery: vi.fn(),
    onQueryChange: vi.fn(),
    onProviderChange: vi.fn(),
  }) as DatabaseQueryInputControlsContextValue;

describe('DatabaseQueryInputControlsContext', () => {
  it('throws outside the provider for both strict hooks', () => {
    expect(() => renderHook(() => useDatabaseQueryInputControlsStateContext())).toThrow(
      'useDatabaseQueryInputControlsStateContext must be used within DatabaseQueryInputControlsContextProvider'
    );
    expect(() => renderHook(() => useDatabaseQueryInputControlsActionsContext())).toThrow(
      'useDatabaseQueryInputControlsActionsContext must be used within DatabaseQueryInputControlsContextProvider'
    );
  });

  it('splits state and actions from the provided value', () => {
    const value = createValue();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DatabaseQueryInputControlsContextProvider value={value}>
        {children}
      </DatabaseQueryInputControlsContextProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useDatabaseQueryInputControlsActionsContext(),
        state: useDatabaseQueryInputControlsStateContext(),
      }),
      { wrapper }
    );

    expect(result.current.state.provider).toBe('mongodb');
    expect(result.current.actions.onRunQuery).toBe(value.onRunQuery);
    expect(result.current.actions.onProviderChange).toBe(value.onProviderChange);
  });
});
