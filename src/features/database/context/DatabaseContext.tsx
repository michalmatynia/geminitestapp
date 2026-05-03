'use client';

import React, { useState, useMemo } from 'react';
import type {
  DatabaseType,
  DatabasePreviewMode,
  DatabaseUiConfig,
  DatabaseData,
  DatabasePagination,
} from '@/shared/contracts/database';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { useDatabasePreview } from '../hooks/useDatabaseQueries';

const { Context: ConfigContext, useStrictContext: useDatabaseConfig } =
  createStrictContext<DatabaseUiConfig>({
    hookName: 'useDatabaseConfig',
    providerName: 'a DatabaseProvider',
    displayName: 'DatabaseConfigContext',
    errorFactory: internalError,
  });

const { Context: DataContext, useStrictContext: useDatabaseData } =
  createStrictContext<DatabaseData>({
    hookName: 'useDatabaseData',
    providerName: 'a DatabaseProvider',
    displayName: 'DatabaseDataContext',
    errorFactory: internalError,
  });

const { Context: PaginationContext, useStrictContext: useDatabasePagination } =
  createStrictContext<DatabasePagination>({
    hookName: 'useDatabasePagination',
    providerName: 'a DatabaseProvider',
    displayName: 'DatabasePaginationContext',
    errorFactory: internalError,
  });

export { useDatabaseConfig, useDatabaseData, useDatabasePagination };

function useDatabaseValues(
  props: {
    dbType: DatabaseType;
    mode: DatabasePreviewMode;
    backupName: string | undefined;
    refetch: () => Promise<unknown>;
    data: DatabaseData | undefined | null;
    isLoading: boolean;
    error: Error | null;
  }
): { configValue: DatabaseUiConfig; dataValue: DatabaseData } {
  const { dbType, mode, backupName, refetch, data, isLoading, error } = props;
  const tableDetails = useMemo(() => data?.tableDetails ?? [], [data]);
  const groups = useMemo(() => data?.groups ?? [], [data]);
  const tables = useMemo(() => data?.tables ?? [], [data]);
  const tableRows = useMemo(() => data?.tableRows ?? [], [data]);
  const enums = useMemo(() => data?.enums ?? [], [data]);
  const databaseSize = data?.databaseSize ?? '';

  const configValue = useMemo(() => ({ dbType, setDbType: () => {}, mode, backupName }), [dbType, mode, backupName]);

  const dataValue = useMemo(() => ({
    tableDetails,
    isLoading,
    error: error?.message ?? null,
    refresh: () => {
      refetch().catch(() => {});
    },
    groups,
    tables,
    tableRows,
    enums,
    databaseSize,
  }), [tableDetails, isLoading, error, refetch, groups, tables, tableRows, enums, databaseSize]);

  return { configValue, dataValue };
}

export function DatabaseProvider({
  children,
  defaultDbType = 'mongodb',
  mode = 'current',
  backupName,
}: {
  children: React.ReactNode;
  defaultDbType?: DatabaseType;
  mode?: DatabasePreviewMode;
  backupName?: string | undefined;
}): React.JSX.Element {
  const [dbType, setDbType] = useState<DatabaseType>(defaultDbType);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading, error, refetch } = useDatabasePreview({
    mode,
    type: dbType,
    page,
    pageSize,
    backupName,
    enabled: true,
  });

  const { configValue, dataValue } = useDatabaseValues({
    dbType,
    mode,
    backupName,
    refetch,
    data,
    isLoading,
    error,
  });
  const paginationValue = useMemo(() => ({ page, setPage, pageSize, setPageSize }), [page, pageSize]);

  return (
    <ConfigContext.Provider value={{ ...configValue, setDbType }}>
      <DataContext.Provider value={dataValue}>
        <PaginationContext.Provider value={paginationValue}>{children}</PaginationContext.Provider>
      </DataContext.Provider>
    </ConfigContext.Provider>
  );
}
