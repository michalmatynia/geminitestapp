'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';

import { internalError } from '@/shared/errors/app-error';

import { useDatabasePreview } from '../hooks/useDatabaseQueries';

import type {
  DatabaseTableDetail,
  DatabaseType,
  DatabasePreviewMode,
  DatabasePreviewGroup,
  DatabasePreviewTable,
  DatabasePreviewRow,
  DatabaseEnumInfo,
} from '../types';

interface DatabaseContextType {
  dbType: DatabaseType;
  setDbType: (type: DatabaseType) => void;
  tableDetails: DatabaseTableDetail[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  mode: DatabasePreviewMode;
  backupName?: string | undefined;
  groups: DatabasePreviewGroup[];
  tables: DatabasePreviewTable[];
  tableRows: DatabasePreviewRow[];
  enums: DatabaseEnumInfo[];
  databaseSize: string;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
}

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

  const value = useMemo(
    () => ({
      dbType,
      setDbType,
      tableDetails,
      isLoading,
      error: error?.message ?? null,
      refresh: () => { void refetch(); },
      mode,
      backupName,
      groups,
      tables,
      tableRows,
      enums,
      databaseSize,
      page,
      setPage,
      pageSize,
      setPageSize,
    }),
    [
      dbType,
      tableDetails,
      isLoading,
      error,
      refetch,
      mode,
      backupName,
      groups,
      tables,
      tableRows,
      enums,
      databaseSize,
      page,
      pageSize,
    ]
  );

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabase(): DatabaseContextType {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw internalError('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}
