'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';

import type {
  DatabaseType,
  DatabasePreviewMode,
  DatabaseUiConfig,
  DatabaseData,
  DatabasePagination,
} from '@/shared/contracts/database';
import { internalError } from '@/shared/errors/app-error';

import { useDatabasePreview } from '../hooks/useDatabaseQueries';

// --- Granular Contexts ---

const ConfigContext = createContext<DatabaseUiConfig | null>(null);
export const useDatabaseConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) throw internalError('useDatabaseConfig must be used within a DatabaseProvider');
  return context;
};

const DataContext = createContext<DatabaseData | null>(null);
export const useDatabaseData = () => {
  const context = useContext(DataContext);
  if (!context) throw internalError('useDatabaseData must be used within a DatabaseProvider');
  return context;
};

const PaginationContext = createContext<DatabasePagination | null>(null);
export const useDatabasePagination = () => {
  const context = useContext(PaginationContext);
  if (!context) throw internalError('useDatabasePagination must be used within a DatabaseProvider');
  return context;
};

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

  const tableDetails = useMemo(() => data?.tableDetails ?? [], [data]);
  const groups = useMemo(() => data?.groups ?? [], [data]);
  const tables = useMemo(() => data?.tables ?? [], [data]);
  const tableRows = useMemo(() => data?.tableRows ?? [], [data]);
  const enums = useMemo(() => data?.enums ?? [], [data]);
  const databaseSize = data?.databaseSize ?? '';

  const configValue = useMemo<DatabaseUiConfig>(
    () => ({
      dbType,
      setDbType,
      mode,
      backupName,
    }),
    [dbType, mode, backupName]
  );

  const dataValue = useMemo<DatabaseData>(
    () => ({
      tableDetails,
      isLoading,
      error: error?.message ?? null,
      refresh: () => {
        void refetch();
      },
      groups,
      tables,
      tableRows,
      enums,
      databaseSize,
    }),
    [tableDetails, isLoading, error, refetch, groups, tables, tableRows, enums, databaseSize]
  );

  const paginationValue = useMemo<DatabasePagination>(
    () => ({
      page,
      setPage,
      pageSize,
      setPageSize,
    }),
    [page, pageSize]
  );

  return (
    <ConfigContext.Provider value={configValue}>
      <DataContext.Provider value={dataValue}>
        <PaginationContext.Provider value={paginationValue}>{children}</PaginationContext.Provider>
      </DataContext.Provider>
    </ConfigContext.Provider>
  );
}
