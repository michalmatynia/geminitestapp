'use client';

import React from 'react';

export function JobTimingCell({ 
  createdAt, 
  finishedAt 
}: { 
  createdAt: string | Date | null | undefined; 
  finishedAt?: string | Date | null | undefined;
}): React.JSX.Element {
  const formatTime = (value: string | Date | null | undefined): string => {
    if (!value) return '—';
    const date = new Date(value);
    return date.toLocaleTimeString();
  };

  return (
    <div className='text-xs'>
      <div>Created: {formatTime(createdAt)}</div>
      {finishedAt && (
        <div className='text-gray-500'>Finished: {formatTime(finishedAt)}</div>
      )}
    </div>
  );
}
