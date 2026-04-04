// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ImportExportProvider,
  useImportExportActions,
  useImportExportData,
  useImportExportState,
} from './ImportExportContext';

import type {
  ImportExportActionsContextType,
  ImportExportDataContextType,
  ImportExportStateContextType,
} from './ImportExportContext.types';

const mocks = vi.hoisted(() => ({
  useImportExportRuntime: vi.fn(),
}));

vi.mock('./useImportExportRuntime', () => ({
  useImportExportRuntime: () => mocks.useImportExportRuntime(),
}));

describe('ImportExportContext', () => {
  beforeEach(() => {
    const stateValue = { inventoryId: 'inventory-1' } as unknown as ImportExportStateContextType;
    const dataValue = {
      checkingIntegration: false,
      integrationsWithConnections: [],
    } as unknown as ImportExportDataContextType;
    const actionsValue = {
      handleImport: vi.fn(),
    } as unknown as ImportExportActionsContextType;

    mocks.useImportExportRuntime.mockReset();
    mocks.useImportExportRuntime.mockReturnValue({
      actionsValue,
      dataValue,
      stateValue,
    });
  });

  it('throws clear errors outside the provider', () => {
    expect(() => renderHook(() => useImportExportState())).toThrow(
      'useImportExportState must be used within an ImportExportProvider'
    );
    expect(() => renderHook(() => useImportExportData())).toThrow(
      'useImportExportData must be used within an ImportExportProvider'
    );
    expect(() => renderHook(() => useImportExportActions())).toThrow(
      'useImportExportActions must be used within an ImportExportProvider'
    );
  });

  it('provides runtime state, data, and actions inside the provider', () => {
    const { actionsValue, dataValue, stateValue } = mocks.useImportExportRuntime.mock.results[0]
      ?.value ?? mocks.useImportExportRuntime();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ImportExportProvider>{children}</ImportExportProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useImportExportActions(),
        data: useImportExportData(),
        state: useImportExportState(),
      }),
      { wrapper }
    );

    expect(result.current.state).toBe(stateValue);
    expect(result.current.data).toBe(dataValue);
    expect(result.current.actions).toBe(actionsValue);
  });
});
