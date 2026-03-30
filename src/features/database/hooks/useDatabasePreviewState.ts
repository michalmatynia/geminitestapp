'use client';

import { useState, useMemo, useCallback, useRef } from 'react';

import {
  useDatabaseConfig,
  useDatabaseData,
  useDatabasePagination,
} from '../context/DatabaseContext';
import {
  buildDatabasePreviewConsoleSql,
  computeDatabasePreviewMaxPage,
  computeDatabasePreviewStats,
  filterDatabasePreviewGroups,
  filterDatabasePreviewTableDetails,
  scheduleDatabasePreviewScroll,
} from './useDatabasePreviewState.helpers';

const useDatabasePreviewFilters = ({
  groups,
  tableDetails,
}: Pick<ReturnType<typeof useDatabaseData>, 'groups' | 'tableDetails'>) => {
  const [groupQuery, setGroupQuery] = useState('');
  const [tableQuery, setTableQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const filteredGroups = useMemo(
    () => filterDatabasePreviewGroups(groups, groupQuery),
    [groupQuery, groups]
  );
  const filteredTableDetails = useMemo(
    () => filterDatabasePreviewTableDetails(tableDetails, tableQuery),
    [tableDetails, tableQuery]
  );
  const toggleGroup = useCallback((type: string) => {
    setExpandedGroups((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  return {
    expandedGroups,
    filteredGroups,
    filteredTableDetails,
    groupQuery,
    setGroupQuery,
    setTableQuery,
    tableQuery,
    toggleGroup,
  };
};

const useDatabasePreviewConsole = () => {
  const [consoleSql, setConsoleSql] = useState('');
  const [showConsole, setShowConsole] = useState(false);
  const consoleSectionRef = useRef<HTMLDivElement>(null);

  const handleQueryTable = useCallback((tableName: string) => {
    setConsoleSql(buildDatabasePreviewConsoleSql(tableName));
    setShowConsole(true);
    scheduleDatabasePreviewScroll(consoleSectionRef);
  }, []);

  return {
    consoleSectionRef,
    consoleSql,
    handleQueryTable,
    setConsoleSql,
    setShowConsole,
    showConsole,
  };
};

const useDatabasePreviewCrud = () => {
  const [crudTable, setCrudTable] = useState('');
  const [showCrud, setShowCrud] = useState(false);
  const crudSectionRef = useRef<HTMLDivElement>(null);

  const handleManageTable = useCallback((tableName: string) => {
    setCrudTable(tableName);
    setShowCrud(true);
    scheduleDatabasePreviewScroll(crudSectionRef);
  }, []);

  return {
    crudSectionRef,
    crudTable,
    handleManageTable,
    setCrudTable,
    setShowCrud,
    showCrud,
  };
};

const useDatabasePreviewDerived = ({
  pageSize,
  tableDetails,
  tableRows,
}: {
  pageSize: number;
  tableDetails: ReturnType<typeof useDatabaseData>['tableDetails'];
  tableRows: ReturnType<typeof useDatabaseData>['tableRows'];
}) => {
  const stats = useMemo(() => computeDatabasePreviewStats(tableDetails), [tableDetails]);
  const maxPage = useMemo(
    () => computeDatabasePreviewMaxPage(tableRows, pageSize),
    [pageSize, tableRows]
  );

  return {
    maxPage,
    stats,
  };
};

export function useDatabasePreviewState() {
  const { dbType, mode, backupName } = useDatabaseConfig();
  const { tableDetails, groups, tables, tableRows, enums, databaseSize, isLoading, error } =
    useDatabaseData();
  const { page, setPage, pageSize, setPageSize } = useDatabasePagination();
  const filters = useDatabasePreviewFilters({ groups, tableDetails });
  const consoleState = useDatabasePreviewConsole();
  const crudState = useDatabasePreviewCrud();
  const derived = useDatabasePreviewDerived({
    pageSize,
    tableDetails,
    tableRows,
  });

  return {
    backupName,
    consoleSectionRef: consoleState.consoleSectionRef,
    consoleSql: consoleState.consoleSql,
    crudSectionRef: crudState.crudSectionRef,
    crudTable: crudState.crudTable,
    dbType,
    databaseSize,
    error,
    enums,
    expandedGroups: filters.expandedGroups,
    filteredGroups: filters.filteredGroups,
    filteredTableDetails: filters.filteredTableDetails,
    groupQuery: filters.groupQuery,
    groups,
    handleManageTable: crudState.handleManageTable,
    handleQueryTable: consoleState.handleQueryTable,
    isLoading,
    maxPage: derived.maxPage,
    mode,
    page,
    pageSize,
    setConsoleSql: consoleState.setConsoleSql,
    setCrudTable: crudState.setCrudTable,
    setGroupQuery: filters.setGroupQuery,
    setPage,
    setPageSize,
    setShowConsole: consoleState.setShowConsole,
    setShowCrud: crudState.setShowCrud,
    setTableQuery: filters.setTableQuery,
    showConsole: consoleState.showConsole,
    showCrud: crudState.showCrud,
    stats: derived.stats,
    tableDetails,
    tableQuery: filters.tableQuery,
    tableRows,
    tables,
    toggleGroup: filters.toggleGroup,
  };
}
