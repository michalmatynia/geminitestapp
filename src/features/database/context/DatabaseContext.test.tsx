// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DatabaseProvider,
  useDatabaseConfig,
  useDatabaseData,
  useDatabasePagination,
} from './DatabaseContext';

const mocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  useDatabasePreview: vi.fn(),
}));

vi.mock('../hooks/useDatabaseQueries', () => ({
  useDatabasePreview: (params: unknown) => mocks.useDatabasePreview(params),
}));

describe('DatabaseContext', () => {
  beforeEach(() => {
    mocks.refetch.mockReset();
    mocks.useDatabasePreview.mockReturnValue({
      data: {
        databaseSize: '12 MB',
        enums: ['status'],
        groups: ['system'],
        tableDetails: [],
        tableRows: [{ id: 'row-1' }],
        tables: ['users'],
      },
      error: null,
      isLoading: false,
      refetch: mocks.refetch,
    });
  });

  it('throws when strict hooks are used outside the provider', () => {
    expect(() => renderHook(() => useDatabaseConfig())).toThrow(
      'useDatabaseConfig must be used within a DatabaseProvider'
    );
    expect(() => renderHook(() => useDatabaseData())).toThrow(
      'useDatabaseData must be used within a DatabaseProvider'
    );
    expect(() => renderHook(() => useDatabasePagination())).toThrow(
      'useDatabasePagination must be used within a DatabaseProvider'
    );
  });

  it('provides config, data, and pagination inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DatabaseProvider defaultDbType='postgres' mode='backup' backupName='nightly'>
        {children}
      </DatabaseProvider>
    );

    const { result } = renderHook(
      () => ({
        config: useDatabaseConfig(),
        data: useDatabaseData(),
        pagination: useDatabasePagination(),
      }),
      { wrapper }
    );

    expect(result.current.config).toMatchObject({
      backupName: 'nightly',
      dbType: 'postgres',
      mode: 'backup',
    });
    expect(result.current.data).toMatchObject({
      databaseSize: '12 MB',
      enums: ['status'],
      groups: ['system'],
      isLoading: false,
      tableRows: [{ id: 'row-1' }],
      tables: ['users'],
    });
    expect(result.current.data.refresh).toBeTypeOf('function');
    expect(result.current.pagination).toMatchObject({
      page: 1,
      pageSize: 20,
    });
    expect(result.current.pagination.setPage).toBeTypeOf('function');
    expect(result.current.pagination.setPageSize).toBeTypeOf('function');
  });
});
