'use client';

import { PlayIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { DatabaseType, SqlQueryResult } from '@/shared/contracts/database';
import { Button, Textarea, SelectSimple, StandardDataTablePanel, Alert, Card } from '@/shared/ui';

import { useDatabase } from '../context/DatabaseContext';
import { useSqlQueryMutation } from '../hooks/useDatabaseQueries';
import { SqlHistoryDropdown } from './sql/SqlHistoryDropdown';

import type { ColumnDef } from '@tanstack/react-table';

const HISTORY_KEY = 'db-sql-query-history';
const MAX_HISTORY = 20;

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch (error) {
    logClientError(error, { context: { source: 'SqlQueryConsole', action: 'loadHistory' } });
    return [];
  }
}

function saveHistory(history: string[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch (error) {
    logClientError(error, { context: { source: 'SqlQueryConsole', action: 'saveHistory' } });
  }
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '∅';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function SqlQueryConsole({
  defaultDbType,
  initialSql = '',
}: {
  defaultDbType?: DatabaseType;
  initialSql?: string;
}): React.JSX.Element {
  const context = useDatabase();
  const dbType = defaultDbType ?? context.dbType;
  const setDbType = context.setDbType;

  const [sql, setSql] = useState(initialSql);
  const [result, setResult] = useState<SqlQueryResult | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryMutation = useSqlQueryMutation();

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Allow parent to push SQL into the console
  useEffect(() => {
    if (initialSql) setSql(initialSql);
  }, [initialSql]);

  const executeQuery = useCallback(() => {
    const trimmed = sql.trim();
    if (!trimmed) return;

    // Add to history
    const newHistory = [trimmed, ...history.filter((h: string) => h !== trimmed)].slice(
      0,
      MAX_HISTORY
    );
    setHistory(newHistory);
    saveHistory(newHistory);

    queryMutation.mutate(
      { sql: trimmed, type: dbType },
      {
        onSuccess: (data: SqlQueryResult) => setResult(data),
      }
    );
  }, [sql, dbType, history, queryMutation]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        executeQuery();
      }
    },
    [executeQuery]
  );

  const clearHistory = (): void => {
    setHistory([]);
    saveHistory([]);
  };

  return (
    <div className='space-y-4'>
      {/* Editor */}
      <div>
        <div className='flex items-center justify-between mb-2'>
          <div className='flex items-center gap-2'>
            <SelectSimple
              size='sm'
              value={dbType}
              onValueChange={(v: string): void => setDbType(v as DatabaseType)}
              options={[
                { value: 'postgresql', label: 'PostgreSQL' },
                { value: 'mongodb', label: 'MongoDB' },
              ]}
              triggerClassName='h-8 w-[120px] text-xs'
            />
            <span className='text-[11px] text-gray-500'>
              {dbType === 'postgresql'
                ? 'Enter SQL query'
                : 'Use the CRUD panel for MongoDB operations'}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <SqlHistoryDropdown
              history={history}
              showHistory={showHistory}
              setShowHistory={setShowHistory}
              onSelectQuery={setSql}
              onClearHistory={clearHistory}
            />
            <Button
              onClick={executeQuery}
              disabled={queryMutation.isPending || !sql.trim()}
              size='sm'
              className='h-8 gap-1 text-xs'
            >
              <PlayIcon className='size-3' />
              {queryMutation.isPending ? 'Running...' : 'Execute'}
            </Button>
          </div>
        </div>

        <Textarea
          ref={textareaRef}
          value={sql}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            dbType === 'postgresql'
              ? 'SELECT * FROM "User" LIMIT 20;\n\n-- Press Ctrl+Enter to execute'
              : 'Use the CRUD panel below for MongoDB operations'
          }
          className='w-full min-h-[140px] bg-card/60 p-3 font-mono text-xs text-gray-200 placeholder:text-gray-600 focus:border-emerald-500/50'
          spellCheck={false}
        />
        <p className='mt-1 text-[11px] text-gray-600'>
          Ctrl+Enter to execute. 30s timeout. Production execution disabled.
        </p>
      </div>

      {/* Results */}
      {result && (
        <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
          {/* Info bar */}
          <div className='flex flex-wrap items-center gap-3 mb-3'>
            <span className='text-xs text-gray-400'>
              {result.rowCount} row{result.rowCount !== 1 ? 's' : ''} affected
            </span>
            <span className='text-xs text-gray-500'>{result.executionTimeMs}ms</span>
          </div>
          {/* Error */}
          {result.error && (
            <Alert variant='error' className='mb-3 py-2 text-xs'>
              {result.error}
            </Alert>
          )}
          {/* Results table */}
          {!result.error && result.rows.length > 0 && (
            <StandardDataTablePanel
              columns={
                [
                  {
                    id: 'index',
                    header: '#',
                    cell: ({ row }: { row: { index: number } }) => (
                      <span className='text-gray-600 text-[10px]'>{row.index + 1}</span>
                    ),
                    size: 40,
                  },
                  ...(result.fields.length > 0
                    ? result.fields.map((f: { name: string }) => ({
                        accessorKey: f.name,
                        header: f.name,
                        cell: ({ row }: { row: { original: Record<string, unknown> } }) => (
                          <span
                            className='font-mono text-[11px] text-gray-300 truncate block max-w-[250px]'
                            title={formatCellValue(row.original[f.name])}
                          >
                            {formatCellValue(row.original[f.name])}
                          </span>
                        ),
                      }))
                    : Object.keys(result.rows[0] ?? {}).map((key) => ({
                        accessorKey: key,
                        header: key,
                        cell: ({ row }: { row: { original: Record<string, unknown> } }) => (
                          <span
                            className='font-mono text-[11px] text-gray-300 truncate block max-w-[250px]'
                            title={formatCellValue(row.original[key])}
                          >
                            {formatCellValue(row.original[key])}
                          </span>
                        ),
                      }))),
                ] as ColumnDef<Record<string, unknown>>[]
              }
              data={result.rows}
              variant='flat'
            />
          )}
          {/* No rows message for non-error results with 0 rowCount */}
          {!result.error && result.rows.length === 0 && result.rowCount === 0 && (
            <p className='text-xs text-gray-500'>Query returned no results.</p>
          )}
          {/* Success message for mutations (where rowCount > 0 but no rows returned) */}
          {!result.error && result.rows.length === 0 && result.rowCount > 0 && (
            <p className='text-xs text-emerald-400'>
              Command completed successfully. {result.rowCount} row
              {result.rowCount !== 1 ? 's' : ''} affected.
            </p>
          )}{' '}
        </Card>
      )}
    </div>
  );
}
