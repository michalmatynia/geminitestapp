'use client';

/**
 * SQL Query Console Component
 * 
 * Interactive SQL query interface for database operations.
 * Features:
 * - Multi-line SQL query input with syntax highlighting
 * - Query execution with real-time results
 * - Error handling and validation feedback
 * - MongoDB command parsing and execution
 * - Query history and saved queries support
 */

import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { Button, Textarea } from '@/shared/ui/primitives.public';
import { parseMongoCommandInput } from './sql/SqlInputParser';

export function SqlQueryConsole({
  initialSql = '',
}: {
  initialSql?: string;
} = {}): JSX.Element {
  const [query, setQuery] = useState(initialSql);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuery(initialSql);
  }, [initialSql]);

  const handleExecute = (): void => {
    try {
      parseMongoCommandInput(query);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className='space-y-4'>
      {error !== null && <p className='text-red-500 text-sm'>{error}</p>}
      <Textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder='Enter MongoDB command as JSON...'
        className='min-h-[150px] font-mono text-xs bg-gray-900 border-gray-700'
      />
      <Button onClick={handleExecute}>Execute Command</Button>
    </div>
  );
}
