'use client';

import React from 'react';
import { Badge, Button } from '@/shared/ui/primitives.public';

export type ProbeSessionsHeaderProps = {
  resolvedClustersCount: number;
  activeSessionsCount: number;
  showArchived: boolean;
  archivedSessionsCount: number;
  storedSessionCount: number;
  onShowArchivedChange: (next: boolean) => void;
};

export function ProbeSessionsHeader(props: ProbeSessionsHeaderProps): React.JSX.Element {
  const {
    resolvedClustersCount,
    activeSessionsCount,
    showArchived,
    archivedSessionsCount,
    storedSessionCount,
    onShowArchivedChange,
  } = props;

  return (
    <div className='space-y-1'>
      <div className='flex items-center justify-between gap-3'>
        <h2 className='text-sm font-semibold'>Probe Sessions</h2>
        <div className='flex items-center gap-2'>
          <Badge variant='outline'>{resolvedClustersCount} templates</Badge>
          <Badge variant='outline'>{activeSessionsCount} active</Badge>
          {showArchived && <Badge variant='outline'>{archivedSessionsCount} archived</Badge>}
          <Badge variant='outline'>{storedSessionCount} stored</Badge>
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={() => onShowArchivedChange(!showArchived)}
          >
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </Button>
        </div>
      </div>
      <p className='text-sm text-muted-foreground'>
        Review persisted live-scripter DOM probe sessions and promote selected suggestions into the
        selector registry. Archived sessions stay read-only and only appear when explicitly
        requested.
      </p>
    </div>
  );
}
