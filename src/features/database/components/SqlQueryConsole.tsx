'use client';

import { PlayIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { DatabaseType, SqlQueryResult } from '@/shared/contracts/database';
import { Button, Textarea, StandardDataTablePanel, Alert, Card } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { useDatabaseConfig } from '../context/DatabaseContext';
import { useSqlQueryMutation } from '../hooks/useDatabaseQueries';
import { SqlHistoryDropdown } from './sql/SqlHistoryDropdown';

import type { ColumnDef } from '@tanstack/react-table';

const HISTORY_KEY = 'db-mongo-command-history';
const MAX_HISTORY = 20;
const MONGO_OPERATIONS = new Set([
  'find',
  'insertOne',
  'updateOne',
  'deleteOne',
  'deleteMany',
  'aggregate',
  'countDocuments',
]);

type MongoCommandInput = {
  collection: string;
  operation:
    | 'find'
    | 'insertOne'
    | 'updateOne'
    | 'deleteOne'
    | 'deleteMany'
    | 'aggregate'
    | 'countDocuments';
  filter?: Record<string, unknown>;
  document?: Record<string, unknown>;
  update?: Record<string, unknown>;
  pipeline?: Record<string, unknown>[];
};

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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseMongoCommandInput(raw: string): MongoCommandInput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Command must be valid JSON.');
  }

  const input = asRecord(parsed);
  if (!input) {
    throw new Error('Command must be a JSON object.');
  }

  const collection =
    typeof input['collection'] === 'string' ? input['collection'].trim() : '';
  if (!collection) {
    throw new Error('Command must include a "collection" string.');
  }

  const rawOperation = input['operation'];
  if (typeof rawOperation !== 'string' || !MONGO_OPERATIONS.has(rawOperation)) {
    throw new Error(
      'Command must include a supported "operation": find, insertOne, updateOne, deleteOne, deleteMany, aggregate, or countDocuments.'
    );
  }
  const operation = rawOperation as MongoCommandInput['operation'];

  const rawFilter = input['filter'];
  if (rawFilter !== undefined && !asRecord(rawFilter)) {
    throw new Error('"filter" must be a JSON object.');
  }
  const filter = rawFilter === undefined ? undefined : (asRecord(rawFilter) ?? undefined);

  const rawDocument = input['document'];
  if (rawDocument !== undefined && !asRecord(rawDocument)) {
    throw new Error('"document" must be a JSON object.');
  }
  const document =
    rawDocument === undefined ? undefined : (asRecord(rawDocument) ?? undefined);

  const rawUpdate = input['update'];
  if (rawUpdate !== undefined && !asRecord(rawUpdate)) {
    throw new Error('"update" must be a JSON object.');
  }
  const update = rawUpdate === undefined ? undefined : (asRecord(rawUpdate) ?? undefined);

  let pipeline: Record<string, unknown>[] | undefined;
  if (input['pipeline'] !== undefined) {
    if (!Array.isArray(input['pipeline'])) {
      throw new Error('"pipeline" must be a JSON array.');
    }
    pipeline = input['pipeline'].map((stage, index) => {
      const record = asRecord(stage);
      if (!record) {
        throw new Error(`Pipeline stage ${index + 1} must be a JSON object.`);
      }
      return record;
    });
  }

  return {
    collection,
    operation,
    filter,
    document,
    update,
    pipeline,
  };
}

export function SqlQueryConsole({
  defaultDbType,
  initialSql = '',
}: {
  defaultDbType?: DatabaseType;
  initialSql?: string;
}): React.JSX.Element {
  const { dbType: contextDbType, setDbType } = useDatabaseConfig();
  const dbType = 'mongodb';

  const [command, setCommand] = useState(initialSql);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<SqlQueryResult | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryMutation = useSqlQueryMutation();

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    if (contextDbType !== 'mongodb' || (defaultDbType && defaultDbType !== 'mongodb')) {
      setDbType('mongodb');
    }
  }, [contextDbType, defaultDbType, setDbType]);

  useEffect(() => {
    if (initialSql) setCommand(initialSql);
  }, [initialSql]);

  const executeQuery = useCallback(() => {
    const trimmed = command.trim();
    if (!trimmed) return;

    let parsedCommand: MongoCommandInput;
    try {
      parsedCommand = parseMongoCommandInput(trimmed);
      setParseError(null);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Invalid MongoDB command.');
      return;
    }

    const newHistory = [trimmed, ...history.filter((h: string) => h !== trimmed)].slice(
      0,
      MAX_HISTORY
    );
    setHistory(newHistory);
    saveHistory(newHistory);

    queryMutation.mutate(
      { type: dbType, ...parsedCommand },
      {
        onSuccess: (data: SqlQueryResult) => {
          setParseError(null);
          setResult(data);
        },
        onError: (error: Error) => {
          logClientError(error, {
            context: { source: 'SqlQueryConsole', action: 'executeMongoCommand' },
          });
          setParseError(error.message);
        },
      }
    );
  }, [command, dbType, history, queryMutation]);

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
            <span className='rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200'>
              MongoDB
            </span>
            <span className='text-[11px] text-gray-500'>Enter a JSON command payload</span>
          </div>
          <div className='flex items-center gap-2'>
            <SqlHistoryDropdown
              history={history}
              showHistory={showHistory}
              setShowHistory={setShowHistory}
              onSelectQuery={setCommand}
              onClearHistory={clearHistory}
            />
            <Button
              onClick={executeQuery}
              disabled={queryMutation.isPending || !command.trim()}
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
          value={command}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={'{\n  "collection": "products",\n  "operation": "find",\n  "filter": {}\n}'}
          className='w-full min-h-[140px] bg-card/60 p-3 font-mono text-xs text-gray-200 placeholder:text-gray-600 focus:border-emerald-500/50'
          spellCheck={false}
        />
        <p className='mt-1 text-[11px] text-gray-600'>
          Ctrl+Enter to execute. Supported operations: `find`, `insertOne`, `updateOne`,
          `deleteOne`, `deleteMany`, `countDocuments`, `aggregate`.
        </p>
      </div>

      {parseError && (
        <Alert variant='error' className='py-2 text-xs'>
          {parseError}
        </Alert>
      )}

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
