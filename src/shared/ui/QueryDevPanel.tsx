'use client';

import { useEffect, useMemo, useState } from 'react';

import { useQueryDiagnostics } from '@/shared/hooks/query/useQueryDiagnostics';
import { useQueryPerformance } from '@/shared/hooks/useQueryPerformance';

import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Input } from './input';

type QueryDevPanelProps = {
  isOnline: boolean;
  lastSync: Date | null;
  enabled?: boolean;
  open?: boolean;
};

export function QueryDevPanel({
  isOnline,
  lastSync,
  enabled = true,
  open = true,
}: QueryDevPanelProps): React.JSX.Element | null {
  const { metrics, averageTime, cacheHitRate } = useQueryPerformance();
  const [isMounted, setIsMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  useEffect((): void => {
    setIsMounted(true);
  }, []);

  // Avoid subscribing to query-cache updates (and doing work) until we've mounted,
  // and only when the panel is enabled.
  const diagnostics = useQueryDiagnostics({ enabled: enabled && isMounted });

  const filteredQueries = useMemo(() => {
    const term = search.trim().toLowerCase();
    return diagnostics.queries
      .filter((item) => (showInactive ? true : item.observers > 0))
      .filter((item) => (term ? item.keyString.toLowerCase().includes(term) : true))
      .sort((a, b) => b.dataUpdatedAt - a.dataUpdatedAt);
  }, [diagnostics.queries, search, showInactive]);

  if (!isMounted || !enabled) return null;

  if (!open) {
    return (
      <div className='fixed bottom-4 right-4 z-50 w-[240px] max-w-[90vw]'>
        <Card className='bg-black/90 text-white text-xs'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm'>Query Status</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            <div className='flex justify-between'>
              <span>Status:</span>
              <span className={isOnline ? 'text-green-400' : 'text-red-400'}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className='flex justify-between'>
              <span>Last Sync:</span>
              <span>{lastSync ? lastSync.toLocaleTimeString() : 'Never'}</span>
            </div>
            <div className='flex justify-between'>
              <span>Avg Query:</span>
              <span>{averageTime.toFixed(0)}ms</span>
            </div>
            <div className='flex justify-between'>
              <span>Cache Hit:</span>
              <span>{cacheHitRate.toFixed(1)}%</span>
            </div>
            <div className='text-[10px] text-gray-400'>
              Open from avatar menu to view full panel.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='fixed bottom-4 right-4 z-50 w-[560px] max-w-[96vw] max-h-[80vh]'>
      <Card className='bg-black/90 text-white text-xs'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm'>Query Status Panel</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-2 gap-2 text-[11px]'>
            <div className='rounded border border-white/10 p-2'>
              <div className='text-[10px] text-gray-400'>Status</div>
              <div className={isOnline ? 'text-green-400' : 'text-red-400'}>
                {isOnline ? 'Online' : 'Offline'}
              </div>
            </div>
            <div className='rounded border border-white/10 p-2'>
              <div className='text-[10px] text-gray-400'>Last Sync</div>
              <div>{lastSync ? lastSync.toLocaleTimeString() : 'Never'}</div>
            </div>
            <div className='rounded border border-white/10 p-2'>
              <div className='text-[10px] text-gray-400'>Avg Query</div>
              <div>{averageTime.toFixed(0)}ms</div>
            </div>
            <div className='rounded border border-white/10 p-2'>
              <div className='text-[10px] text-gray-400'>Cache Hit</div>
              <div>{cacheHitRate.toFixed(1)}%</div>
            </div>
            <div className='rounded border border-white/10 p-2'>
              <div className='text-[10px] text-gray-400'>Total Queries</div>
              <div>{metrics.length}</div>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <Button
              size='sm'
              variant='outline'
              className='h-7 px-2 text-xs'
              onClick={() => diagnostics.refetchAll()}
            >
              Refetch All
            </Button>
            <Button
              size='sm'
              variant='outline'
              className='h-7 px-2 text-xs'
              onClick={() => diagnostics.invalidateAll()}
            >
              Invalidate All
            </Button>
            <Button
              size='sm'
              variant='outline'
              className='h-7 px-2 text-xs text-red-200 hover:text-red-100'
              onClick={() => {
                if (window.confirm('Clear all query caches?')) {
                  diagnostics.clearAll();
                }
              }}
            >
              Clear Cache
            </Button>
          </div>

          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder='Filter queries…'
                aria-label='Filter queries'
                className='h-7 text-xs flex-1'
               title='Filter queries…'/>
              <Button
                size='sm'
                variant={showInactive ? 'default' : 'outline'}
                className='h-7 px-2 text-xs'
                onClick={() => setShowInactive((prev) => !prev)}
              >
                {showInactive ? 'All' : 'Active'}
              </Button>
            </div>
            <div className='max-h-[46vh] space-y-2 overflow-y-auto rounded border border-white/10 p-2'>
              {filteredQueries.length === 0 ? (
                <div className='text-center text-[11px] text-gray-400'>No queries</div>
              ) : (
                filteredQueries.map((item) => (
                  <div key={item.keyString} className='rounded border border-white/10 p-2'>
                    <div className='flex items-start justify-between gap-2'>
                      <div className='min-w-0'>
                        <div className='truncate text-[11px] text-gray-200'>{item.keyString}</div>
                        <div className='mt-1 flex flex-wrap gap-2 text-[10px] text-gray-400'>
                          <span>Status: {item.status}</span>
                          <span>Fetch: {item.fetchStatus}</span>
                          <span>Obs: {item.observers}</span>
                          {item.dataSize !== null ? <span>Size: {item.dataSize}b</span> : null}
                        </div>
                      </div>
                      <div className='flex flex-col gap-1'>
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-6 px-2 text-[10px]'
                          onClick={() => diagnostics.refetch(item.key)}
                        >
                          Refetch
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-6 px-2 text-[10px]'
                          onClick={() => diagnostics.invalidate(item.key)}
                        >
                          Invalidate
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-6 px-2 text-[10px] text-red-200 hover:text-red-100'
                          onClick={() => diagnostics.remove(item.key)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
