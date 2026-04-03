// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  CrudPanelProvider,
  useCrudPanelActionsContext,
  useCrudPanelStateContext,
} from './CrudPanelContext';

describe('CrudPanelContext', () => {
  it('throws when strict hooks are used outside the provider', () => {
    expect(() => renderHook(() => useCrudPanelStateContext())).toThrow(
      'useCrudPanelStateContext must be used within a CrudPanelProvider'
    );
    expect(() => renderHook(() => useCrudPanelActionsContext())).toThrow(
      'useCrudPanelActionsContext must be used within a CrudPanelProvider'
    );
  });

  it('provides split state and actions inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CrudPanelProvider
        actionsValue={{
          onAddRow: vi.fn(),
          onRefresh: vi.fn(),
          setMutationError: vi.fn(),
          setPage: vi.fn(),
          setSelectedTable: vi.fn(),
          setSuccessMessage: vi.fn(),
        }}
        stateValue={{
          isFetching: false,
          selectedTable: 'users',
          tableDetails: [],
        }}
      >
        {children}
      </CrudPanelProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useCrudPanelActionsContext(),
        state: useCrudPanelStateContext(),
      }),
      { wrapper }
    );

    expect(result.current.state).toMatchObject({
      isFetching: false,
      selectedTable: 'users',
      tableDetails: [],
    });
    expect(result.current.actions.setSelectedTable).toBeTypeOf('function');
    expect(result.current.actions.onRefresh).toBeTypeOf('function');
    expect(result.current.actions.onAddRow).toBeTypeOf('function');
  });
});
