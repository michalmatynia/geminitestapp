'use client';

import {
  ChevronDownIcon,
  ClockIcon,
  PlayIcon,
  Trash2Icon,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { logClientError } from '@/features/observability';
import { Badge, Button, SectionPanel } from '@/shared/ui';

import { useDatabase } from '../context/DatabaseContext';
import { useSqlQueryMutation } from '../hooks/useDatabaseQueries';

import type { DatabaseType, SqlQueryResult } from '../types';

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
    const newHistory = [trimmed, ...history.filter((h: string) => h !== trimmed)].slice(0, MAX_HISTORY);
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
            <select
              value={dbType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
                setDbType(e.target.value as DatabaseType)
              }
              className='h-8 rounded-md border border-border bg-card px-2 text-xs text-gray-200'
            >
              <option value='postgresql'>PostgreSQL</option>
              <option value='mongodb'>MongoDB</option>
            </select>
            <span className='text-[11px] text-gray-500'>
              {dbType === 'postgresql' ? 'Enter SQL query' : 'Use the CRUD panel for MongoDB operations'}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            {/* History dropdown */}
            <div className='relative'>
              <Button
                variant='outline'
                size='sm'
                onClick={(): void => setShowHistory(!showHistory)}
                className='h-8 gap-1 text-xs'
                disabled={history.length === 0}
              >
                <ClockIcon className='size-3' />
                History ({history.length})
                <ChevronDownIcon className='size-3' />
              </Button>
              {showHistory && history.length > 0 && (
                <div className='absolute right-0 top-full z-50 mt-1 w-96 max-h-64 overflow-auto rounded-md border border-border bg-card shadow-lg'>
                  <div className='flex items-center justify-between border-b border-border px-3 py-2'>
                    <span className='text-[11px] text-gray-500'>Recent queries</span>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={clearHistory}
                      className='h-6 gap-1 text-[10px] text-red-400'
                    >
                      <Trash2Icon className='size-3' />
                      Clear
                    </Button>
                  </div>
                  {history.map((item: string, i: number) => (
                    <button
                      key={i}
                      type='button'
                      onClick={(): void => {
                        setSql(item);
                        setShowHistory(false);
                      }}
                      className='w-full truncate border-b border-border px-3 py-2 text-left text-xs font-mono text-gray-300 hover:bg-muted/50 last:border-b-0'
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
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

        <textarea
          ref={textareaRef}
          value={sql}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            dbType === 'postgresql'
              ? 'SELECT * FROM "User" LIMIT 20;\n\n-- Press Ctrl+Enter to execute'
              : 'Use the CRUD panel below for MongoDB operations'
          }
          className='w-full min-h-[140px] rounded-md border border-border bg-card/60 p-3 font-mono text-xs text-gray-200 placeholder:text-gray-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 resize-y'
          spellCheck={false}
        />
        <p className='mt-1 text-[11px] text-gray-600'>
          Ctrl+Enter to execute. 30s timeout. Production execution disabled.
        </p>
      </div>

      {/* Results */}
      {result && (
        <SectionPanel className='p-4'>
          {/* Info bar */}
          <div className='flex flex-wrap items-center gap-3 mb-3'>
            {result.command && (
              <Badge variant='outline' className='text-[10px]'>
                {result.command}
              </Badge>
            )}
            <span className='text-xs text-gray-400'>
              {result.rowCount} row{result.rowCount !== 1 ? 's' : ''} affected
            </span>
            <span className='text-xs text-gray-500'>
              {result.duration}ms
            </span>
          </div>

          {/* Error */}
          {result.error && (
            <div className='rounded-md border border-red-500/30 bg-red-900/20 px-3 py-2 text-xs text-red-300 mb-3'>
              {result.error}
            </div>
          )}

          {/* Results table */}
          {!result.error && result.rows.length > 0 && (
            <div className='overflow-auto max-h-[50vh] rounded-md border border-border'>
              <table className='w-full text-xs'>
                <thead className='sticky top-0 bg-card'>
                  <tr className='border-b border-border text-left text-gray-500'>
                    <th className='px-3 py-2 font-medium text-gray-600'>#</th>
                    {result.fields.length > 0
                      ? result.fields.map((f: { name: string }) => (
                        <th key={f.name} className='whitespace-nowrap px-3 py-2 font-medium font-mono'>
                          {f.name}
                        </th>
                      ))
                      : Object.keys(result.rows[0] ?? {}).map((key: string) => (
                        <th key={key} className='whitespace-nowrap px-3 py-2 font-medium font-mono'>
                          {key}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  {result.rows.map((row: Record<string, unknown>, i: number) => {
                    const keys =
                      result.fields.length > 0
                        ? result.fields.map((f: { name: string }) => f.name)
                        : Object.keys(row);
                    return (
                      <tr key={i} className='text-gray-300 hover:bg-muted/30'>
                        <td className='px-3 py-1.5 text-gray-600'>{i + 1}</td>
                        {keys.map((key: string) => (
                          <td
                            key={key}
                            className='max-w-[250px] truncate whitespace-nowrap px-3 py-1.5 font-mono'
                            title={formatCellValue(row[key])}
                          >
                            {formatCellValue(row[key])}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* No rows message for non-error SELECT */}
          {!result.error && result.rows.length === 0 && result.command === 'SELECT' && (
            <p className='text-xs text-gray-500'>Query returned no rows.</p>
          )}

          {/* Success message for mutations */}
          {!result.error && result.rows.length === 0 && result.command && result.command !== 'SELECT' && (
            <p className='text-xs text-emerald-400'>
              {result.command} completed successfully. {result.rowCount} row{result.rowCount !== 1 ? 's' : ''} affected.
            </p>
          )}
        </SectionPanel>
      )}
    </div>
  );
}
