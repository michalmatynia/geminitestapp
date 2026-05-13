'use client';

import type { JSX } from 'react';
import { useState } from 'react';

import type { DatabaseTableDetail } from '@/shared/contracts/database';
import { Card } from '@/shared/ui/primitives.public';

import {
  DatabaseTreeFilters,
  DatabaseTreeHeader,
  DatabaseTreeRootItem,
  DatabaseTreeStats,
  DatabaseTreeTableItem,
} from './DatabaseTreePanel.primitives';
import { useDatabaseTreeState } from './useDatabaseTreeState';

export interface DatabaseTreePanelProps {
  databaseLabel: string;
  databaseSize: string;
  isFetching: boolean;
  onSelectTable: (tableName: string) => void;
  selectedTable: string;
  tableDetails: DatabaseTableDetail[];
}

export function DatabaseTreePanel({
  databaseLabel,
  databaseSize,
  isFetching,
  onSelectTable,
  selectedTable,
  tableDetails,
}: DatabaseTreePanelProps): JSX.Element {
  const [treeFilter, setTreeFilter] = useState('');
  const {
    expandedTables, normalizedFilter, filteredTableDetails, totalRows, databaseSizeLabel,
    toggleTable, expandVisibleTables, collapseVisibleTables,
  } = useDatabaseTreeState({ selectedTable, tableDetails, treeFilter, databaseSize });

  return (
    <Card
      variant='subtle-compact'
      padding='sm'
      className='flex min-h-[420px] flex-col border-border/60 bg-card/40'
    >
      <DatabaseTreeHeader databaseLabel={databaseLabel} isFetching={isFetching} />
      <DatabaseTreeStats
        collectionCount={tableDetails.length}
        databaseSizeLabel={databaseSizeLabel}
        filteredCount={filteredTableDetails.length}
        isFiltered={normalizedFilter !== ''}
      />
      <DatabaseTreeFilters
        filter={treeFilter}
        onFilterChange={setTreeFilter}
        onExpand={expandVisibleTables}
        onCollapse={collapseVisibleTables}
      />
      <div role='tree' aria-label='Database tree' className='mt-3 min-h-0 flex-1 overflow-auto'>
        <DatabaseTreeRootItem databaseLabel={databaseLabel} totalRows={totalRows} />
        <div role='group' className='mt-1 space-y-1 border-l border-white/10 pl-3'>
          {filteredTableDetails.length === 0 ? (
            <p className='px-2 py-3 text-xs text-gray-400'>
              {tableDetails.length === 0 ? 'No collections found.' : 'No matching collections.'}
            </p>
          ) : (
            filteredTableDetails.map((table) => (
              <DatabaseTreeTableItem
                key={table.name}
                table={table}
                isSelected={table.name === selectedTable}
                isExpanded={expandedTables.has(table.name) || normalizedFilter !== ''}
                onToggle={toggleTable}
                onSelect={onSelectTable}
              />
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
