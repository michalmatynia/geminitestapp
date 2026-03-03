'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';

import type {
  DatabaseType,
  DatabasePreviewMode,
  DatabaseConfig,
  DatabaseData,
  DatabasePagination,
} from '@/shared/contracts/database';
import { internalError } from '@/shared/errors/app-error';

import { useDatabasePreview } from '../hooks/useDatabaseQueries';

// --- Granular Contexts ---

const ConfigContext = createContext<DatabaseConfig | null>(null);
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

// --- Legacy Aggregator ---

interface DatabaseContextType extends DatabaseConfig, DatabaseData, DatabasePagination {}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export function DatabaseProvider({
  children,
  defaultDbType = 'postgresql',
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

  const configValue = useMemo<DatabaseConfig>(
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

  const aggregatedValue = useMemo<DatabaseContextType>(
    () => ({
      ...configValue,
      ...dataValue,
      ...paginationValue,
    }),
    [configValue, dataValue, paginationValue]
  );

  return (
    <ConfigContext.Provider value={configValue}>
      <DataContext.Provider value={dataValue}>
        <PaginationContext.Provider value={paginationValue}>
          <DatabaseContext.Provider value={aggregatedValue}>{children}</DatabaseContext.Provider>
        </PaginationContext.Provider>
      </DataContext.Provider>
    </ConfigContext.Provider>
  );
}

export function useDatabase(): DatabaseContextType {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw internalError('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}
