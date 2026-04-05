// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  DatabaseConstructorContextProvider,
  useDatabaseConstructorActionsContext,
  useDatabaseConstructorStateContext,
  type DatabaseConstructorContextValue,
} from './DatabaseConstructorContext';

const createValue = (): DatabaseConstructorContextValue =>
  ({
    pendingAiQuery: '',
    setPendingAiQuery: vi.fn(),
    aiQueries: [],
    setAiQueries: vi.fn(),
    selectedAiQueryId: '',
    setSelectedAiQueryId: vi.fn(),
    presetOptions: [],
    applyDatabasePreset: vi.fn(),
    openSaveQueryPresetModal: vi.fn(),
    databaseConfig: {} as never,
    queryConfig: {} as never,
    resolvedProvider: 'mongodb',
    operation: 'query',
    queryTemplateValue: '{}',
    sampleState: {} as never,
    updateQueryConfig: vi.fn(),
    connectedPlaceholders: [],
    hasSchemaConnection: false,
    fetchedDbSchema: null,
    schemaMatrix: null,
    schemaLoading: false,
    mapInputsToTargets: vi.fn(),
    bundleKeys: new Set<string>(),
    mappings: [],
    updateMapping: vi.fn(),
    removeMapping: vi.fn(),
    addMapping: vi.fn(),
    availablePorts: [],
    uniqueTargetPathOptions: [],
    codeSnippets: [],
    selectedSnippetIndex: 0,
    setSelectedSnippetIndex: vi.fn(),
    insertTemplateSnippet: vi.fn(),
    applyQueryTemplateUpdate: vi.fn(),
    insertQueryPlaceholder: vi.fn(),
    insertAiPromptPlaceholder: vi.fn(),
  }) as DatabaseConstructorContextValue;

describe('DatabaseConstructorContext', () => {
  it('throws outside the provider for both strict hooks', () => {
    expect(() => renderHook(() => useDatabaseConstructorStateContext())).toThrow(
      'useDatabaseConstructorStateContext must be used within DatabaseConstructorContextProvider'
    );
    expect(() => renderHook(() => useDatabaseConstructorActionsContext())).toThrow(
      'useDatabaseConstructorActionsContext must be used within DatabaseConstructorContextProvider'
    );
  });

  it('splits state and actions from the provided value', () => {
    const value = createValue();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DatabaseConstructorContextProvider value={value}>{children}</DatabaseConstructorContextProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useDatabaseConstructorActionsContext(),
        state: useDatabaseConstructorStateContext(),
      }),
      { wrapper }
    );

    expect(result.current.state.pendingAiQuery).toBe('');
    expect(result.current.actions.setPendingAiQuery).toBe(value.setPendingAiQuery);
    expect(result.current.actions.applyDatabasePreset).toBe(value.applyDatabasePreset);
  });
});
