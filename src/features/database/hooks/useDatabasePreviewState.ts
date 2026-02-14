'use client';

import { useState, useMemo, useCallback, useRef } from 'react';

import { useDatabase } from '../context/DatabaseContext';

import type { DatabaseTableDetail, DatabasePreviewRow } from '../types';

export function useDatabasePreviewState() {
  const database = useDatabase();
  const {
    dbType,
    tableDetails,
    groups,
    tables,
    tableRows,
    enums,
    databaseSize,
    isLoading,
    error,
    mode,
    backupName,
    page,
    setPage,
    pageSize,
    setPageSize,
  } = database;

  const [groupQuery, setGroupQuery] = useState('');
  const [tableQuery, setTableQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [consoleSql, setConsoleSql] = useState('');
  const [showConsole, setShowConsole] = useState(false);
  const [crudTable, setCrudTable] = useState('');
  const [showCrud, setShowCrud] = useState(false);
  
  const consoleSectionRef = useRef<HTMLDivElement>(null);
  const crudSectionRef = useRef<HTMLDivElement>(null);

  const scrollToConsole = useCallback(() => {
    setTimeout(() => consoleSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, []);

  const scrollToCrud = useCallback(() => {
    setTimeout(() => crudSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, []);

  const filteredGroups = useMemo(() => {
    const query = groupQuery.trim().toLowerCase();
    if (!query) return groups;
    return groups
      .map((group) => {
        const matchesType = group.type.toLowerCase().includes(query);
        const objects = group.objects.filter((obj) =>
          obj.toLowerCase().includes(query)
        );
        if (!matchesType && objects.length === 0) return null;
        return matchesType ? group : { ...group, objects };
      })
      .filter((g): g is NonNullable<typeof g> => Boolean(g));
  }, [groups, groupQuery]);

  const filteredTableDetails = useMemo(() => {
    const query = tableQuery.trim().toLowerCase();
    if (!query) return tableDetails;
    return tableDetails.filter((t: DatabaseTableDetail) => t.name.toLowerCase().includes(query));
  }, [tableDetails, tableQuery]);

  const toggleGroup = useCallback((type: string) => {
    setExpandedGroups((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const handleQueryTable = useCallback((tableName: string) => {
    setConsoleSql(`SELECT * FROM "${tableName}" LIMIT 20`);
    setShowConsole(true);
    scrollToConsole();
  }, [scrollToConsole]);

  const handleManageTable = useCallback((tableName: string) => {
    setCrudTable(tableName);
    setShowCrud(true);
    scrollToCrud();
  }, [scrollToCrud]);

  const stats = useMemo(() => {
    const totalFks = tableDetails.reduce((sum, t) => sum + t.foreignKeys.length, 0);
    const totalIndexes = tableDetails.reduce((sum, t) => sum + t.indexes.length, 0);
    return { totalFks, totalIndexes };
  }, [tableDetails]);

  const maxPage = useMemo(() => {
    if (tableRows.length === 0) return 1;
    const pages = tableRows.map((table: DatabasePreviewRow) =>
      Math.max(1, Math.ceil(table.totalRows / pageSize))
    );
    return Math.max(1, ...pages);
  }, [pageSize, tableRows]);

  return {
    dbType,
    tableDetails,
    filteredTableDetails,
    groups,
    filteredGroups,
    tables,
    tableRows,
    enums,
    databaseSize,
    isLoading,
    error,
    mode,
    backupName,
    page,
    setPage,
    pageSize,
    setPageSize,
    maxPage,
    groupQuery,
    setGroupQuery,
    tableQuery,
    setTableQuery,
    expandedGroups,
    toggleGroup,
    consoleSql,
    setConsoleSql,
    showConsole,
    setShowConsole,
    crudTable,
    setCrudTable,
    showCrud,
    setShowCrud,
    consoleSectionRef,
    crudSectionRef,
    handleQueryTable,
    handleManageTable,
    stats,
  };
}
