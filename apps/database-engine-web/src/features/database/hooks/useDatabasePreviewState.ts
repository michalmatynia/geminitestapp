'use client';

import { useCallback, useMemo, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';

import { useDatabaseConfig, useDatabaseData, useDatabasePagination } from '../context/DatabaseContext';
import {
  buildDatabasePreviewConsoleSql,
  computeDatabasePreviewMaxPage,
  computeDatabasePreviewStats,
  filterDatabasePreviewGroups,
  filterDatabasePreviewTableDetails,
  scheduleDatabasePreviewScroll,
} from './useDatabasePreviewState.helpers';

type DatabasePreviewFilters = {
  expandedGroups: Record<string, boolean>;
  filteredGroups: ReturnType<typeof filterDatabasePreviewGroups>;
  filteredTableDetails: ReturnType<typeof filterDatabasePreviewTableDetails>;
  groupQuery: string;
  setGroupQuery: Dispatch<SetStateAction<string>>;
  setTableQuery: Dispatch<SetStateAction<string>>;
  tableQuery: string;
  toggleGroup: (type: string) => void;
};

type DatabasePreviewConsoleState = {
  consoleSectionRef: RefObject<HTMLDivElement | null>;
  consoleSql: string;
  handleQueryTable: (tableName: string) => void;
  setConsoleSql: Dispatch<SetStateAction<string>>;
  setShowConsole: Dispatch<SetStateAction<boolean>>;
  showConsole: boolean;
};

type DatabasePreviewCrudState = {
  crudSectionRef: RefObject<HTMLDivElement | null>;
  crudTable: string;
  handleManageTable: (tableName: string) => void;
  setCrudTable: Dispatch<SetStateAction<string>>;
  setShowCrud: Dispatch<SetStateAction<boolean>>;
  showCrud: boolean;
};

type DatabasePreviewDerived = {
  maxPage: ReturnType<typeof computeDatabasePreviewMaxPage>;
  stats: ReturnType<typeof computeDatabasePreviewStats>;
};

type DatabasePreviewState = {
  backupName: ReturnType<typeof useDatabaseConfig>['backupName'];
  consoleSectionRef: RefObject<HTMLDivElement | null>;
  consoleSql: string;
  crudSectionRef: RefObject<HTMLDivElement | null>;
  crudTable: string;
  dbType: ReturnType<typeof useDatabaseConfig>['dbType'];
  databaseSize: ReturnType<typeof useDatabaseData>['databaseSize'];
  error: ReturnType<typeof useDatabaseData>['error'];
  enums: ReturnType<typeof useDatabaseData>['enums'];
  expandedGroups: Record<string, boolean>;
  filteredGroups: ReturnType<typeof filterDatabasePreviewGroups>;
  filteredTableDetails: ReturnType<typeof filterDatabasePreviewTableDetails>;
  groupQuery: string;
  groups: ReturnType<typeof useDatabaseData>['groups'];
  handleManageTable: DatabasePreviewCrudState['handleManageTable'];
  handleQueryTable: DatabasePreviewConsoleState['handleQueryTable'];
  isLoading: ReturnType<typeof useDatabaseData>['isLoading'];
  maxPage: ReturnType<typeof computeDatabasePreviewMaxPage>;
  mode: ReturnType<typeof useDatabaseConfig>['mode'];
  page: ReturnType<typeof useDatabasePagination>['page'];
  pageSize: ReturnType<typeof useDatabasePagination>['pageSize'];
  setConsoleSql: DatabasePreviewConsoleState['setConsoleSql'];
  setCrudTable: DatabasePreviewCrudState['setCrudTable'];
  setGroupQuery: DatabasePreviewFilters['setGroupQuery'];
  setPage: ReturnType<typeof useDatabasePagination>['setPage'];
  setPageSize: ReturnType<typeof useDatabasePagination>['setPageSize'];
  setShowConsole: DatabasePreviewConsoleState['setShowConsole'];
  setShowCrud: DatabasePreviewCrudState['setShowCrud'];
  setTableQuery: DatabasePreviewFilters['setTableQuery'];
  showConsole: boolean;
  showCrud: boolean;
  stats: ReturnType<typeof computeDatabasePreviewStats>;
  tableDetails: ReturnType<typeof useDatabaseData>['tableDetails'];
  tableQuery: string;
  tableRows: ReturnType<typeof useDatabaseData>['tableRows'];
  tables: ReturnType<typeof useDatabaseData>['tables'];
  toggleGroup: DatabasePreviewFilters['toggleGroup'];
};

const useDatabasePreviewFilters = ({
  groups,
  tableDetails,
}: Pick<ReturnType<typeof useDatabaseData>, 'groups' | 'tableDetails'>): DatabasePreviewFilters => {
  const [groupQuery, setGroupQuery] = useState('');
  const [tableQuery, setTableQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const filteredGroups = useMemo(() => filterDatabasePreviewGroups(groups, groupQuery), [
    groupQuery,
    groups,
  ]);
  const filteredTableDetails = useMemo(
    () => filterDatabasePreviewTableDetails(tableDetails, tableQuery),
    [tableDetails, tableQuery]
  );
  const toggleGroup = useCallback((type: string): void => {
    setExpandedGroups((prev) => ({ ...prev, [type]: prev[type] !== true }));
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

const useDatabasePreviewConsole = (): DatabasePreviewConsoleState => {
  const [consoleSql, setConsoleSql] = useState('');
  const [showConsole, setShowConsole] = useState(false);
  const consoleSectionRef = useRef<HTMLDivElement>(null);

  const handleQueryTable = useCallback((tableName: string): void => {
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

const useDatabasePreviewCrud = (): DatabasePreviewCrudState => {
  const [crudTable, setCrudTable] = useState('');
  const [showCrud, setShowCrud] = useState(false);
  const crudSectionRef = useRef<HTMLDivElement>(null);

  const handleManageTable = useCallback((tableName: string): void => {
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
}): DatabasePreviewDerived => {
  const stats = useMemo(() => computeDatabasePreviewStats(tableDetails), [tableDetails]);
  const maxPage = useMemo(() => computeDatabasePreviewMaxPage(tableRows, pageSize), [
    pageSize,
    tableRows,
  ]);

  return {
    maxPage,
    stats,
  };
};

export function useDatabasePreviewState(): DatabasePreviewState {
  const config = useDatabaseConfig();
  const data = useDatabaseData();
  const pagination = useDatabasePagination();
  const filters = useDatabasePreviewFilters({ groups: data.groups, tableDetails: data.tableDetails });
  const consoleState = useDatabasePreviewConsole();
  const crudState = useDatabasePreviewCrud();
  const derived = useDatabasePreviewDerived({
    pageSize: pagination.pageSize,
    tableDetails: data.tableDetails,
    tableRows: data.tableRows,
  });

  const state: DatabasePreviewState = {
    ...filters,
    ...consoleState,
    ...crudState,
    ...derived,
    backupName: config.backupName,
    dbType: config.dbType,
    databaseSize: data.databaseSize,
    error: data.error,
    enums: data.enums,
    groups: data.groups,
    isLoading: data.isLoading,
    mode: config.mode,
    page: pagination.page,
    pageSize: pagination.pageSize,
    setPage: pagination.setPage,
    setPageSize: pagination.setPageSize,
    tableDetails: data.tableDetails,
    tableRows: data.tableRows,
    tables: data.tables,
  };

  return state;
}
