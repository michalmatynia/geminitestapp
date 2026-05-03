'use client';

import React, { useState } from 'react';
import type { JSX } from 'react';
import { Button, Textarea } from '@/shared/ui/primitives.public';
import { parseMongoCommandInput } from './sql/SqlInputParser';

export function SqlQueryConsole(): JSX.Element {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

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
