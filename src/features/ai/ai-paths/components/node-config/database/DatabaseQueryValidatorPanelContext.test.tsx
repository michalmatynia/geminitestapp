// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  DatabaseQueryValidatorPanelContextProvider,
  useDatabaseQueryValidatorPanelContext,
} from './DatabaseQueryValidatorPanelContext';

describe('DatabaseQueryValidatorPanelContext', () => {
  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useDatabaseQueryValidatorPanelContext())).toThrow(
      'useDatabaseQueryValidatorPanelContext must be used within DatabaseQueryValidatorPanelContextProvider'
    );
  });

  it('returns the current validator panel value inside the provider', () => {
    const value = {
      databaseConfig: {
        collectionName: 'users',
      },
      operation: 'find_many',
      queryConfig: {
        filterTemplate: '{"role":"student"}',
      },
      queryTemplateValue: '{"role":"student"}',
      queryValidation: {
        normalizedQueryText: '{"role":"student"}',
        status: 'valid',
      },
      resolvedProvider: 'mongodb' as const,
    } as never;

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DatabaseQueryValidatorPanelContextProvider value={value}>
        {children}
      </DatabaseQueryValidatorPanelContextProvider>
    );

    const { result } = renderHook(() => useDatabaseQueryValidatorPanelContext(), { wrapper });

    expect(result.current).toBe(value);
  });
});
