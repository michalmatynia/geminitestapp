import React from 'react';

import type { KangurPageContentEntry } from '@/features/kangur/shared/contracts/kangur-page-content';
import { Badge, Card } from '@/features/kangur/shared/ui';
import { cn } from '@/features/kangur/shared/utils';

interface KangurPageContentEntryListProps {
  entries: KangurPageContentEntry[];
  selectedEntryId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

export function KangurPageContentEntryList(
  props: KangurPageContentEntryListProps
): React.JSX.Element {
  const { entries, selectedEntryId, onSelect, className } = props;
  return (
    <Card variant='subtle' padding='md' className={className}>
      <div className='flex items-center justify-between gap-2'>
        <div>
          <div className='text-sm font-semibold text-foreground'>Section records</div>
          <p className='mt-1 text-xs text-muted-foreground'>
            Select one canonical section id at a time.
          </p>
        </div>
        <Badge variant='outline'>{entries.length} entries</Badge>
      </div>

      <div className='mt-4 space-y-2'>
        {entries.map((entry) => {
          const isSelected = entry.id === selectedEntryId;
          return (
            <button
              key={entry.id}
              type='button'
              onClick={() => onSelect(entry.id)}
              className={cn(
                'w-full rounded-2xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background',
                isSelected
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-border/60 bg-card/30 hover:bg-card/55'
              )}
              aria-label={
                entry.title?.trim()
                  ? `Section: ${entry.title}`
                  : `Section ${entry.id}`
              }
              title={entry.title?.trim() ? `Section: ${entry.title}` : `Section ${entry.id}`}
            >
              <div className='flex items-start justify-between gap-2'>
                <div className='min-w-0'>
                  <div className='truncate text-sm font-medium text-foreground'>
                    {entry.title}
                  </div>
                  <div className='mt-1 truncate font-mono text-[11px] text-muted-foreground'>
                    {entry.id}
                  </div>
                </div>
                <div className='flex shrink-0 gap-1'>
                  <Badge variant='outline'>{entry.pageKey}</Badge>
                  {!entry.enabled ? <Badge variant='warning'>Disabled</Badge> : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
