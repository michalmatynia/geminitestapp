'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DatabaseTableDetail } from '@/shared/contracts/database';
import { getSizeLabel, matchesQuery } from './DatabaseTreePanel.primitives';

interface DatabaseTreeState {
  expandedTables: ReadonlySet<string>;
  normalizedFilter: string;
  filteredTableDetails: DatabaseTableDetail[];
  totalRows: number;
  databaseSizeLabel: string;
  toggleTable: (tableName: string) => void;
  expandVisibleTables: () => void;
  collapseVisibleTables: () => void;
}

export function useDatabaseTreeState({
  selectedTable, tableDetails, treeFilter, databaseSize,
}: {
  selectedTable: string;
  tableDetails: DatabaseTableDetail[];
  treeFilter: string;
  databaseSize: string;
}): DatabaseTreeState {
  const [expandedTables, setExpandedTables] = useState<ReadonlySet<string>>(
    () => new Set(selectedTable !== '' ? [selectedTable] : [])
  );
  const normalizedFilter = treeFilter.trim().toLowerCase();
  const totalRows = tableDetails.reduce((sum, table) => sum + table.rowEstimate, 0);
  const databaseSizeLabel = getSizeLabel(databaseSize);
  const filteredTableDetails = useMemo(() => {
    if (normalizedFilter === '') return tableDetails;
    return tableDetails.filter((table) => {
      if (matchesQuery(table.name, normalizedFilter)) return true;
      if (table.columns.some((column) => matchesQuery(column.name, normalizedFilter))) return true;
      return table.indexes.some((index) => matchesQuery(index.name, normalizedFilter));
    });
  }, [normalizedFilter, tableDetails]);
  useEffect(() => {
    if (selectedTable === '') return;
    setExpandedTables((current) => {
      if (current.has(selectedTable)) return current;
      const next = new Set(current);
      next.add(selectedTable);
      return next;
    });
  }, [selectedTable]);
  const toggleTable = useCallback((tableName: string) => {
    setExpandedTables((current) => {
      const next = new Set(current);
      if (next.has(tableName)) next.delete(tableName); else next.add(tableName);
      return next;
    });
  }, []);
  const expandVisibleTables = useCallback(() => {
    setExpandedTables(new Set(filteredTableDetails.map((table) => table.name)));
  }, [filteredTableDetails]);
  const collapseVisibleTables = useCallback(() => {
    setExpandedTables((current) => {
      const next = new Set(current);
      for (const table of filteredTableDetails) next.delete(table.name);
      return next;
    });
  }, [filteredTableDetails]);
  return {
    expandedTables, normalizedFilter, filteredTableDetails, totalRows, databaseSizeLabel,
    toggleTable, expandVisibleTables, collapseVisibleTables,
  };
}
